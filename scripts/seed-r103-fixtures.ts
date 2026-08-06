import 'dotenv/config';
import { sequelize } from '../src/lib/sequelize';
import { User, Event, EventSchedule, Participant } from '../src/models';
import { computeRutDv, formatRut } from '../src/utils/validators/rut';

// Fixtures W3 de R1-03 (plan 01, fase 3): topes de longitud que rechazaban datos
// legítimos con 400, y uno que dejaba pasar datos hasta el 500.
//
// Evento en modo `rut` con dieta pedida al participante Y a cada invitado, y tres
// participantes precargados:
//   - `alergia`  : para mandar una alergia de 200 caracteres (participante e invitado).
//   - `comentario`: para mandar un comentario de dieta de 300 (debe dar 400, nunca 500).
//   - `preflarga`: su `dietaryPreference` YA GUARDADA mide más de 60 caracteres, que es
//     lo que lo dejaba bloqueado de forma permanente.
// Solo INSERTA.
const run = async () => {
  try {
    await sequelize.authenticate();
    const admin = await User.findOne({ where: { role: 'ADMIN', isActive: true } });
    if (!admin) throw new Error('No hay ADMIN activo.');
    const stamp = Date.now().toString(36);
    const now = new Date();

    // Opción de dieta personalizada MUY larga: 84 caracteres. Es legítima — el
    // administrador la escribe en la configuración del evento — y el valor guardado
    // en el participante ES la etiqueta.
    const PREF_LARGA = 'Alergia severa a frutos secos, mariscos, lacteos y derivados del huevo (confirmada)';

    const ev: any = await Event.create({
      name: `R103 dietas ${stamp}`, maxCapacity: 100, isActive: true,
      allowGuests: true, maxGuestsPerParticipant: 2, createdBy: admin.id,
      publicSlug: `r103-${stamp}`, publicTemplate: 'default',
      isPublic: true, registrationOpen: true, allowMultipleSchedules: false,
      registrationConfig: {
        mode: 'rut',
        formFields: { dietary: { enabled: true, required: false } },
        dietaryOptions: ['Alergia', 'Vegetariano', PREF_LARGA],
        guests: { allowed: true, max: 2, mode: 'named', dietary: true },
      },
    } as any);

    const sch: any = await EventSchedule.create({
      eventId: ev.id, scheduleName: 'Jornada Única',
      startDateTime: new Date(now.getTime() - 30 * 60000),
      endDateTime: new Date(now.getTime() + 3 * 3600000),
      maxCapacity: 100, location: 'Salón', isActive: true, status: 'accrediting',
    } as any);

    let bodySeed = 31000000;
    const nextRut = () => { const b = String(++bodySeed); return formatRut(b + computeRutDv(b)); };

    const mk = async (key: string, extra: any = {}) => {
      const rut = nextRut();
      const p: any = await Participant.create({
        eventId: ev.id, firstName: 'Dieta', lastName: key,
        email: `dieta.${key}.${stamp}@example.com`, documentNumber: rut,
        dietaryPreference: 'NONE', allowedGuests: 2,
        createdBy: admin.id, registrationSource: 'MANUAL', isNew: false,
        ...extra,
      } as any);
      return { id: p.id, rut };
    };

    const out = {
      slug: ev.publicSlug,
      scheduleId: sch.id,
      prefLarga: PREF_LARGA,
      prefLargaLen: PREF_LARGA.length,
      alergia: await mk('alergia'),
      comentario: await mk('comentario'),
      preflarga: await mk('preflarga', { dietaryPreference: PREF_LARGA }),
    };
    console.log(JSON.stringify(out, null, 2));
    process.exit(0);
  } catch (e) {
    console.error('Fallo:', e);
    process.exit(1);
  }
};

run();
