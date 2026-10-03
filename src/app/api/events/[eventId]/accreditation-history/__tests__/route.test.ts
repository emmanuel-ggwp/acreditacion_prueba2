// Prueba unitaria del handler GET de /api/events/[eventId]/accreditation-history.
jest.mock('@/services/accreditationService', () => ({
  accreditationService: { getEventAccreditationHistory: jest.fn() },
}));
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET } from '../route';
import { accreditationService } from '@/services/accreditationService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const mockedService = accreditationService as unknown as { getEventAccreditationHistory: jest.Mock };
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as unknown as { findByPk: jest.Mock };

const makeRequest = (url: string, withToken = true) =>
  new Request(url, { method: 'GET', headers: withToken ? { Authorization: 'Bearer x' } : {} });

const ctx = (eventId: string) => ({ params: Promise.resolve({ eventId }) });

describe('GET /api/events/[eventId]/accreditation-history', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve el historial del evento', async () => {
    const hist = [{ id: 'h1', action: 'ACCREDITED' }];
    mockedService.getEventAccreditationHistory.mockResolvedValue(hist);

    const res = await (GET as any)(makeRequest('http://localhost/api/events/ev-1/accreditation-history'), ctx('ev-1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(hist);
    expect(mockedService.getEventAccreditationHistory).toHaveBeenCalledWith('ev-1', { scheduleId: undefined, limit: undefined });
  });

  it('pasa scheduleId y limit desde el query', async () => {
    mockedService.getEventAccreditationHistory.mockResolvedValue([]);

    const res = await (GET as any)(
      makeRequest('http://localhost/api/events/ev-1/accreditation-history?scheduleId=s2&limit=50'),
      ctx('ev-1'),
    );

    expect(res.status).toBe(200);
    expect(mockedService.getEventAccreditationHistory).toHaveBeenCalledWith('ev-1', { scheduleId: 's2', limit: 50 });
  });

  it('devuelve 400 si falta el eventId', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/events//accreditation-history'), ctx(''));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ message: 'Invalid event ID' });
    expect(mockedService.getEventAccreditationHistory).not.toHaveBeenCalled();
  });

  it('devuelve 500 con el mensaje del error si el servicio lanza', async () => {
    mockedService.getEventAccreditationHistory.mockRejectedValue(new Error('boom'));

    const res = await (GET as any)(makeRequest('http://localhost/api/events/ev-1/accreditation-history'), ctx('ev-1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'boom' });
  });

  it('devuelve 403 para un rol no permitido (GUARDIA)', async () => {
    UserMock.findByPk.mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

    const res = await (GET as any)(makeRequest('http://localhost/api/events/ev-1/accreditation-history'), ctx('ev-1'));

    expect(res.status).toBe(403);
    expect(mockedService.getEventAccreditationHistory).not.toHaveBeenCalled();
  });

  it('devuelve 401 si no hay token', async () => {
    const res = await (GET as any)(makeRequest('http://localhost/api/events/ev-1/accreditation-history', false), ctx('ev-1'));
    expect(res.status).toBe(401);
  });
});
