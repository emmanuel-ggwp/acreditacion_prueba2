// Ruta PÚBLICA (sin withAuth) pero importa rate-limit (jose/ESM) y capacityService.
// Factory-mock de ambos. Los modelos y @/lib/sequelize están mockeados globalmente
// (jest.setup); aquí se configuran sus retornos.
jest.mock('@/lib/rate-limit', () => ({
  limitPublicRegister: jest.fn().mockResolvedValue(null),
}));
jest.mock('@/services/capacityService', () => ({
  getScheduleParticipantCount: jest.fn().mockResolvedValue(0),
  getEventParticipantCount: jest.fn().mockResolvedValue(0),
}));

import { NextResponse } from 'next/server';
import { POST } from '../route';
import { Event, Participant, EventSchedule, Guest } from '@/models/index';
import { sequelize } from '@/lib/sequelize';
import { limitPublicRegister } from '@/lib/rate-limit';
import { getEventParticipantCount } from '@/services/capacityService';

const EventMock = Event as any;
const ParticipantMock = Participant as any;
const EventScheduleMock = EventSchedule as any;
const GuestMock = Guest as any;
const limitMock = limitPublicRegister as jest.Mock;
const eventCountMock = getEventParticipantCount as jest.Mock;

const SCH = '11111111-1111-4111-a111-111111111111';
const PARTICIPANT_ID = '55555555-5555-4555-a555-555555555555';

let tx: { commit: jest.Mock; rollback: jest.Mock };

const openEvent = (over: Record<string, unknown> = {}) => ({
  id: 'ev1',
  registrationOpen: true,
  registrationConfig: {},
  allowMultipleSchedules: false,
  allowGuests: true,
  maxCapacity: 0,
  maxGuestsPerParticipant: 5,
  createdBy: 'creator',
  ...over,
});

const validOpenBody = (over: Record<string, unknown> = {}) => ({
  firstName: 'John',
  lastName: 'Doe',
  documentNumber: '12345678-9',
  email: 'john@example.com',
  scheduleIds: [SCH],
  ...over,
});

const makeParticipant = (over: Record<string, unknown> = {}) => ({
  id: 'p-new',
  allowedGuests: 5,
  allowMultipleSchedules: false,
  guestCompanion: false,
  guestLoads: 0,
  guestCount: 0,
  update: jest.fn().mockResolvedValue(undefined),
  addSchedules: jest.fn().mockResolvedValue(undefined),
  getSchedules: jest.fn().mockResolvedValue([]),
  ...over,
});

const makeRequest = (body: any, slug = 'my-slug') =>
  new Request(`http://localhost/api/public/events/${slug}/register`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });

const call = (body: any, slug = 'my-slug') =>
  (POST as any)(makeRequest(body, slug) as any, { params: Promise.resolve({ slug }) });

describe('POST /api/public/events/[slug]/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    tx = { commit: jest.fn().mockResolvedValue(undefined), rollback: jest.fn().mockResolvedValue(undefined) };
    (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
    limitMock.mockResolvedValue(null);
    eventCountMock.mockResolvedValue(0);
    GuestMock.count.mockResolvedValue(0);
  });

  it('registra un participante nuevo en modo abierto (201) y hace commit', async () => {
    EventMock.findOne.mockResolvedValue(openEvent());
    EventScheduleMock.findAll.mockResolvedValue([{ id: SCH, maxCapacity: 0, scheduleName: 'S1' }]);
    ParticipantMock.findOne.mockResolvedValue(null); // no hay reutilización por RUT
    const participant = makeParticipant();
    ParticipantMock.create.mockResolvedValue(participant);

    const res = await call(validOpenBody());
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body).toEqual(
      expect.objectContaining({
        message: 'Registration successful',
        participantId: 'p-new',
        guestsCreated: 0,
        guestsSkipped: 0,
        guestCap: 5,
      })
    );
    expect(ParticipantMock.create).toHaveBeenCalled();
    expect(participant.addSchedules).toHaveBeenCalled();
    expect(tx.commit).toHaveBeenCalled();
    expect(tx.rollback).not.toHaveBeenCalled();
  });

  it('devuelve 429 cuando el rate-limit corta (antes de abrir la transacción)', async () => {
    limitMock.mockResolvedValue(NextResponse.json({ error: 'Too many' }, { status: 429 }));

    const res = await call(validOpenBody());

    expect(res.status).toBe(429);
    expect(sequelize.transaction).not.toHaveBeenCalled();
  });

  it('devuelve 404 y rollback si el evento no existe', async () => {
    EventMock.findOne.mockResolvedValue(null);

    const res = await call(validOpenBody());
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'Event not found or not public' });
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('devuelve 403 si las inscripciones están cerradas', async () => {
    EventMock.findOne.mockResolvedValue(openEvent({ registrationOpen: false }));

    const res = await call(validOpenBody());
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/cerradas/i);
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('devuelve 400 con mensaje de fecha cuando falta scheduleIds', async () => {
    EventMock.findOne.mockResolvedValue(openEvent());

    const res = await call(validOpenBody({ scheduleIds: [] }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Selecciona una fecha de asistencia.' });
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('devuelve 400 genérico de validación cuando faltan campos del participante', async () => {
    EventMock.findOne.mockResolvedValue(openEvent());

    // scheduleIds válido, pero sin firstName/lastName/documentNumber.
    const res = await call({ scheduleIds: [SCH] });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('Validation error');
    expect(body.details).toBeDefined();
  });

  it('devuelve 400 si el horario no pertenece al evento', async () => {
    EventMock.findOne.mockResolvedValue(openEvent());
    EventScheduleMock.findAll.mockResolvedValue([]); // no hay coincidencia

    const res = await call(validOpenBody());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body).toEqual({ error: 'Fecha inválida para este evento.' });
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('devuelve 409 EVENT_FULL cuando se alcanzó la capacidad del evento', async () => {
    EventMock.findOne.mockResolvedValue(openEvent({ maxCapacity: 1 }));
    EventScheduleMock.findAll.mockResolvedValue([{ id: SCH, maxCapacity: 0, scheduleName: 'S1' }]);
    ParticipantMock.findOne.mockResolvedValue(null);
    ParticipantMock.create.mockResolvedValue(makeParticipant());
    eventCountMock.mockResolvedValue(1);

    const res = await call(validOpenBody());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('EVENT_FULL');
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('devuelve 409 ALREADY_REGISTERED si ya está inscrito y el evento no admite varias fechas', async () => {
    EventMock.findOne.mockResolvedValue(openEvent());
    EventScheduleMock.findAll.mockResolvedValue([{ id: SCH, maxCapacity: 0, scheduleName: 'S1' }]);
    const existing = makeParticipant({
      id: 'p-existing',
      getSchedules: jest.fn().mockResolvedValue([{ id: 'otra-fecha' }]),
    });
    ParticipantMock.findOne.mockResolvedValue(existing);

    const res = await call(validOpenBody());
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.code).toBe('ALREADY_REGISTERED');
    expect(body.registeredScheduleIds).toEqual(['otra-fecha']);
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('modo rut: devuelve 404 si el participante precargado no existe', async () => {
    EventMock.findOne.mockResolvedValue(openEvent({ registrationConfig: { mode: 'rut' } }));
    EventScheduleMock.findAll.mockResolvedValue([{ id: SCH, maxCapacity: 0, scheduleName: 'S1' }]);
    ParticipantMock.findOne.mockResolvedValue(null);

    const res = await call({ participantId: PARTICIPANT_ID, scheduleIds: [SCH] });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'Participante no encontrado.' });
    expect(tx.rollback).toHaveBeenCalled();
  });

  it('devuelve 500 y rollback si una consulta lanza', async () => {
    EventMock.findOne.mockRejectedValue(new Error('db down'));

    const res = await call(validOpenBody());
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });
    expect(tx.rollback).toHaveBeenCalled();
  });
});
