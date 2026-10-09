import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { QueryTypes } from 'sequelize';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { sequelize } from '@/lib/sequelize';
import { auditLogService } from '@/services/auditLogService';

// Editor de base de datos (ESCRITURA) para ADMIN, con vista previa segura.
//
// A diferencia de la consola de SOLO LECTURA (db-query), aquí SÍ se modifica la base,
// así que las capas de seguridad son más estrictas (todas deben pasar):
//   1. Rol ADMIN (withAuth).
//   2. APAGADO por defecto: requiere DB_EDITOR_ENABLED="true" en el servidor.
//   3. Passphrase PROPIA y OBLIGATORIA (DB_EDITOR_PASSPHRASE). No hay valor por defecto
//      en el código (la consola de lectura sí lo trae): sin esta variable el editor NO
//      funciona. Comparación en tiempo constante.
//   4. UNA sola sentencia de DATOS: solo UPDATE / DELETE / INSERT (sin ';', sin DDL ni
//      funciones peligrosas). Los literales de texto y comentarios se IGNORAN al validar
//      (para no rechazar, p. ej., un valor que contenga la palabra "create").
//   5. Dos modos:
//      - 'preview': ejecuta la sentencia dentro de una transacción y SIEMPRE hace ROLLBACK.
//        Devuelve CUÁNTAS filas se afectarían y CUÁLES (cómo quedarían). No cambia nada.
//      - 'apply': ejecuta y hace COMMIT, y registra la edición en Auditoría (quién, la
//        sentencia, la tabla y cuántas filas).
//
// El esquema (ALTER/CREATE/DROP) NO se toca aquí a propósito: eso va por migraciones.

const MAX_ROWS = 1000;
const TIMEOUT_MS = 15000;
const COUNT_ALIAS = '__affected__';

// La sentencia debe EMPEZAR por una operación de datos.
const ALLOWED_START = /^\s*(update|delete|insert)\b/i;
// DDL / administración / funciones peligrosas que no deben aparecer (defensa en profundidad).
// Se evalúa sobre el SQL con literales y comentarios ya quitados, así que NO colisiona con
// datos del usuario. OJO: no incluye update/delete/insert/set/from/into/values/select/where/
// returning, que son parte legítima de las operaciones permitidas.
const FORBIDDEN = /\b(drop|alter|truncate|create|grant|revoke|vacuum|reindex|cluster|comment|reassign|copy|execute|prepare|deallocate|discard|refresh|listen|unlisten|notify|pg_read_file|pg_read_binary_file|pg_ls_dir|pg_stat_file|lo_import|lo_export|lo_get|lo_put|pg_sleep|pg_terminate_backend|pg_cancel_backend|dblink|set_config|current_setting)\b/i;

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// Quita comentarios (-- y / * * /) y literales de texto ('...' y $tag$...$tag$), para que la
// validación mire solo el "código" SQL y no el contenido de los datos. Conservador: ante
// duda, deja de más (una validación más estricta es preferible a colar algo peligroso).
function stripStringsAndComments(sql: string): string {
  let out = '';
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    const c2 = sql[i + 1];
    if (c === '-' && c2 === '-') { while (i < n && sql[i] !== '\n') i++; continue; }
    if (c === '/' && c2 === '*') { i += 2; while (i < n && !(sql[i] === '*' && sql[i + 1] === '/')) i++; i += 2; continue; }
    if (c === "'") {
      i++;
      while (i < n) {
        if (sql[i] === "'" && sql[i + 1] === "'") { i += 2; continue; } // '' escapado
        if (sql[i] === "'") { i++; break; }
        i++;
      }
      out += " '' ";
      continue;
    }
    if (c === '$') {
      const m = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        i = end === -1 ? n : end + tag.length;
        out += ' $$ ';
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  // APAGADO por defecto: hay que encenderlo explícitamente en el servidor.
  if ((process.env.DB_EDITOR_ENABLED ?? 'false').toLowerCase() !== 'true') {
    return NextResponse.json({ error: 'El editor de base de datos está deshabilitado.' }, { status: 403 });
  }
  // Passphrase OBLIGATORIA del servidor: sin ella, el editor no opera (no hay default en el código).
  const expected = process.env.DB_EDITOR_PASSPHRASE || '';
  if (!expected) {
    return NextResponse.json({ error: 'El editor no está configurado (falta DB_EDITOR_PASSPHRASE en el servidor).' }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Cuerpo inválido.' }, { status: 400 });
  }

  const passphrase = String(body?.passphrase ?? '');
  if (!safeEqual(passphrase, expected)) {
    return NextResponse.json({ error: 'Passphrase incorrecta.' }, { status: 403 });
  }

  const mode = body?.mode === 'apply' ? 'apply' : 'preview';

  // Normaliza: quita espacios y ';' final (una sola sentencia; ver abajo).
  const rawSql = String(body?.sql ?? '').trim().replace(/;+\s*$/, '');
  if (!rawSql) {
    return NextResponse.json({ error: 'Escribe una sentencia.' }, { status: 400 });
  }

  // Validación sobre el SQL SIN literales ni comentarios (no colisiona con los datos).
  const code = stripStringsAndComments(rawSql);
  if (code.includes(';')) {
    return NextResponse.json({ error: 'Solo se permite UNA sentencia (sin ";").' }, { status: 400 });
  }
  if (!ALLOWED_START.test(code)) {
    return NextResponse.json({ error: 'Solo se permiten UPDATE, DELETE o INSERT (los cambios de esquema van por migraciones).' }, { status: 400 });
  }
  if (FORBIDDEN.test(code)) {
    return NextResponse.json({ error: 'La sentencia contiene una palabra no permitida (DDL o función peligrosa).' }, { status: 400 });
  }

  // Operación y tabla (para la auditoría y el mensaje).
  const op = (/^\s*(update|delete|insert)/i.exec(code)?.[1] || '').toUpperCase();
  const tableMatch = /^\s*(?:update|delete\s+from|insert\s+into)\s+("?[\w.]+"?)/i.exec(code);
  const table = tableMatch ? tableMatch[1].replace(/"/g, '') : null;

  // Para contar/mostrar las filas afectadas necesitamos RETURNING: si el usuario no lo puso,
  // lo agregamos en una línea nueva (por si la sentencia termina en un comentario `-- ...`).
  const hasReturning = /\breturning\b/i.test(code);
  const dml = hasReturning ? rawSql : `${rawSql}\nRETURNING *`;

  const tx = await sequelize.transaction();
  try {
    await sequelize.query(`SET LOCAL statement_timeout = ${TIMEOUT_MS}`, { transaction: tx });

    if (mode === 'preview') {
      // La CTE que MODIFICA se referencia UNA sola vez; count(*) OVER () cuenta TODAS las filas
      // afectadas (antes del LIMIT), aunque solo mostremos una muestra. Todo se revierte.
      const wrapped =
        `WITH _eq AS (\n${dml}\n) ` +
        `SELECT _eq.*, count(*) OVER () AS ${COUNT_ALIAS} FROM _eq LIMIT ${MAX_ROWS + 1}`;
      const rows = (await sequelize.query(wrapped, { transaction: tx, type: QueryTypes.SELECT })) as any[];
      await tx.rollback();

      const affected = rows.length ? Number(rows[0][COUNT_ALIAS]) || 0 : 0;
      const shown = rows.slice(0, MAX_ROWS).map((r) => {
        const { [COUNT_ALIAS]: _omit, ...rest } = r;
        return rest;
      });
      const columns = shown.length ? Object.keys(shown[0]) : [];
      return NextResponse.json({
        mode: 'preview',
        operation: op,
        table,
        affected,
        columns,
        rows: shown,
        truncated: affected > MAX_ROWS,
      });
    }

    // apply: ejecuta de verdad y hace COMMIT. count(*) sobre la CTE que modifica = filas afectadas.
    const wrapped = `WITH _eq AS (\n${dml}\n) SELECT count(*)::int AS affected FROM _eq`;
    const result = (await sequelize.query(wrapped, { transaction: tx, type: QueryTypes.SELECT })) as any[];
    const affected = result.length ? Number(result[0].affected) || 0 : 0;
    await tx.commit();

    // Auditoría de la edición (best-effort; nunca rompe la operación ya confirmada).
    await auditLogService.log({
      userId: req.user.id,
      action: op === 'INSERT' ? 'CREATE' : (op as any),
      entity: 'DbEditor',
      details: {
        name: table ? `${table} (${op})` : `Edición SQL (${op})`,
        summary: `${affected} fila(s) · ${op}${table ? ` en ${table}` : ''} · ${rawSql.slice(0, 300)}`,
        operation: op,
        table,
        affected,
        sql: rawSql.slice(0, 4000),
      },
    });

    return NextResponse.json({ mode: 'apply', operation: op, table, affected });
  } catch (error: any) {
    await tx.rollback().catch(() => {});
    return NextResponse.json({ error: error?.message || 'Error ejecutando la sentencia.' }, { status: 400 });
  }
}, [ROLES.ADMIN]);
