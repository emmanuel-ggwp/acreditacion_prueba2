import 'dotenv/config';
import { sequelize } from '../src/lib/sequelize';
import { User, Event, EventSchedule, Participant, ParticipantSchedule, Guest } from '../src/models';
import { computeRutDv, formatRut } from '../src/utils/validators/rut';

// Fixtures W3 de R1-02 (plan 01, fase 2): escrituras sobre participantes YA INSCRITOS.
// Evento multi-fecha (`allowMultipleSchedules`) con DOS fechas, y dos participantes:
//
//  - `yaInscrito`: inscrito en la fecha 1, con `guestCount = 5` y `guestLoads = 5`
//    puestos a mano por el organizador y dos cargas ancladas a la fecha 1. Es la
//    víctima: inscribirlo a la fecha 2 no debe tocarle NADA.
//  - `noInscrito`: precargado sin inscribir. Es el camino legítimo, que debe seguir vivo.
//
// Solo INSERTA: crea un evento nuevo con sufijo de tiempo en cada ejecución.
const run = async () => {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { role: 'ADMIN', isActive: true } });
    if (!admin) throw new Error('No hay ADMIN activo.');
    const stamp = Date.now().toString(36);
    const now = new Date();

    const ev: any = await Event.create({
      name: `R102 multifecha ${stamp}`, maxCapacity: 100, isActive: true,
      allowGuests: true, maxGuestsPerParticipant: 2, createdBy: admin.id,
      publicSlug: `r102-${stamp}`, publicTemplate: 'default',
      isPublic: true, registrationOpen: true,
      allowMultipleSchedules: true, // la condición que abre las dos escrituras
      registrationConfig: { mode: 'rut' },
    } as any);

    const mkSchedule = (n: number) => EventSchedule.create({
      eventId: ev.id, scheduleName: `Fecha ${n}`,
      startDateTime: new Date(now.getTime() - 30 * 60000 + n * 60000),
      endDateTime: new Date(now.getTime() + 3 * 3600000),
      maxCapacity: 100, location: 'Salón', isActive: true, status: 'accrediting',
    } as any);
    const s1: any = await mkSchedule(1);
    const s2: any = await mkSchedule(2);

    let bodySeed = 21000000;
    const nextRut = () => { const b = String(++bodySeed); return formatRut(b + computeRutDv(b)); };

    // Víctima: ya inscrita en la fecha 1, con datos puestos por el organizador.
    const rutV = nextRut();
    const victima: any = await Participant.create({
      eventId: ev.id, firstName: 'Ya', lastName: 'Inscrito',
      email: `ya.inscrito.${stamp}@example.com`, documentNumber: rutV,
      dietaryPreference: 'NONE', dietaryComments: 'Sin gluten, puesto por el organizador',
      allowedGuests: 2,
      guestCount: 5, guestLoads: 5, guestCompanion: true, // valores > cupo, a propósito
      createdBy: admin.id, registrationSource: 'MANUAL', isNew: false,
    } as any);
    await ParticipantSchedule.create({ participantId: victima.id, scheduleId: s1.id, attended: false, attendedAt: null } as any);
    const c1: any = await Guest.create({ participantId: victima.id, firstName: 'Carga', lastName: 'Uno', registrationSource: 'MANUAL', confirmed: true, scheduleId: s1.id } as any);
    const c2: any = await Guest.create({ participantId: victima.id, firstName: 'Carga', lastName: 'Dos', registrationSource: 'IMPORT', confirmed: true, scheduleId: s1.id } as any);

    // Camino legítimo: precargado SIN inscribir, con una carga.
    const rutL = nextRut();
    const legitimo: any = await Participant.create({
      eventId: ev.id, firstName: 'No', lastName: 'Inscrito',
      email: `no.inscrito.${stamp}@example.com`, documentNumber: rutL,
      dietaryPreference: 'NONE', allowedGuests: 2,
      createdBy: admin.id, registrationSource: 'MANUAL', isNew: false,
    } as any);
    const c3: any = await Guest.create({ participantId: legitimo.id, firstName: 'Carga', lastName: 'Legitima', registrationSource: 'IMPORT', confirmed: false } as any);

    console.log(JSON.stringify({
      slug: ev.publicSlug, schedule1: s1.id, schedule2: s2.id,
      victima: { id: victima.id, rut: rutV, guestIds: [c1.id, c2.id] },
      legitimo: { id: legitimo.id, rut: rutL, guestIds: [c3.id] },
    }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Fallo:', e);
    process.exit(1);
  }
};

run();
