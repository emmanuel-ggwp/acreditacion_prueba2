import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { Event, Participant, Guest, EventSchedule } from '@/models/index';
import { rutVariants } from '@/utils/validators/rut';
import { limitPublicLookup } from '@/lib/rate-limit';

// Busca un participante precargado del evento por su RUT (para el flujo modo "rut").
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // Límite estricto por IP: el lookup devuelve datos personales del precargado, así
    // que se frena la enumeración/cosecha de datos por RUT (más estricto que el general).
    const limited = await limitPublicLookup(request);
    if (limited) return limited;

    const { slug } = await params;
    const rut = new URL(request.url).searchParams.get('rut') || '';

    const event = await Event.findOne({
      where: { publicSlug: slug, isActive: true, isPublic: true },
    });
    if (!event) {
      return NextResponse.json({ error: 'Event not found or not public' }, { status: 404 });
    }
    if (!rut.trim()) {
      return NextResponse.json({ error: 'RUT requerido' }, { status: 400 });
    }

    const participant = await Participant.findOne({
      where: { eventId: event.id, documentNumber: { [Op.in]: rutVariants(rut) } },
      include: [
        { model: Guest, as: 'guests' },
        { model: EventSchedule, as: 'schedules', through: { attributes: [] } },
      ],
    });

    if (!participant) {
      return NextResponse.json({ found: false });
    }

    const p: any = participant.get({ plain: true });
    const registeredScheduleIds = (p.schedules || []).map((s: any) => s.id);
    // Permiso efectivo: el evento lo permite, o el participante tiene el override.
    const allowMultiple = !!(event as any).allowMultipleSchedules || !!p.allowMultipleSchedules;
    return NextResponse.json({
      found: true,
      allowMultiple,
      registeredScheduleIds,
      participant: {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        email: p.email,
        phone: p.phone,
        documentNumber: p.documentNumber,
        // Datos precargados por el organizador que también deben autocompletarse.
        company: p.company,
        position: p.position,
        numeroSap: p.numeroSap,
        dietaryPreference: p.dietaryPreference,
        dietaryComments: p.dietaryComments,
        customData: p.customData,
        guestCount: p.guestCount,
        guestCompanion: p.guestCompanion,
        guestLoads: p.guestLoads,
      },
      // No se expone el RUT (documentNumber) de los invitados: es PII y el formulario
      // público no lo usa. Se muestran las cargas por nombre y se confirman por id.
      guests: (p.guests || []).map((g: any) => ({
        id: g.id,
        firstName: g.firstName,
        lastName: g.lastName,
        guestType: g.guestType,
        dietaryPreference: g.dietaryPreference,
      })),
    });
  } catch (error: any) {
    console.error('Error in RUT lookup:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
