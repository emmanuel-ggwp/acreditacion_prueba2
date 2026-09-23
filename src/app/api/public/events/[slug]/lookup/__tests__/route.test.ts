// Ruta PÚBLICA. Factory-mock del rate-limit (jose/ESM) y de rutVariants (pura, se
// neutraliza para no depender de su implementación).
jest.mock('@/lib/rate-limit', () => ({
  limitPublicLookup: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/utils/validators/rut', () => ({
  rutVariants: jest.fn(() => ['12345678-9']),
}));

import { NextResponse } from 'next/server';
import { GET } from '../route';
import { Event, Participant, GuestSchedule } from '@/models/index';
import { limitPublicLookup } from '@/lib/rate-limit';

const EventMock = Event as any;
const ParticipantMock = Participant as any;
const GuestScheduleMock = GuestSchedule as any;
const limitMock = limitPublicLookup as jest.Mock;

const makeRequest = (slug = 'my-slug', rut = '12345678-9') =>
  new Request(`http://localhost/api/public/events/${slug}/lookup?rut=${encodeURIComponent(rut)}`, {
    method: 'GET',
  });

const call = (slug = 'my-slug', rut = '12345678-9') =>
  (GET as any)(makeRequest(slug, rut) as any, { params: Promise.resolve({ slug }) });

describe('GET /api/public/events/[slug]/lookup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    limitMock.mockResolvedValue(null);
  });

  it('devuelve el participante precargado en modo rut (found:true)', async () => {
    EventMock.findOne.mockResolvedValue({
      id: 'ev1',
      registrationConfig: { mode: 'rut' },
      allowMultipleSchedules: true,
    });
    const participant = {
      get: () => ({
        id: 'p1',
        firstName: 'Ana',
        lastName: 'Pérez',
        email: 'ana@example.com',
        phone: '999',
        documentNumber: '12345678-9',
        guestCount: 0,
        guestCompanion: false,
        guestLoads: 0,
        schedules: [{ id: 'sch1' }],
        guests: [
          { id: 'g1', firstName: 'Hijo', lastName: 'Pérez', guestType: 'CARGA', dietaryPreference: null, registrationSource: 'IMPORT' },
        ],
      }),
    };
    ParticipantMock.findOne.mockResolvedValue(participant);
    GuestScheduleMock.findAll.mockResolvedValue([{ guestId: 'g1', scheduleId: 'sch1' }]);

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.found).toBe(true);
    expect(body.allowMultiple).toBe(true);
    expect(body.registeredScheduleIds).toEqual(['sch1']);
    expect(body.participant).toEqual(expect.objectContaining({ id: 'p1', firstName: 'Ana', email: 'ana@example.com' }));
    // La carga precargada (IMPORT) se ofrece; los invitados por fecha ya confirmados salen aparte.
    expect(body.guests).toHaveLength(1);
    expect(body.registeredGuestsBySchedule).toEqual({ sch1: ['Hijo Pérez'] });
  });

  it('devuelve found:false cuando el RUT no está en el padrón', async () => {
    EventMock.findOne.mockResolvedValue({ id: 'ev1', registrationConfig: { mode: 'rut' } });
    ParticipantMock.findOne.mockResolvedValue(null);

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ found: false });
  });

  it('devuelve 429 cuando el rate-limit corta', async () => {
    limitMock.mockResolvedValue(NextResponse.json({ error: 'Too many' }, { status: 429 }));

    const res = await call();

    expect(res.status).toBe(429);
    expect(EventMock.findOne).not.toHaveBeenCalled();
  });

  it('devuelve 404 si el evento no existe o no es público', async () => {
    EventMock.findOne.mockResolvedValue(null);

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'Event not found or not public' });
  });

  it('devuelve 404 si el evento no está en modo rut (no se enumera el padrón)', async () => {
    EventMock.findOne.mockResolvedValue({ id: 'ev1', registrationConfig: { mode: 'open' } });

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'Event not found or not public' });
    expect(ParticipantMock.findOne).not.toHaveBeenCalled();
  });

  it('devuelve 400 si falta el RUT', async () => {
    EventMock.findOne.mockResolvedValue({ id: 'ev1', registrationConfig: { mode: 'rut' } });

    const res = await call('my-slug', '');
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'RUT requerido' });
  });

  it('devuelve 500 si una consulta lanza', async () => {
    EventMock.findOne.mockRejectedValue(new Error('db down'));

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });
  });
});
