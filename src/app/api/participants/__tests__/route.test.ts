// Prueba unitaria del handler POST /api/participants.
//
// La ruta hace `new ParticipantService()` en la carga del módulo, así que la fábrica
// devuelve un constructor mockeado que entrega SIEMPRE el mismo objeto de métodos
// (compartido con el singleton `participantService`), de modo que las llamadas hechas
// vía la instancia se pueden configurar y verificar desde el test.
jest.mock('@/services/participantService', () => {
  const svc = {
    createParticipant: jest.fn(),
    getParticipant: jest.fn(),
    updateParticipant: jest.fn(),
    deleteParticipant: jest.fn(),
    revertToPreloaded: jest.fn(),
    setGuestDates: jest.fn(),
  };
  return {
    ParticipantService: jest.fn(() => svc),
    participantService: svc,
  };
});

// withAuth verifica el token con verifyAccessToken (se neutraliza) y contrasta el
// usuario contra la BD (User, globalmente mockeado en jest.setup.js).
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { POST } from '../route';
import { participantService } from '@/services/participantService';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const svc = participantService as unknown as { createParticipant: jest.Mock };

const makeRequest = (body: any, withToken = true) =>
  new Request('http://localhost/api/participants', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

describe('POST /api/participants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('crea un participante y responde 201 (autor tomado del token, no del body)', async () => {
    const created = { id: 'p1', firstName: 'Ana' };
    svc.createParticipant.mockResolvedValue(created);

    const response = await (POST as any)(makeRequest({ firstName: 'Ana', lastName: 'Perez', email: 'ana@x.com', userId: 'evil' }), { params: {} });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual(created);
    // El userId del body se descarta; el autor es request.user.id ('u1').
    expect(svc.createParticipant).toHaveBeenCalledWith(
      { firstName: 'Ana', lastName: 'Perez', email: 'ana@x.com' },
      'u1'
    );
  });

  it('propaga el statusCode del error del servicio (409)', async () => {
    const err: any = new Error('El documento ya existe');
    err.statusCode = 409;
    svc.createParticipant.mockRejectedValue(err);

    const response = await (POST as any)(makeRequest({ firstName: 'Ana' }), { params: {} });
    const body = await response.json();

    expect(response.status).toBe(409);
    expect(body).toEqual({ message: 'El documento ya existe' });
  });

  it('usa 500 cuando el error no trae statusCode', async () => {
    svc.createParticipant.mockRejectedValue(new Error('boom'));

    const response = await (POST as any)(makeRequest({ firstName: 'Ana' }), { params: {} });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.message).toBe('boom');
  });

  it('responde 401 sin token', async () => {
    const response = await (POST as any)(makeRequest({ firstName: 'Ana' }, false), { params: {} });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized: No token provided' });
    expect(svc.createParticipant).not.toHaveBeenCalled();
  });

  it('responde 403 si el rol de la BD no está permitido (MANAGER)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

    const response = await (POST as any)(makeRequest({ firstName: 'Ana' }), { params: {} });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(svc.createParticipant).not.toHaveBeenCalled();
  });
});
