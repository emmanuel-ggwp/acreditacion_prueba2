jest.mock('@/lib/rate-limit', () => ({ limitPublicRegister: jest.fn().mockResolvedValue(null) }));
jest.mock('@/services/capacityService', () => ({ getScheduleParticipantCount: jest.fn().mockResolvedValue(0), getEventParticipantCount: jest.fn().mockResolvedValue(0) }));
import { POST } from '../route';
import { Event, Participant, EventSchedule, Guest } from '@/models/index';
import { sequelize } from '@/lib/sequelize';
import { CENTINELA_EVENT_ID as EID, CENTINELA_COMPANION_KEY as KEY, centinelaCompanionAnswer } from '@/utils/centinelaCompanion';
const SID = '11111111-1111-4111-a111-111111111111';
const PID = '55555555-5555-4555-a555-555555555555';
const SID2 = '22222222-2222-4222-a222-222222222222';
const answer = (enabled: any) => ({ [KEY]: { label: 'Texto antiguo de la pregunta', enabled } });
const body = (extra = {}) => ({ firstName: 'Persona', lastName: 'Prueba', email: 'test@example.com', documentNumber: '12345678-9', scheduleIds: [SID], ...extra });
const call = (data: any) => POST(new Request('http://localhost/register', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } }) as any, { params: Promise.resolve({ slug: 'navidadcentinela2026' }) });
describe('Centinela: pregunta de acompañante y registro público', () => {
  let tx: any, person: any, event: any;
  beforeEach(() => {
    jest.clearAllMocks();
    tx = { commit: jest.fn(), rollback: jest.fn(), LOCK: { UPDATE: 'UPDATE' } };
    (sequelize.transaction as jest.Mock).mockResolvedValue(tx);
    event = { id: EID, registrationOpen: true, allowMultipleSchedules: false, allowGuests: false, maxCapacity: 0, maxGuestsPerParticipant: 0, createdBy: 'creator', registrationConfig: {
      mode: 'open', guests: { mode: 'named', max: 0, allowed: false, preloadedOnly: true },
      customQuestions: [{ key: KEY, label: '¿Asiste con acompañante adulto?', active: true, options: [], required: true }],
    } };
    (Event.findOne as jest.Mock).mockImplementation(async () => event);
    (EventSchedule.findAll as jest.Mock).mockResolvedValue([{ id: SID, maxCapacity: 0 }]);
    (Guest.count as jest.Mock).mockResolvedValue(0);
    (Participant.findOne as jest.Mock).mockResolvedValue(null);
    const make = (values: any) => {
      person = { id: PID, allowedGuests: 0, guestCount: 0, guestLoads: 0, guestCompanion: false, ...values,
        getSchedules: jest.fn().mockResolvedValue([]), addSchedules: jest.fn(),
        update: jest.fn().mockImplementation(async (patch: any) => { Object.assign(person, patch); return person; }),
      };
      return person;
    };
    (Participant.create as jest.Mock).mockImplementation(async values => make(values));
  });
  test.each([true, false])('primera inscripción abierta con respuesta %s guarda solo el adulto declarado', async enabled => {
    const response = await call(body({ customData: answer(enabled), guestCount: 99 }));
    expect(response.status).toBe(201);
    expect(person.guestCompanion).toBe(enabled);
    expect(person.guestCount).toBe(enabled ? 1 : 0);
    expect(person.guestLoads).toBe(0);
    expect(Guest.create).not.toHaveBeenCalled();
    expect(tx.commit).toHaveBeenCalled();
  });
  test('el mismo campo no habilita acompañantes en otro evento', async () => {
    event.id = 'otro-evento';
    const response = await call(body({ customData: answer(true) }));
    expect(response.status).toBe(201);
    expect(person.guestCount).toBe(0);
    expect(person.guestCompanion).toBe(false);
  });
  test('inscripción por RUT guarda la respuesta y el adulto sin crear invitados ficticios', async () => {
    event.registrationConfig.mode = 'rut';
    person = { id: PID, customData: {}, guestCount: 0, guestCompanion: false, guestLoads: 0, allowedGuests: 0,
      getSchedules: jest.fn().mockResolvedValue([]), addSchedules: jest.fn(),
      update: jest.fn().mockImplementation(async (patch: any) => { Object.assign(person, patch); return person; }),
    };
    (Participant.findOne as jest.Mock).mockResolvedValue(person);
    const response = await call({ participantId: PID, scheduleIds: [SID], customData: answer(true) });
    expect(response.status).toBe(201);
    expect(person.guestCount).toBe(1);
    expect(person.guestCompanion).toBe(true);
    expect(Guest.create).not.toHaveBeenCalled();
  });
  test('un inscrito que agrega fecha conserva su respuesta y conteos anteriores', async () => {
    event.registrationConfig.mode = 'rut'; event.allowMultipleSchedules = true;
    (EventSchedule.findAll as jest.Mock).mockResolvedValue([{ id: SID2, maxCapacity: 0 }]);
    person = { id: PID, customData: answer(true), guestCount: 1, guestCompanion: true, guestLoads: 0,
      getSchedules: jest.fn().mockResolvedValue([{ id: SID }]), addSchedules: jest.fn(), update: jest.fn(),
    };
    (Participant.findOne as jest.Mock).mockResolvedValue(person);
    const response = await call({ participantId: PID, scheduleIds: [SID2], customData: answer(false) });
    expect(response.status).toBe(201);
    expect(person.update).not.toHaveBeenCalled();
    expect(person.customData[KEY].enabled).toBe(true);
  });
  test('la clave estable funciona con cualquier texto histórico', () => {
    expect(centinelaCompanionAnswer(EID, answer(true))).toBe(true);
    expect(centinelaCompanionAnswer(EID, answer(false))).toBe(false);
    expect(centinelaCompanionAnswer(EID, {})).toBeNull();
    expect(centinelaCompanionAnswer(EID, { otra: { enabled: true } })).toBeNull();
    expect(centinelaCompanionAnswer(EID, answer('false'))).toBeNull();
    expect(centinelaCompanionAnswer(EID, answer('true'))).toBeNull();
  });
});
