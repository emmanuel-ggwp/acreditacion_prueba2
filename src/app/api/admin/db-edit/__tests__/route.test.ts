// Prueba unitaria del handler POST de /api/admin/db-edit (editor SQL de ESCRITURA, ADMIN).
// La ruta usa sequelize.query/transaction directamente (mockeados en jest.setup) y
// auditLogService para registrar la edición aplicada.
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));
jest.mock('@/services/auditLogService', () => ({ auditLogService: { log: jest.fn().mockResolvedValue(undefined) } }));

import { POST } from '../route';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';
import { sequelize } from '@/lib/sequelize';
import { auditLogService } from '@/services/auditLogService';

const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };
const sequelizeMock = sequelize as unknown as { transaction: jest.Mock; query: jest.Mock };
const auditMock = auditLogService as unknown as { log: jest.Mock };

const PASS = 'editor-pass';

const makeRequest = (body: any, { withToken = true, raw = false } = {}) =>
  new Request('http://localhost/api/admin/db-edit', {
    method: 'POST',
    headers: withToken ? { Authorization: 'Bearer x', 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
    body: raw ? body : JSON.stringify(body),
  });

describe('POST /api/admin/db-edit', () => {
  let tx: { commit: jest.Mock; rollback: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.DB_EDITOR_ENABLED = 'true';
    process.env.DB_EDITOR_PASSPHRASE = PASS;

    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });

    tx = { commit: jest.fn().mockResolvedValue(undefined), rollback: jest.fn().mockResolvedValue(undefined) };
    sequelizeMock.transaction.mockResolvedValue(tx);
  });

  // Mock por defecto: SET LOCAL → []; preview (OVER) → filas con __affected__; apply (count) → [{affected}].
  const mockQueries = (previewRows: any[], applyAffected: number) => {
    sequelizeMock.query.mockImplementation((sql: string) => {
      if (/OVER \(\)/.test(sql)) return Promise.resolve(previewRows);
      if (/count\(\*\)::int AS affected/.test(sql)) return Promise.resolve([{ affected: applyAffected }]);
      return Promise.resolve([]); // SET LOCAL u otros
    });
  };

  it('preview: cuenta las filas afectadas, muestra cómo quedarían y SIEMPRE hace rollback', async () => {
    mockQueries([
      { id: 1, event_id: 'e9', __affected__: 2 },
      { id: 2, event_id: 'e9', __affected__: 2 },
    ], 2);

    const res = await (POST as any)(
      makeRequest({ passphrase: PASS, mode: 'preview', sql: "UPDATE audit_logs SET event_id = 'e9' WHERE event_id IS NULL" }),
      { params: {} },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.mode).toBe('preview');
    expect(body.operation).toBe('UPDATE');
    expect(body.table).toBe('audit_logs');
    expect(body.affected).toBe(2);
    expect(body.columns).toEqual(['id', 'event_id']); // __affected__ se oculta
    expect(body.rows).toEqual([{ id: 1, event_id: 'e9' }, { id: 2, event_id: 'e9' }]);
    expect(body.truncated).toBe(false);
    // Vista previa: rollback sí, commit NO, y NO se audita.
    expect(tx.rollback).toHaveBeenCalled();
    expect(tx.commit).not.toHaveBeenCalled();
    expect(auditMock.log).not.toHaveBeenCalled();
    // Se le agregó RETURNING * (el usuario no lo puso) y se envolvió en la CTE _eq.
    const previewCall = sequelizeMock.query.mock.calls.find((c) => /OVER \(\)/.test(String(c[0])));
    expect(previewCall![0]).toContain('WITH _eq AS');
    expect(previewCall![0]).toContain('RETURNING *');
  });

  it('apply: ejecuta, hace COMMIT y registra la edición en auditoría', async () => {
    mockQueries([], 3);

    const res = await (POST as any)(
      makeRequest({ passphrase: PASS, mode: 'apply', sql: "DELETE FROM guests WHERE id = 'x'" }),
      { params: {} },
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ mode: 'apply', operation: 'DELETE', table: 'guests', affected: 3 });
    expect(tx.commit).toHaveBeenCalled();
    expect(tx.rollback).not.toHaveBeenCalled();
    expect(auditMock.log).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', action: 'DELETE', entity: 'DbEditor' }),
    );
    const details = auditMock.log.mock.calls[0][0].details;
    expect(details).toEqual(expect.objectContaining({ operation: 'DELETE', table: 'guests', affected: 3 }));
  });

  it('apply de un INSERT se audita como acción CREATE', async () => {
    mockQueries([], 1);
    const res = await (POST as any)(
      makeRequest({ passphrase: PASS, mode: 'apply', sql: "INSERT INTO awards (name) VALUES ('Premio')" }),
      { params: {} },
    );
    expect(res.status).toBe(200);
    expect(auditMock.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'CREATE', entity: 'DbEditor' }));
  });

  it('no confunde una palabra prohibida dentro de un literal de texto', async () => {
    // 'drop' va dentro de comillas: es DATO, no DDL. Debe pasar la validación y previsualizar.
    mockQueries([{ id: 1, note: 'please drop this', __affected__: 1 }], 1);
    const res = await (POST as any)(
      makeRequest({ passphrase: PASS, mode: 'preview', sql: "UPDATE notes SET note = 'please drop this' WHERE id = '1'" }),
      { params: {} },
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.affected).toBe(1);
  });

  it('rechaza DDL / funciones peligrosas fuera de literales', async () => {
    const res = await (POST as any)(
      makeRequest({ passphrase: PASS, mode: 'apply', sql: "UPDATE t SET x = (SELECT lo_export(1, '/tmp/x'))" }),
      { params: {} },
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/no permitida/i);
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('rechaza sentencias que no son UPDATE/DELETE/INSERT', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'SELECT * FROM users' }), { params: {} });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/UPDATE, DELETE o INSERT/);
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('rechaza múltiples sentencias (";" fuera de literales)', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: "UPDATE t SET x = 1; DELETE FROM t" }), { params: {} });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/UNA sentencia/);
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('devuelve 403 si el editor está deshabilitado (apagado por defecto)', async () => {
    process.env.DB_EDITOR_ENABLED = 'false';
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'UPDATE t SET x = 1' }), { params: {} });
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toMatch(/deshabilitado/);
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('devuelve 403 si no hay passphrase configurada en el servidor', async () => {
    delete process.env.DB_EDITOR_PASSPHRASE;
    const res = await (POST as any)(makeRequest({ passphrase: 'cualquiera', sql: 'UPDATE t SET x = 1' }), { params: {} });
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toMatch(/no está configurado/);
  });

  it('devuelve 403 con passphrase incorrecta', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: 'incorrecta', sql: 'UPDATE t SET x = 1' }), { params: {} });
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body.error).toMatch(/Passphrase incorrecta/);
    expect(sequelizeMock.query).not.toHaveBeenCalled();
  });

  it('devuelve 400 si el cuerpo no es JSON válido', async () => {
    const res = await (POST as any)(makeRequest('{no-json', { raw: true }), { params: {} });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Cuerpo inválido.' });
  });

  it('devuelve 400 si la sentencia está vacía', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: '   ' }), { params: {} });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Escribe una sentencia/);
  });

  it('hace rollback y devuelve 400 si la ejecución falla (preview)', async () => {
    sequelizeMock.query.mockImplementation((sql: string) => {
      if (/OVER \(\)/.test(sql)) return Promise.reject(new Error('columna inexistente'));
      return Promise.resolve([]);
    });
    const res = await (POST as any)(
      makeRequest({ passphrase: PASS, mode: 'preview', sql: 'UPDATE t SET nope = 1' }),
      { params: {} },
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe('columna inexistente');
    expect(tx.rollback).toHaveBeenCalled();
    expect(tx.commit).not.toHaveBeenCalled();
  });

  it('devuelve 403 para un rol que no es ADMIN', async () => {
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'UPDATE t SET x = 1' }), { params: {} });
    const body = await res.json();
    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (POST as any)(makeRequest({ passphrase: PASS, sql: 'UPDATE t SET x = 1' }, { withToken: false }), { params: {} });
    const body = await res.json();
    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
