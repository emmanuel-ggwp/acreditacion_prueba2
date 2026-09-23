// Ruta PÚBLICA. Importa rate-limit (jose/ESM) → factory-mock para no cargarlo.
jest.mock('@/lib/rate-limit', () => ({
  limitPublicRegister: jest.fn().mockResolvedValue(null),
}));

import { NextResponse } from 'next/server';
import { POST } from '../route';
import { Event, Participant } from '@/models/index';
import { limitPublicRegister } from '@/lib/rate-limit';

const EventMock = Event as any;
const ParticipantMock = Participant as any;
const limitMock = limitPublicRegister as jest.Mock;

const PART = '55555555-5555-4555-a555-555555555555';

const makeRequest = (body: any, slug = 'my-slug') =>
  new Request(`http://localhost/api/public/events/${slug}/register/email-status`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

const call = (body: any, slug = 'my-slug') =>
  (POST as any)(makeRequest(body, slug) as any, { params: Promise.resolve({ slug }) });

describe('POST /api/public/events/[slug]/register/email-status', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    limitMock.mockResolvedValue(null);
  });

  it('marca el correo como enviado (ok=true) y devuelve 200', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    EventMock.findOne.mockResolvedValue({ id: 'ev1' });
    ParticipantMock.findByPk.mockResolvedValue({ eventId: 'ev1', update });

    const res = await call({ participantId: PART, ok: true });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ emailStatus: 'sent', emailError: null }));
  });

  it('marca el correo como omitido (skipped=true)', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    EventMock.findOne.mockResolvedValue({ id: 'ev1' });
    ParticipantMock.findByPk.mockResolvedValue({ eventId: 'ev1', update });

    const res = await call({ participantId: PART, ok: false, skipped: true });
    await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ emailStatus: 'skipped' }));
  });

  it('marca el correo como fallido (ok=false)', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    EventMock.findOne.mockResolvedValue({ id: 'ev1' });
    ParticipantMock.findByPk.mockResolvedValue({ eventId: 'ev1', update });

    const res = await call({ participantId: PART, ok: false, error: 'SMTP 550' });
    await res.json();

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ emailStatus: 'failed', emailError: 'SMTP 550' }));
  });

  it('devuelve 429 cuando el rate-limit corta', async () => {
    limitMock.mockResolvedValue(NextResponse.json({ error: 'Too many' }, { status: 429 }));

    const res = await call({ participantId: PART, ok: true });

    expect(res.status).toBe(429);
    expect(EventMock.findOne).not.toHaveBeenCalled();
  });

  it('devuelve 400 con cuerpo inválido (participantId no es GUID)', async () => {
    const res = await call({ participantId: 'nope', ok: true });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Datos inválidos' });
  });

  it('devuelve 404 si el evento no existe', async () => {
    EventMock.findOne.mockResolvedValue(null);

    const res = await call({ participantId: PART, ok: true });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'Event not found or not public' });
  });

  it('devuelve 404 si el participante no pertenece al evento', async () => {
    EventMock.findOne.mockResolvedValue({ id: 'ev1' });
    ParticipantMock.findByPk.mockResolvedValue({ eventId: 'OTRO', update: jest.fn() });

    const res = await call({ participantId: PART, ok: true });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'Participant not found' });
  });

  it('devuelve 500 si una consulta lanza', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    EventMock.findOne.mockRejectedValue(new Error('db down'));

    const res = await call({ participantId: PART, ok: true });
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });
  });
});
