import 'dotenv/config';
import { sequelize } from '../src/lib/sequelize';
import { User, Event, EventSchedule, Participant } from '../src/models';

// Fixture del punto 4 del plan: entrada NO numérica en el cálculo del cupo.
// `registrationConfig` es jsonb, así que `guests.max` puede llegar como texto.
// Con `Number('abc') = NaN`, `Math.max(0, NaN)` es NaN y `createdGuests >= NaN` es
// SIEMPRE falso: el tope no se relajaba, DESAPARECÍA. Solo inserta.
const run = async () => {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { role: 'ADMIN', isActive: true } });
    if (!admin) throw new Error('No hay ADMIN activo.');
    const stamp = Date.now().toString(36);
    const ev: any = await Event.create({
      name: `R101 nan ${stamp}`,
      maxCapacity: 500,
      isActive: true,
      allowGuests: true,
      maxGuestsPerParticipant: 2,
      createdBy: admin.id,
      publicSlug: `r101-nan-${stamp}`,
      publicTemplate: 'default',
      isPublic: true,
      registrationOpen: true,
      allowMultipleSchedules: false,
      // El valor corrupto: texto donde se espera un número.
      registrationConfig: { mode: 'rut', guests: { max: 'abc' } },
    } as any);
    const now = new Date();
    const sch = await EventSchedule.create({
      eventId: ev.id, scheduleName: 'Jornada Única',
      startDateTime: new Date(now.getTime() - 30 * 60000),
      endDateTime: new Date(now.getTime() + 3 * 3600000),
      maxCapacity: 500, location: 'Salón', isActive: true, status: 'accrediting',
    } as any);
    const p: any = await Participant.create({
      eventId: ev.id, firstName: 'Nan', lastName: 'Cupo',
      email: `nan.${stamp}@example.com`, documentNumber: `70000000-${stamp}`,
      dietaryPreference: 'NONE', allowedGuests: 0,
      createdBy: admin.id, registrationSource: 'MANUAL', isNew: false,
    } as any);
    console.log(JSON.stringify({ slug: ev.publicSlug, scheduleId: sch.id, participantId: p.id }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Fallo:', e);
    process.exit(1);
  }
};

run();
