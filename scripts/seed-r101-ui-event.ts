import 'dotenv/config';
import { sequelize } from '../src/lib/sequelize';
import { User, Event, EventSchedule, Participant } from '../src/models';

// Completa un evento recién creado DESDE LA INTERFAZ para poder inscribirse en él:
// le pone una fecha, lo publica en modo `rut` y le añade un participante precargado.
// NO toca `maxGuestsPerParticipant` — ese es justo el valor que se está verificando.
// Solo inserta filas nuevas; del evento solo cambia lo necesario para publicarlo.
const run = async () => {
  const nameArg = process.argv[2];
  if (!nameArg) throw new Error('Uso: tsx scripts/seed-r101-ui-event.ts "<nombre del evento>"');
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { role: 'ADMIN', isActive: true } });
    if (!admin) throw new Error('No hay ADMIN activo.');

    const ev: any = await Event.findOne({ where: { name: nameArg } });
    if (!ev) throw new Error(`No existe el evento "${nameArg}"`);

    const stamp = Date.now().toString(36);
    const slug = `r101-ui-${stamp}`;
    await ev.update({ publicSlug: slug, isPublic: true, registrationOpen: true, registrationConfig: { mode: 'rut' } });

    const now = new Date();
    const sch = await EventSchedule.create({
      eventId: ev.id,
      scheduleName: 'Jornada Única',
      startDateTime: new Date(now.getTime() - 30 * 60000),
      endDateTime: new Date(now.getTime() + 3 * 3600000),
      maxCapacity: 100,
      location: 'Salón',
      isActive: true,
      status: 'accrediting',
    } as any);

    const p = await Participant.create({
      eventId: ev.id,
      firstName: 'Uiel', lastName: 'Precargado', email: `uiel.${stamp}@example.com`,
      documentNumber: `9${stamp.slice(-7)}-K`,
      dietaryPreference: 'NONE',
      allowedGuests: 0, // por defecto real del modelo Participant
      createdBy: admin.id, registrationSource: 'MANUAL', isNew: false,
    } as any);

    console.log(JSON.stringify({
      eventId: ev.id, name: ev.name, slug,
      maxGuestsPerParticipant: ev.maxGuestsPerParticipant,
      allowGuests: ev.allowGuests,
      scheduleId: sch.id, participantId: p.id,
    }, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Fallo:', e);
    process.exit(1);
  }
};

run();
