// Se sobreescribe el mock global de @/lib/sequelize (jest.setup) para exponer
// `authenticate`, que es lo único que usa este handler.
jest.mock('@/lib/sequelize', () => ({
  sequelize: { authenticate: jest.fn() },
}));

import { GET } from '../route';
import { sequelize } from '@/lib/sequelize';

const authenticateMock = sequelize.authenticate as jest.Mock;

describe('GET /api/health', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devuelve 200 y estado ok cuando la BD responde', async () => {
    authenticateMock.mockResolvedValue(undefined);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ status: 'ok', db: 'connected' });
    expect(authenticateMock).toHaveBeenCalledTimes(1);
  });

  it('devuelve 500 y estado error cuando la BD falla (sin filtrar detalle)', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    authenticateMock.mockRejectedValue(new Error('connection refused host=secret'));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ status: 'error', db: 'disconnected' });
    spy.mockRestore();
  });
});
