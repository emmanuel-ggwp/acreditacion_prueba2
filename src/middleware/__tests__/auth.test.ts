// verifyAccessToken se mockea para no cargar el jwt real (y evitar depender de env);
// User está mockeado por jest.setup.js (findByPk es un jest.fn()).
jest.mock('@/lib/jwt', () => ({
  verifyAccessToken: jest.fn(),
}));

import { withAuth } from '../auth';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

const mockVerify = verifyAccessToken as jest.Mock;
const mockFindByPk = User.findByPk as unknown as jest.Mock;

const makeReq = (authorization?: string) =>
  new NextRequest('http://localhost/api/protected', {
    headers: authorization ? { authorization } : {},
  });

describe('withAuth — revocación fail-closed (SB-06)', () => {
  let handler: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = jest.fn(async () => NextResponse.json({ ok: true }));
  });

  it('401 si no hay token', async () => {
    const guarded = withAuth(handler as any, ['ADMIN'] as any);
    const res = await guarded(makeReq(), { params: {} });
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect(mockFindByPk).not.toHaveBeenCalled();
  });

  it('401 si el token es inválido', async () => {
    mockVerify.mockReturnValue(null);
    const guarded = withAuth(handler as any, ['ADMIN'] as any);
    const res = await guarded(makeReq('Bearer malo'), { params: {} });
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('403 si el rol (de la BD) no está permitido', async () => {
    mockVerify.mockReturnValue({ id: 'u1', role: 'GUARDIA' });
    mockFindByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });
    const guarded = withAuth(handler as any, ['ADMIN'] as any);
    const res = await guarded(makeReq('Bearer t'), { params: {} });
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('503 si la consulta a la BD falla (FAIL-CLOSED, el núcleo de SB-06)', async () => {
    mockVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    mockFindByPk.mockRejectedValue(new Error('DB down'));
    const guarded = withAuth(handler as any, ['ADMIN'] as any);
    const res = await guarded(makeReq('Bearer t'), { params: {} });
    expect(res.status).toBe(503);
    // Lo importante: NO se ejecuta el handler ante un error de BD.
    expect(handler).not.toHaveBeenCalled();
  });

  it('401 si el usuario ya no existe (revocado por borrado)', async () => {
    mockVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    mockFindByPk.mockResolvedValue(null);
    const guarded = withAuth(handler as any, ['ADMIN'] as any);
    const res = await guarded(makeReq('Bearer t'), { params: {} });
    expect(res.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
  });

  it('403 si el usuario está deshabilitado (isActive === false)', async () => {
    mockVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    mockFindByPk.mockResolvedValue({ id: 'u1', isActive: false });
    const guarded = withAuth(handler as any, ['ADMIN'] as any);
    const res = await guarded(makeReq('Bearer t'), { params: {} });
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('llama al handler si el token es válido y el usuario está activo', async () => {
    mockVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    mockFindByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
    const guarded = withAuth(handler as any, ['ADMIN'] as any);
    const res = await guarded(makeReq('Bearer t'), { params: {} });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.status).toBe(200);
  });

  // SB-07: la autorización usa el rol de la BD, no el (posiblemente viejo) del token.
  it('deniega si el token dice ADMIN pero la BD ya degradó a GUARDIA (SB-07)', async () => {
    mockVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    mockFindByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });
    const guarded = withAuth(handler as any, ['ADMIN'] as any);
    const res = await guarded(makeReq('Bearer t'), { params: {} });
    expect(res.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it('permite si el token dice GUARDIA pero la BD ya ascendió a ADMIN (SB-07)', async () => {
    mockVerify.mockReturnValue({ id: 'u1', role: 'GUARDIA' });
    mockFindByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
    const guarded = withAuth(handler as any, ['ADMIN'] as any);
    const res = await guarded(makeReq('Bearer t'), { params: {} });
    expect(res.status).toBe(200);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
