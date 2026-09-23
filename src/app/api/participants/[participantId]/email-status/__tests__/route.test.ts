// Prueba unitaria de PATCH /api/participants/[participantId]/email-status.
// El handler usa el modelo Participant directamente (globalmente mockeado en jest.setup.js).
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { PATCH } from '../route';
import { Participant } from '@/models/index';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const PID = '11111111-1111-4111-8111-111111111111';

const makeRequest = (body: any, withToken = true) =>
  new Request(`http://localhost/api/participants/${PID}/email-status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...(withToken ? { Authorization: 'Bearer x' } : {}),
    },
  });

const ctx = { params: Promise.resolve({ participantId: PID }) };

describe('PATCH /api/participants/[participantId]/email-status', () => {
  let updateSpy: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
    updateSpy = jest.fn().mockResolvedValue(undefined);
    (Participant.findByPk as jest.Mock).mockResolvedValue({ id: PID, update: updateSpy });
  });

  it('marca el correo como enviado (ok:true → sent)', async () => {
    const response = await (PATCH as any)(makeRequest({ ok: true }), ctx);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, emailStatus: 'sent' });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ emailStatus: 'sent', emailError: null })
    );
  });

  it('marca omitido (ok:false, skipped:true → skipped)', async () => {
    const response = await (PATCH as any)(makeRequest({ ok: false, skipped: true }), ctx);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, emailStatus: 'skipped' });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ emailStatus: 'skipped', emailError: null })
    );
  });

  it('marca fallo y guarda el mensaje de error (ok:false → failed)', async () => {
    const response = await (PATCH as any)(makeRequest({ ok: false, error: 'SMTP caido' }), ctx);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, emailStatus: 'failed' });
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ emailStatus: 'failed', emailError: 'SMTP caido' })
    );
  });

  it('responde 404 si el participante no existe', async () => {
    (Participant.findByPk as jest.Mock).mockResolvedValue(null);

    const response = await (PATCH as any)(makeRequest({ ok: true }), ctx);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({ message: 'Participant not found' });
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('responde 400 con datos inválidos (ok no booleano)', async () => {
    const response = await (PATCH as any)(makeRequest({ ok: 'yes' }), ctx);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ message: 'Datos inválidos' });
    expect(Participant.findByPk).not.toHaveBeenCalled();
  });

  it('responde 500 si el update lanza', async () => {
    updateSpy.mockRejectedValue(new Error('fallo BD'));

    const response = await (PATCH as any)(makeRequest({ ok: true }), ctx);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ message: 'fallo BD' });
  });

  it('responde 403 si el rol no está permitido (MANAGER)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'MANAGER' });

    const response = await (PATCH as any)(makeRequest({ ok: true }), ctx);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
  });

  it('responde 401 sin token', async () => {
    const response = await (PATCH as any)(makeRequest({ ok: true }, false), ctx);
    expect(response.status).toBe(401);
  });
});
