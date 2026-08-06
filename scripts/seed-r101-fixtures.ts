import 'dotenv/config';
import { sequelize } from '../src/lib/sequelize';
import { User, Event, EventSchedule, Participant, Guest } from '../src/models';

// Fixtures para la verificación W3 de R1-01 (plan 01, fase 1).
// SOLO INSERTA. No borra ni recrea nada: cada ejecución crea eventos nuevos con
// sufijo de tiempo, así que se puede correr las veces que haga falta.
const run = async () => {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { role: 'ADMIN', isActive: true } });
    if (!admin) throw new Error('No hay ADMIN activo.');

    const stamp = Date.now().toString(36);
    const now = new Date();
    const mkEvent = async (key: string, opts: any) => {
      const ev = await Event.create({
        name: `R101 ${key} ${stamp}`,
        maxCapacity: 100,
        isActive: true,
        createdBy: admin.id,
        publicSlug: `r101-${key}-${stamp}`,
        publicTemplate: 'default',
        isPublic: true,
        registrationOpen: true,
        allowMultipleSchedules: false,
        ...opts,
      } as any);
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
      return { ev, sch };
    };

    const mkParticipant = async (eventId: string, p: any) =>
      Participant.create({
        eventId,
        createdBy: admin.id,
        registrationSource: 'MANUAL',
        isNew: false,
        dietaryPreference: 'NONE',
        ...p,
      } as any);

    const out: any = { stamp };

    // 1. Evento con cupo 0 almacenado (lo que producía la app ANTES del arreglo),
    //    modo rut, allowGuests = true. Participante precargado sin cargas.
    {
      const { ev, sch } = await mkEvent('cap0', {
        allowGuests: true,
        maxGuestsPerParticipant: 0,
        registrationConfig: { mode: 'rut' },
      });
      const p = await mkParticipant(ev.id, {
        firstName: 'Cero', lastName: 'Cupo', email: 'cero.cupo@example.com',
        documentNumber: '10.000.000-1', allowedGuests: 0,
      });
      out.cap0 = { slug: (ev as any).publicSlug, eventId: ev.id, scheduleId: sch.id, participantId: p.id };
    }

    // 2. Evento con cupo 2, participante con 2 CARGAS PRECARGADAS por el organizador.
    //    Debe poder añadir además su acompañante (D1.2).
    {
      const { ev, sch } = await mkEvent('cargas', {
        allowGuests: true,
        maxGuestsPerParticipant: 2,
        registrationConfig: { mode: 'rut' },
      });
      const p = await mkParticipant(ev.id, {
        firstName: 'Con', lastName: 'Cargas', email: 'con.cargas@example.com',
        documentNumber: '20.000.000-2', allowedGuests: 2,
      });
      const g1 = await Guest.create({ participantId: p.id, firstName: 'Carga', lastName: 'Uno', registrationSource: 'MANUAL', confirmed: false } as any);
      const g2 = await Guest.create({ participantId: p.id, firstName: 'Carga', lastName: 'Dos', registrationSource: 'IMPORT', confirmed: false } as any);
      out.cargas = { slug: (ev as any).publicSlug, eventId: ev.id, scheduleId: sch.id, participantId: p.id, guestIds: [g1.id, g2.id] };
    }

    // 3. Evento con allowGuests = false. No debe crear ningún invitado.
    {
      const { ev, sch } = await mkEvent('noguests', {
        allowGuests: false,
        maxGuestsPerParticipant: 2,
        registrationConfig: { mode: 'rut' },
      });
      const p = await mkParticipant(ev.id, {
        firstName: 'Sin', lastName: 'Invitados', email: 'sin.invitados@example.com',
        documentNumber: '30.000.000-3', allowedGuests: 2,
      });
      out.noguests = { slug: (ev as any).publicSlug, eventId: ev.id, scheduleId: sch.id, participantId: p.id };
    }

    // 4. Evento en modo abierto (registrationConfig sin mode) con cupo 2.
    {
      const { ev, sch } = await mkEvent('open', {
        allowGuests: true,
        maxGuestsPerParticipant: 2,
        registrationConfig: {},
      });
      out.open = { slug: (ev as any).publicSlug, eventId: ev.id, scheduleId: sch.id };
    }

    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Fallo:', e);
    process.exit(1);
  }
};

run();
