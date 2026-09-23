// El handler lee del disco con fs/promises.readFile: se mockea.
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
}));

import { GET } from '../route';
import { readFile } from 'fs/promises';

const readFileMock = readFile as jest.Mock;

// El handler hace `await params`, así que se pasa como Promise (forma real de App Router).
const ctx = (filename: string) => ({ params: Promise.resolve({ filename }) });
const req = () => new Request('http://localhost/api/uploads/x');

describe('GET /api/uploads/[filename]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sirve una imagen existente (200) con Content-Type y Cache-Control', async () => {
    readFileMock.mockResolvedValue(Buffer.from('imgdata'));

    const res = await GET(req(), ctx('abc.png') as any);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/png');
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable');
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.toString()).toBe('imgdata');
    expect(readFileMock).toHaveBeenCalled();
    expect(String(readFileMock.mock.calls[0][0])).toMatch(/abc\.png$/);
  });

  it('cae al directorio legacy cuando el primero falla (200)', async () => {
    readFileMock
      .mockRejectedValueOnce(new Error('ENOENT'))
      .mockResolvedValueOnce(Buffer.from('legacy'));

    const res = await GET(req(), ctx('pic.jpg') as any);

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('image/jpeg');
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(bytes.toString()).toBe('legacy');
    expect(readFileMock).toHaveBeenCalledTimes(2);
  });

  it('devuelve 400 para una extensión no permitida', async () => {
    const res = await GET(req(), ctx('archivo.txt') as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'Archivo no válido.' });
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('devuelve 400 y bloquea el path traversal', async () => {
    const res = await GET(req(), ctx('../secreto.png') as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'Archivo no válido.' });
    expect(readFileMock).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando la imagen no está en ningún directorio', async () => {
    readFileMock.mockRejectedValue(new Error('ENOENT'));

    const res = await GET(req(), ctx('noexiste.webp') as any);
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ message: 'Imagen no encontrada.' });
    // Se intentó en ambos directorios (persistente + legacy).
    expect(readFileMock).toHaveBeenCalledTimes(2);
  });
});
