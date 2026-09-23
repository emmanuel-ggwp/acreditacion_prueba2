// Prueba unitaria de los handlers POST/GET/DELETE/PATCH/PUT. Se mockea el servicio y
// `@/lib/jwt`; `withAuth` contrasta el usuario contra User (mock global). El PUT valida
// con zod real (bulkAccreditationSchema), así que se usan GUIDs válidos.
jest.mock('@/lib/jwt');
jest.mock('@/services/accreditationService', () => ({
  accreditationService: {
    accreditParticipant: jest.fn(),
    accreditGuest: jest.fn(),
    listAccreditations: jest.fn(),
    unaccreditParticipant: jest.fn(),
    unaccreditGuest: jest.fn(),
    setAccreditationGuestCount: jest.fn(),
    bulkAccredit: jest.fn(),
  },
}));

import { POST, GET, DELETE, PATCH, PUT } from '../route';
import { accreditationService } from '@/services/accreditationService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';
import { z } from 'zod';

const mockedService = accreditationService as unknown as {
  accreditParticipant: jest.Mock;
  accreditGuest: jest.Mock;
  listAccreditations: jest.Mock;
  unaccreditParticipant: jest.Mock;
  unaccreditGuest: jest.Mock;
  setAccreditationGuestCount: jest.Mock;
  bulkAccredit: jest.Mock;
};
const mockedVerify = verifyAccessToken as jest.Mock;
const UserMock = User as jest.Mocked<typeof User>;

const GUID_A = '123e4567-e89b-12d3-a456-426614174000';
const GUID_B = '223e4567-e89b-12d3-a456-426614174001';

const makeRequest = (method: string, body?: any, url = 'http://localhost/api/accreditations', withToken = true) =>
  new Request(url, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('/api/accreditations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // req.user.id (accreditedBy) proviene del token; el rol autorizado es el de la BD.
    mockedVerify.mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  describe('POST (acreditar)', () => {
    it('acredita a un participante (201) pasando accreditedBy del token', async () => {
      const created = { id: 'a1', participantId: 'p1' };
      mockedService.accreditParticipant.mockResolvedValue(created);

      const res = await (POST as any)(
        makeRequest('POST', { type: 'participant', id: 'p1', scheduleId: 's1', notes: 'ok', guestCount: 2 })
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual(created);
      expect(mockedService.accreditParticipant).toHaveBeenCalledWith('p1', 's1', 'u1', 'ok', 2);
    });

    it('acredita a un invitado (201)', async () => {
      const created = { id: 'a2', guestId: 'g1' };
      mockedService.accreditGuest.mockResolvedValue(created);

      const res = await (POST as any)(
        makeRequest('POST', { type: 'guest', id: 'g1', scheduleId: 's1', notes: 'inv' })
      );
      const body = await res.json();

      expect(res.status).toBe(201);
      expect(body).toEqual(created);
      expect(mockedService.accreditGuest).toHaveBeenCalledWith('g1', 's1', 'u1', 'inv');
    });

    it('devuelve 400 para un tipo inválido', async () => {
      const res = await (POST as any)(makeRequest('POST', { type: 'other', id: 'x', scheduleId: 's1' }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Invalid accreditation type' });
      expect(mockedService.accreditParticipant).not.toHaveBeenCalled();
      expect(mockedService.accreditGuest).not.toHaveBeenCalled();
    });

    it('devuelve 400 cuando el servicio lanza (p. ej. cupo lleno)', async () => {
      mockedService.accreditParticipant.mockRejectedValue(new Error('Cupo lleno'));

      const res = await (POST as any)(
        makeRequest('POST', { type: 'participant', id: 'p1', scheduleId: 's1' })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Cupo lleno' });
    });

    it('permite el rol GUARDIA (acreditador)', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'g1', isActive: true, role: 'GUARDIA' });
      mockedService.accreditParticipant.mockResolvedValue({ id: 'a1' });

      const res = await (POST as any)(
        makeRequest('POST', { type: 'participant', id: 'p1', scheduleId: 's1' })
      );
      expect(res.status).toBe(201);
    });
  });

  describe('GET (listar)', () => {
    it('devuelve las acreditaciones filtradas', async () => {
      const page = { rows: [{ id: 'a1' }], count: 1 };
      mockedService.listAccreditations.mockResolvedValue(page);

      const res = await (GET as any)(
        makeRequest('GET', undefined, 'http://localhost/api/accreditations?eventId=e1&scheduleId=s1&page=2&limit=25')
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(page);
      expect(mockedService.listAccreditations).toHaveBeenCalledWith({
        eventId: 'e1',
        scheduleId: 's1',
        page: 2,
        limit: 25,
      });
    });

    it('pasa undefined en los filtros ausentes', async () => {
      mockedService.listAccreditations.mockResolvedValue({ rows: [], count: 0 });

      await (GET as any)(makeRequest('GET', undefined, 'http://localhost/api/accreditations'));

      expect(mockedService.listAccreditations).toHaveBeenCalledWith({
        eventId: undefined,
        scheduleId: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('devuelve 403 para el rol GUARDIA (GET no lo permite)', async () => {
      (UserMock.findByPk as jest.Mock).mockResolvedValue({ id: 'g1', isActive: true, role: 'GUARDIA' });

      const res = await (GET as any)(makeRequest('GET', undefined, 'http://localhost/api/accreditations'));
      const body = await res.json();

      expect(res.status).toBe(403);
      expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
      expect(mockedService.listAccreditations).not.toHaveBeenCalled();
    });

    it('devuelve 400 cuando el servicio lanza un ZodError', async () => {
      mockedService.listAccreditations.mockRejectedValue(new z.ZodError([]));

      const res = await (GET as any)(makeRequest('GET', undefined, 'http://localhost/api/accreditations'));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(Array.isArray(body.errors)).toBe(true);
    });

    it('devuelve 500 cuando el servicio lanza un error genérico', async () => {
      mockedService.listAccreditations.mockRejectedValue(new Error('boom'));

      const res = await (GET as any)(makeRequest('GET', undefined, 'http://localhost/api/accreditations'));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'boom' });
    });
  });

  describe('DELETE (des-acreditar)', () => {
    it('des-acredita a un participante (200)', async () => {
      mockedService.unaccreditParticipant.mockResolvedValue({ removed: true });

      const res = await (DELETE as any)(
        makeRequest('DELETE', { type: 'participant', id: 'p1', scheduleId: 's1' })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ removed: true });
      expect(mockedService.unaccreditParticipant).toHaveBeenCalledWith('p1', 's1', 'u1');
    });

    it('des-acredita a un invitado (200)', async () => {
      mockedService.unaccreditGuest.mockResolvedValue({ removed: true });

      const res = await (DELETE as any)(
        makeRequest('DELETE', { type: 'guest', id: 'g1', scheduleId: 's1' })
      );
      expect(res.status).toBe(200);
      expect(mockedService.unaccreditGuest).toHaveBeenCalledWith('g1', 's1', 'u1');
    });

    it('devuelve 400 cuando faltan id o scheduleId', async () => {
      const res = await (DELETE as any)(makeRequest('DELETE', { type: 'participant', scheduleId: 's1' }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'id y scheduleId son requeridos' });
    });

    it('devuelve 400 para un tipo inválido', async () => {
      const res = await (DELETE as any)(
        makeRequest('DELETE', { type: 'other', id: 'p1', scheduleId: 's1' })
      );
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'Invalid accreditation type' });
    });
  });

  describe('PATCH (editar nº de invitados)', () => {
    it('actualiza el guestCount (200)', async () => {
      mockedService.setAccreditationGuestCount.mockResolvedValue({ guestCount: 3 });

      const res = await (PATCH as any)(
        makeRequest('PATCH', { id: 'p1', scheduleId: 's1', guestCount: 3 })
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual({ guestCount: 3 });
      expect(mockedService.setAccreditationGuestCount).toHaveBeenCalledWith('p1', 's1', 3, 'u1');
    });

    it('convierte un guestCount ausente/no numérico en 0', async () => {
      mockedService.setAccreditationGuestCount.mockResolvedValue({ guestCount: 0 });

      await (PATCH as any)(makeRequest('PATCH', { id: 'p1', scheduleId: 's1' }));

      expect(mockedService.setAccreditationGuestCount).toHaveBeenCalledWith('p1', 's1', 0, 'u1');
    });

    it('devuelve 400 cuando faltan id o scheduleId', async () => {
      const res = await (PATCH as any)(makeRequest('PATCH', { scheduleId: 's1', guestCount: 1 }));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body).toEqual({ message: 'id y scheduleId son requeridos' });
    });
  });

  describe('PUT (acreditación masiva)', () => {
    it('acredita en masa (200) con un array válido', async () => {
      const results = [{ id: 'a1' }];
      mockedService.bulkAccredit.mockResolvedValue(results);
      const validBody = [
        { type: 'participant', participantId: GUID_A, eventScheduleId: GUID_B },
      ];

      const res = await (PUT as any)(makeRequest('PUT', validBody));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toEqual(results);
      expect(mockedService.bulkAccredit).toHaveBeenCalledWith(validBody, 'u1');
    });

    it('devuelve 400 cuando el cuerpo no pasa la validación zod', async () => {
      const res = await (PUT as any)(makeRequest('PUT', [{ type: 'participant' }]));
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.message).toBe('Validation failed');
      expect(Array.isArray(body.errors)).toBe(true);
      expect(mockedService.bulkAccredit).not.toHaveBeenCalled();
    });

    it('devuelve 500 cuando el servicio lanza un error genérico', async () => {
      mockedService.bulkAccredit.mockRejectedValue(new Error('bulk fail'));
      const validBody = [{ type: 'guest', guestId: GUID_A, eventScheduleId: GUID_B }];

      const res = await (PUT as any)(makeRequest('PUT', validBody));
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body).toEqual({ message: 'bulk fail' });
    });
  });

  it('devuelve 401 cuando no hay token', async () => {
    const res = await (POST as any)(
      makeRequest('POST', { type: 'participant', id: 'p1', scheduleId: 's1' }, 'http://localhost/api/accreditations', false)
    );
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
  });
});
