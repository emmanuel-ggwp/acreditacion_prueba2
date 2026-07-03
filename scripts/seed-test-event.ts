import { sequelize } from '../src/lib/sequelize';
import { User, Event, EventSchedule, Participant, ParticipantSchedule } from '../src/models';

// Crea UN evento de prueba con una fecha (hoy, en acreditación) y tres participantes.
// Variedad para probar las funciones: uno con alergia, uno premiado, uno normal.
const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('Conexión a la BD establecida.');

    const admin = await User.findOne({ where: { role: 'ADMIN', isActive: true } });
    if (!admin) throw new Error('No hay un usuario ADMIN activo para asignar como creador.');

    const stamp = Date.now().toString(36);
    const slug = `evento-prueba-${stamp}`;

    // Evento
    const event = await Event.create({
      name: 'Evento de Prueba',
      description: 'Evento generado automáticamente para pruebas.',
      location: 'Salón Principal',
      maxCapacity: 100,
      isActive: true,
      allowGuests: true,
      maxGuestsPerParticipant: 2,
      createdBy: admin.id,
      publicSlug: slug,
      publicTemplate: 'default',
      isPublic: true,
      registrationOpen: true,
      allowMultipleSchedules: false,
      registrationConfig: {},
    } as any);
    console.log(`Evento creado: ${event.name} (id ${event.id}, slug /${slug})`);

    // Fecha de hoy, ventana abierta para acreditar ahora.
    const now = new Date();
    const start = new Date(now.getTime() - 30 * 60000); // hace 30 min
    const end = new Date(now.getTime() + 3 * 60 * 60000); // en 3 horas
    const schedule = await EventSchedule.create({
      eventId: event.id,
      scheduleName: 'Jornada Única',
      startDateTime: start,
      endDateTime: end,
      maxCapacity: 100,
      location: 'Salón Principal',
      isActive: true,
      status: 'accrediting',
    } as any);
    console.log(`Fecha creada: ${schedule.scheduleName} (en acreditación).`);

    // Tres participantes con variedad.
    const people = [
      {
        firstName: 'Ana', lastName: 'Torres', email: 'ana.torres@example.com',
        phone: '+56911111111', company: 'TechCorp', position: 'Analista',
        documentNumber: '11.111.111-1', dietaryPreference: 'NONE', dietaryComments: null,
        isAwarded: false, awardReason: null,
      },
      {
        firstName: 'Pedro', lastName: 'Rojas', email: 'pedro.rojas@example.com',
        phone: '+56922222222', company: 'InnovateLtda', position: 'Diseñador',
        documentNumber: '22.222.222-2', dietaryPreference: 'ALERGIA', dietaryComments: 'Maní y mariscos',
        isAwarded: false, awardReason: null,
      },
      {
        firstName: 'Sofía', lastName: 'Díaz', email: 'sofia.diaz@example.com',
        phone: '+56933333333', company: 'GlobalSolutions', position: 'Directora',
        documentNumber: '33.333.333-3', dietaryPreference: 'VEGETARIAN', dietaryComments: null,
        isAwarded: true, awardReason: 'Sorteo aniversario',
      },
    ];

    for (const p of people) {
      const participant = await Participant.create({
        ...p,
        eventId: event.id,
        allowedGuests: 2,
        numeroSap: null,
        registrationSource: 'MANUAL',
        createdBy: admin.id,
        isNew: false,
      } as any);
      await ParticipantSchedule.create({
        participantId: participant.id,
        scheduleId: schedule.id,
        attended: false,
        attendedAt: null,
      } as any);
      console.log(`  + ${p.firstName} ${p.lastName} (${p.documentNumber})${p.isAwarded ? ' [premiado]' : ''}${p.dietaryPreference === 'ALERGIA' ? ' [alergia]' : ''}`);
    }

    console.log('\n✅ Listo. Evento de prueba creado con 3 participantes inscritos en la fecha de hoy.');
    console.log(`   Landing público: /public/events/${slug}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Falló la creación del evento de prueba:', error);
    process.exit(1);
  }
};

run();
