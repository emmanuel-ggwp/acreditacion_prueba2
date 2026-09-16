import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { QueryTypes } from 'sequelize';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { sequelize } from '@/lib/sequelize';

// Consola de consultas de SOLO LECTURA para el administrador.
//
// Capas de seguridad (todas deben pasar):
//   1. Rol ADMIN (withAuth).
//   2. Habilitada explícitamente por entorno: DB_CONSOLE_ENABLED === 'true'
//      (apagada por defecto; si no está, responde 403).
//   3. Passphrase secreta: DB_CONSOLE_PASSPHRASE (comparación en tiempo constante).
//   4. Solo UNA sentencia SELECT / WIT...SELECT; se rechaza ';' y palabras de escritura.
//   5. Se ejecuta en una transacción READ ONLY con statement_timeout y tope de filas,
//      y SIEMPRE se hace rollback. La transacción READ ONLY es la garantía real: la BD
//      rechaza cualquier escritura aunque se colara en el texto.

const MAX_ROWS = 1000;
const TIMEOUT_MS = 8000;

// Palabras de escritura/administración que no deben aparecer (defensa en profundidad).
const FORBIDDEN = /\b(insert|update|delete|drop|alter|truncate|create|grant|revoke|copy|merge|vacuum|reindex|cluster|attach|execute|prepare|call|refresh|lock|listen|notify|pg_read_file|pg_read_binary_file|lo_import|lo_export|pg_sleep|pg_terminate_backend|pg_cancel_backend|dblink)\b/i;

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  if (process.env.DB_CONSOLE_ENABLED !== 'true') {
    return NextResponse.json({ error: 'La consola de base de datos está deshabilitada.' }, { status: 403 });
  }
  const expected = process.env.DB_CONSOLE_PASSPHRASE || '';
  if (!expected) {
    return NextResponse.json({ error: 'La consola no tiene passphrase configurada (DB_CONSOLE_PASSPHRASE).' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const passphrase = String(body?.passphrase ?? '');
  // 403 (no 401): un 401 haría que el cliente intente refrescar la sesión y el error
  // aparecería como "sesión expirada" en vez de "passphrase incorrecta".
  if (!safeEqual(passphrase, expected)) {
    return NextResponse.json({ error: 'Passphrase incorrecta.' }, { status: 403 });
  }

  // Normaliza: quita espacios y ';' final.
  const sql = String(body?.sql ?? '').trim().replace(/;+\s*$/, '');
  if (!sql) {
    return NextResponse.json({ error: 'Escribe una consulta.' }, { status: 400 });
  }
  if (sql.includes(';')) {
    return NextResponse.json({ error: 'Solo se permite UNA sentencia (sin ";").' }, { status: 400 });
  }
  if (!/^\s*(select|with)\b/i.test(sql)) {
    return NextResponse.json({ error: 'Solo se permiten consultas SELECT (o WITH … SELECT).' }, { status: 400 });
  }
  if (FORBIDDEN.test(sql)) {
    return NextResponse.json({ error: 'La consulta contiene una palabra no permitida (esta consola es de solo lectura).' }, { status: 400 });
  }

  const tx = await sequelize.transaction();
  try {
    // READ ONLY: la BD rechaza cualquier escritura dentro de la transacción.
    await sequelize.query('SET TRANSACTION READ ONLY', { transaction: tx });
    await sequelize.query(`SET LOCAL statement_timeout = ${TIMEOUT_MS}`, { transaction: tx });

    // Envuelve para topar filas sin depender de que el usuario ponga LIMIT.
    const wrapped = `WITH _uq AS (\n${sql}\n) SELECT * FROM _uq LIMIT ${MAX_ROWS + 1}`;
    const rows = (await sequelize.query(wrapped, { transaction: tx, type: QueryTypes.SELECT })) as any[];
    await tx.rollback();

    const truncated = rows.length > MAX_ROWS;
    const out = truncated ? rows.slice(0, MAX_ROWS) : rows;
    const columns = out.length ? Object.keys(out[0]) : [];
    return NextResponse.json({ columns, rows: out, rowCount: out.length, truncated });
  } catch (error: any) {
    await tx.rollback().catch(() => {});
    return NextResponse.json({ error: error?.message || 'Error ejecutando la consulta.' }, { status: 400 });
  }
}, [ROLES.ADMIN]);
