import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { Event, Participant, Guest, EventSchedule, GuestSchedule } from '@/models/index';
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
    // El lookup por RUT SOLO aplica al flujo modo "rut" (padrón precargado). En modo
    // abierto no existe esa puerta: se responde 404 para que el RUT no sea enumerable
    // ni sirva para cosechar PII del padrón en un evento donde nunca debió consultarse.
    // El cliente solo llama a este endpoint en modo "rut", así que no rompe la landing.
    if ((event as any).registrationConfig?.mode !== 'rut') {
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

    // Invitados YA confirmados en cada fecha inscrita (para mostrar en modo solo lectura las
    // fechas bloqueadas). Solo nombres, que ya se exponen en `guests`; nada de PII nueva.
    const registeredGuestsBySchedule: Record<string, string[]> = {};
    if (registeredScheduleIds.length && (p.guests || []).length) {
      const nameById = new Map<string, string>(
        (p.guests || []).map((g: any) => [g.id, `${g.firstName} ${g.lastName || ''}`.trim()])
      );
      const links = await GuestSchedule.findAll({
        where: { guestId: { [Op.in]: Array.from(nameById.keys()) }, scheduleId: { [Op.in]: registeredScheduleIds } },
      });
      for (const l of links as any[]) {
        const nm = nameById.get(l.guestId);
        if (!nm) continue;
        (registeredGuestsBySchedule[l.scheduleId] ||= []).push(nm);
      }
    }

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
      registeredGuestsBySchedule,
      participant: participantOut,
      // Pool de cargas que se OFRECE para marcar en cada fecha: solo las precargadas por
      // el organizador (IMPORT) o agregadas por admin (MANUAL). Se excluyen las que el
      // propio asistente agregó en inscripciones previas (PUBLIC_FORM), que son propias de
      // una fecha y ya se ven en el detalle de esa fecha (registeredGuestsBySchedule).
      // No se expone el RUT (PII); las cargas se muestran por nombre y se confirman por id.
      guests: (p.guests || [])
        .filter((g: any) => g.registrationSource !== 'PUBLIC_FORM')
        .map((g: any) => ({
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
