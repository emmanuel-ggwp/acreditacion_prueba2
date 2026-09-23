// Prueba unitaria del handler POST de /api/admin/db-query (consola SQL de solo lectura, ADMIN).
// No hay servicio: la ruta usa sequelize.query directamente (mockeado en jest.setup).
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { POST } from '../route';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';
import { sequelize } from '@/lib/sequelize';

const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };
const sequelizeMock = sequelize as unknown as { transaction: jest.Mock; query: jest.Mock };

const PASS = 'test-pass';

const makeRequest = (body: any, { withToken = true, raw = false } = {}) =>
  new Request('http://localhost/api/admin/db-query', {
    method: 'POST',
    headers: withToken ? { Authorization: 'Bearer x', 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: raw ? body : JSON.stringify(body),
  });

describe('POST /api/admin/db-query', () => {
  let tx: { rollback: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_CONSOLE_ENABLED = 'true';
    process.env.DB_CONSOLE_PASSPHRASE = PASS;

    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });

    tx = { rollback: jest.fn().mockResolvedValue(undefined) };
    sequelizeMock.transaction.mockResolvedValue(tx);
  });

  it('ejecuta un SELECT válido en transacción READ ONLY y devuelve filas', async () => {
    const rows = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
    sequelizeMock.query.mockImplementation((sql: string) => {
      if (sql.includes('_uq')) return Promise.resolve(rows);
      return Promise.resolve([]);
    });

    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SELECT id, name FROM users' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ columns: ['id', 'name'], rows, rowCount: 2, truncated: false });

    // La consulta del usuario se envuelve en un WITH … LIMIT y se corre con type SELECT.
    const wrappedCall = sequelizeMock.query.mock.calls.find((c) => String(c[0]).includes('_uq'));
    expect(wrappedCall).toBeTruthy();
    expect(wrappedCall![0]).toContain('SELECT id, name FROM users');
    expect(wrappedCall![0]).toContain('LIMIT 1001');
    // Siempre hace rollback (nunca commit): es de solo lectura.
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('marca truncated=true cuando hay más de MAX_ROWS filas', async () => {
    const rows = Array.from({ length: 1001 }, (_, i) => ({ n: i }));
    sequelizeMock.query.mockImplementation((sql: string) => {
      if (sql.includes('_uq')) return Promise.resolve(rows);
      return Promise.resolve([]);
    });

    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SELECT n FROM big' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.truncated).toBe(true);
    expect(body.rowCount).toBe(1000);
    expect(body.rows).toHaveLength(1000);
  });

  it('devuelve 403 si la consola está deshabilitada por env', async () => {
    process.env.DB_CONSOLE_ENABLED = 'false';

    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SELECT 1' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: 'La consola de base de datos está deshabilitada.' });
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('devuelve 403 con passphrase incorrecta', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: 'incorrecta', sql: 'SELECT 1' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ error: 'Passphrase incorrecta.' });
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('devuelve 400 si el cuerpo no es JSON válido', async () => {
    const res = await (POST as any)(makeRequest('{no-json', { raw: true }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Cuerpo inválido.' });
  });

  it('devuelve 400 si la consulta está vacía', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: '   ' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Escribe una consulta.' });
  });

  it('rechaza múltiples sentencias (";" en medio)', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SELECT 1; SELECT 2' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Solo se permite UNA sentencia (sin ";").' });
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('rechaza sentencias que no son SELECT/WITH', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SHOW TABLES' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Solo se permiten consultas SELECT (o WITH … SELECT).' });
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('rechaza consultas con palabras de escritura prohibidas', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SELECT delete FROM t' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'La consulta contiene una palabra no permitida (esta consola es de solo lectura).' });
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('devuelve 400 y hace rollback si la ejecución de la consulta falla', async () => {
    sequelizeMock.query.mockImplementation((sql: string) => {
      if (sql.includes('_uq')) return Promise.reject(new Error('columna inexistente'));
      return Promise.resolve([]);
    });

    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SELECT nope FROM users' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'columna inexistente' });
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('devuelve 403 para un rol que no es ADMIN', async () => {
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SELECT 1' }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SELECT 1' }, { withToken: false }), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
