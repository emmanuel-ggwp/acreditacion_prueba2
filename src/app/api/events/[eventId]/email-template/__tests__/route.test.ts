// GET (ADMIN/OPERATOR): resuelve el templateId de EmailJS del evento. Usa los
// modelos Event y EmailTemplate directamente (mock global de jest.setup.js) y la
// función pura getGuestMode (se deja correr).
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET } from '../route';
import { Event, EmailTemplate } from '@/models/index';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const makeRequest = () =>
  new Request('http://localhost/api/events/e1/email-template', {
    method: 'GET',
    headers: { Authorization: 'Bearer x' },
  });

const ctx = (eventId = 'e1') => ({ params: Promise.resolve({ eventId }) });

describe('/api/events/[eventId]/email-template route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('devuelve templateId, nombre, ubicación y guestMode', async () => {
    (Event.findByPk as jest.Mock).mockResolvedValue({
      id: 'e1',
      name: 'Gala',
      location: 'Santiago',
      emailTemplateId: 'tpl-row-1',
      registrationConfig: { guests: { mode: 'count' } },
    });
    (EmailTemplate.findByPk as jest.Mock).mockResolvedValue({ templateId: 'emailjs_abc' });

    const res = await (GET as any)(makeRequest(), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({
      templateId: 'emailjs_abc',
      eventName: 'Gala',
      location: 'Santiago',
      guestMode: 'count',
    });
    expect(Event.findByPk).toHaveBeenCalledWith('e1');
    expect(EmailTemplate.findByPk).toHaveBeenCalledWith('tpl-row-1');
  });

  it('devuelve templateId null cuando el evento no tiene plantilla', async () => {
    (Event.findByPk as jest.Mock).mockResolvedValue({
      id: 'e1',
      name: 'Evento',
      location: null,
      emailTemplateId: null,
      registrationConfig: null,
    });

    const res = await (GET as any)(makeRequest(), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ templateId: null, eventName: 'Evento', location: '', guestMode: 'named' });
    expect(EmailTemplate.findByPk).not.toHaveBeenCalled();
  });

  it('responde 404 si el evento no existe', async () => {
    (Event.findByPk as jest.Mock).mockResolvedValue(null);

    const res = await (GET as any)(makeRequest(), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ message: 'Event not found' });
  });

  it('responde 500 si el modelo lanza', async () => {
    (Event.findByPk as jest.Mock).mockRejectedValue(new Error('db down'));

    const res = await (GET as any)(makeRequest(), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'db down' });
  });

  it('responde 403 si el rol de la BD no está permitido (GUARDIA)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

    const res = await (GET as any)(makeRequest(), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(Event.findByPk).not.toHaveBeenCalled();
  });
});
