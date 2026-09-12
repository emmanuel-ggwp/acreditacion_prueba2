import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { Event, Participant, Guest, EventSchedule } from '@/models/index';
import { rutVariants } from '@/utils/validators/rut';
import { limitPublicLookup } from '@/lib/rate-limit';
import { getFormFields } from '@/utils/formFields';
import { getCustomQuestions } from '@/utils/customQuestions';

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

    // PII MÍNIMA (F3-02): este endpoint es PÚBLICO y los RUT son enumerables, así que
    // solo se devuelve lo que el formulario de ESTE evento realmente autocompleta.
    // Los campos deshabilitados (por defecto empresa/cargo/SAP/dieta lo están) NO se
    // exponen: nada de datos personales del padrón que el formulario no vaya a usar.
    const ff = getFormFields((event as any).registrationConfig);
    const participantOut: any = {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      // Conteos de invitados (no son PII, hacen falta para el autocompletado numérico).
      guestCount: p.guestCount,
      guestCompanion: p.guestCompanion,
      guestLoads: p.guestLoads,
    };
    if (ff.email.enabled) participantOut.email = p.email;
    if (ff.phone.enabled) participantOut.phone = p.phone;
    if (ff.documentNumber.enabled) participantOut.documentNumber = p.documentNumber;
    if (ff.company.enabled) participantOut.company = p.company;
    if (ff.position.enabled) participantOut.position = p.position;
    if (ff.numeroSap.enabled) participantOut.numeroSap = p.numeroSap;
    if (ff.dietary.enabled) {
      participantOut.dietaryPreference = p.dietaryPreference;
      participantOut.dietaryComments = p.dietaryComments;
    }
    // customData solo si el evento tiene preguntas configurables.
    if (getCustomQuestions((event as any).registrationConfig).length) {
      participantOut.customData = p.customData;
    }

    return NextResponse.json({
      found: true,
      allowMultiple,
      registeredScheduleIds,
      participant: participantOut,
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
