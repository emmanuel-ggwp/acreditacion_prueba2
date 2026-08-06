import 'dotenv/config';
import { sequelize } from '../src/lib/sequelize';
import { User, Event, EventSchedule, Participant, Guest } from '../src/models';
import { computeRutDv, formatRut } from '../src/utils/validators/rut';

// Fixtures para verificar la MITAD CLIENTE de R1-01: que la landing no ofrezca
// acompañante cuando el cupo es 0. Dos eventos gemelos con plantilla `gala` y modo
// `rut`, idénticos salvo en `maxGuestsPerParticipant` (0 vs 2). Los RUT llevan
// dígito verificador válido porque la landing valida antes de consultar. Solo inserta.
const run = async () => {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { role: 'ADMIN', isActive: true } });
    if (!admin) throw new Error('No hay ADMIN activo.');
    const stamp = Date.now().toString(36);
    const now = new Date();
    const out: any = {};

    let bodySeed = 15000000;
    const nextRut = () => { const b = String(++bodySeed); return formatRut(b + computeRutDv(b)); };

    for (const [key, cap] of [['cupo0', 0], ['cupo2', 2]] as [string, number][]) {
      const ev: any = await Event.create({
        name: `R101 UI ${key} ${stamp}`, maxCapacity: 100, isActive: true,
        allowGuests: true, maxGuestsPerParticipant: cap, createdBy: admin.id,
        publicSlug: `r101-ui-${key}-${stamp}`, publicTemplate: 'gala',
        isPublic: true, registrationOpen: true, allowMultipleSchedules: false,
        registrationConfig: { mode: 'rut' },
      } as any);
      const sch = await EventSchedule.create({
        eventId: ev.id, scheduleName: 'Jornada Única',
        startDateTime: new Date(now.getTime() - 30 * 60000),
        endDateTime: new Date(now.getTime() + 3 * 3600000),
        maxCapacity: 100, location: 'Salón', isActive: true, status: 'accrediting',
      } as any);
      const rut = nextRut();
      const p: any = await Participant.create({
        eventId: ev.id, firstName: 'Landing', lastName: key.toUpperCase(),
        email: `landing.${key}.${stamp}@example.com`, documentNumber: rut,
        dietaryPreference: 'NONE', allowedGuests: 0,
        createdBy: admin.id, registrationSource: 'MANUAL', isNew: false,
      } as any);
      // Una carga precargada por el organizador, para ver que se muestra y no
      // consume el cupo del asistente.
      await Guest.create({ participantId: p.id, firstName: 'Carga', lastName: 'Organizador', registrationSource: 'IMPORT', confirmed: false } as any);
      out[key] = { slug: ev.publicSlug, rut, participantId: p.id, scheduleId: sch.id, cap };
    }
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Fallo:', e);
    process.exit(1);
  }
};

run();
