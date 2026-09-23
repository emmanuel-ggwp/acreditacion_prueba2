// El handler escribe en disco con fs/promises: se mockea para no tocar el FS real.
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/jwt');

import { POST } from '../route';
import { writeFile, mkdir } from 'fs/promises';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';
import { UPLOADS_DIR } from '@/utils/uploadsStorage';

const writeFileMock = writeFile as jest.Mock;
const mkdirMock = mkdir as jest.Mock;
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const uploadReq = (file?: any, field = 'file') => {
  const fd = new FormData();
  if (file !== undefined) fd.append(field, file);
  return new Request('http://localhost/api/uploads', {
    method: 'POST',
    body: fd,
    headers: { Authorization: 'Bearer x' },
  });
};

describe('POST /api/uploads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'admin-1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'admin-1', isActive: true, role: 'ADMIN' });
    writeFileMock.mockResolvedValue(undefined);
    mkdirMock.mockResolvedValue(undefined);
  });

  it('sube un PNG válido y devuelve 201 con la URL', async () => {
    const file = new File([Uint8Array.from([1, 2, 3])], 'foto.png', { type: 'image/png' });

    const res = await (POST as any)(uploadReq(file), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.url).toMatch(/^\/api\/uploads\/[0-9a-fA-F-]+\.png$/);
    expect(mkdirMock).toHaveBeenCalledWith(UPLOADS_DIR, { recursive: true });
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    // Se escribe un Buffer con el contenido del archivo.
    expect(Buffer.isBuffer(writeFileMock.mock.calls[0][1])).toBe(true);
  });

  it('acepta el rol OPERATOR (201)', async () => {
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'op-1', isActive: true, role: 'OPERATOR' });
    const file = new File([Uint8Array.from([9])], 'x.jpg', { type: 'image/jpeg' });

    const res = await (POST as any)(uploadReq(file), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.url).toMatch(/\.jpg$/);
  });

  it('devuelve 400 si no se envía archivo', async () => {
    const res = await (POST as any)(uploadReq(undefined), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'No se recibió ningún archivo.' });
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 para un tipo de archivo no permitido', async () => {
    const file = new File([Uint8Array.from([1])], 'doc.pdf', { type: 'application/pdf' });

    const res = await (POST as any)(uploadReq(file), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain('Tipo de archivo no permitido');
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 si el archivo supera el tamaño máximo (8 MB)', async () => {
    // Se evita alojar 8 MB reales: se simula el request con un archivo de tamaño grande.
    const bigReq: any = {
      headers: { get: (k: string) => (k.toLowerCase() === 'authorization' ? 'Bearer x' : null) },
      formData: async () => ({
        get: () => ({ type: 'image/png', size: 9 * 1024 * 1024, arrayBuffer: async () => new ArrayBuffer(0) }),
      }),
    };

    const res = await (POST as any)(bigReq, { params: {} });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.message).toContain('tamaño máximo');
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('devuelve 500 si falla la escritura en disco', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    writeFileMock.mockRejectedValueOnce(new Error('disk full'));
    const file = new File([Uint8Array.from([1, 2, 3])], 'foto.png', { type: 'image/png' });

    const res = await (POST as any)(uploadReq(file), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(500);
    // El mensaje es genérico: no filtra el detalle (ruta absoluta) al cliente.
    expect(body).toEqual({ message: 'Error al subir el archivo' });
    spy.mockRestore();
  });

  it('devuelve 403 si el rol no está permitido', async () => {
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'm-1', isActive: true, role: 'MANAGER' });
    const file = new File([Uint8Array.from([1])], 'x.png', { type: 'image/png' });

    const res = await (POST as any)(uploadReq(file), { params: {} });
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it('devuelve 401 si no hay token', async () => {
    const file = new File([Uint8Array.from([1])], 'x.png', { type: 'image/png' });
    const fd = new FormData();
    fd.append('file', file);
    const req = new Request('http://localhost/api/uploads', { method: 'POST', body: fd });

    const res = await (POST as any)(req, { params: {} });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
