import { NextRequest, NextResponse } from 'next/server';
import { Event, Participant, EventSchedule, Guest } from '@/models/index';
import { publicRegistrationSchema } from '@/utils/validators/participantSchemas';
import { sequelize } from '@/lib/sequelize';
import { Op, fn, col, where as sqlWhere } from 'sequelize';
import { getScheduleParticipantCount, getEventParticipantCount } from '@/services/capacityService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t = await sequelize.transaction();
  try {
    const { slug } = await params;
    const body = await request.json();

    // 1. Buscar evento
    const event = await Event.findOne({
      where: { publicSlug: slug, isActive: true, isPublic: true },
      transaction: t,
    });
    if (!event) {
      await t.rollback();
      return NextResponse.json({ error: 'Event not found or not public' }, { status: 404 });
    }

    // 1b. Rechazar si la inscripción está cerrada
    if ((event as any).registrationOpen === false) {
      await t.rollback();
      return NextResponse.json(
        { error: 'Las inscripciones para este evento se encuentran cerradas.' },
        { status: 403 }
      );
    }

    const mode = (event as any).registrationConfig?.mode === 'rut' ? 'rut' : 'open';

    // 2. Validar horarios seleccionados
    const scheduleIds: string[] = Array.isArray(body.scheduleIds) ? body.scheduleIds : [];
    if (scheduleIds.length === 0) {
      await t.rollback();
      return NextResponse.json({ error: 'Selecciona una fecha de asistencia.' }, { status: 400 });
    }
    const schedules = await EventSchedule.findAll({
      where: { id: scheduleIds, eventId: event.id },
      transaction: t,
    });
    if (schedules.length !== scheduleIds.length) {
      await t.rollback();
      return NextResponse.json({ error: 'Fecha inválida para este evento.' }, { status: 400 });
    }
    const primaryScheduleId = scheduleIds[0];

    const guestsInput: any[] = Array.isArray(body.guests) ? body.guests : [];

    // 3. Obtener/crear el participante según el modo
    let participant: any;
    let existingScheduleIds: string[] = [];

    if (mode === 'rut') {
      // Confirmar un participante precargado identificado por RUT (lookup previo).
      if (!body.participantId) {
        await t.rollback();
        return NextResponse.json(
          { error: 'Debes identificarte con tu RUT para inscribirte en este evento.' },
          { status: 400 }
        );
      }
      participant = await Participant.findOne({
        where: { id: body.participantId, eventId: event.id },
        transaction: t,
      });
      if (!participant) {
        await t.rollback();
        return NextResponse.json({ error: 'Participante no encontrado.' }, { status: 404 });
      }
      const existing = await (participant as any).getSchedules({ transaction: t });
      existingScheduleIds = existing.map((s: any) => s.id);
    } else {
      // Modo abierto: validar; reutilizar participante por correo o crear uno nuevo.
      const validation = publicRegistrationSchema.safeParse(body);
      if (!validation.success) {
        await t.rollback();
        return NextResponse.json(
          { error: 'Validation error', details: validation.error.format() },
          { status: 400 }
        );
      }
      const data = validation.data;

      // Reutilizar participante SOLO por RUT (normalizado: sin puntos, guión ni espacios),
      // así la misma persona no se duplica aunque use otro correo. El RUT es obligatorio.
      const rawRut = (data as any).documentNumber;
      const normRut = rawRut ? String(rawRut).replace(/[.\-\s]/g, '').toUpperCase() : '';
      let existing: any = null;
      if (normRut) {
        existing = await Participant.findOne({
          where: {
            eventId: event.id,
            [Op.and]: [
              sqlWhere(
                fn('UPPER', fn('REPLACE', fn('REPLACE', fn('REPLACE', col('document_number'), '.', ''), '-', ''), ' ', '')),
                normRut
              ),
            ],
          },
          transaction: t,
        });
      }
      if (existing) {
        participant = existing;
        const sch = await (existing as any).getSchedules({ transaction: t });
        existingScheduleIds = sch.map((s: any) => s.id);
      } else {
        participant = await Participant.create(
          {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: (data as any).phone ?? null,
            documentNumber: (data as any).documentNumber ?? null,
            company: (data as any).company ?? null,
            position: (data as any).position ?? null,
            numeroSap: (data as any).numeroSap ?? null,
            dietaryPreference: (data as any).dietaryPreference ?? 'NONE',
            dietaryComments: (data as any).dietaryComments ?? null,
            eventId: event.id,
            createdBy: event.createdBy,
            registrationSource: 'PUBLIC_FORM',
            isNew: true,
            allowedGuests: event.maxGuestsPerParticipant,
          },
          { transaction: t }
        );
      }
    }

    // 3b. Reglas de "ya inscrito" / varias fechas.
    // Permiso efectivo = el evento lo permite, o el participante tiene el override.
    const effectiveMulti = !!(event as any).allowMultipleSchedules || !!(participant as any).allowMultipleSchedules;
    if (existingScheduleIds.length > 0) {
      if (!effectiveMulti) {
        await t.rollback();
        return NextResponse.json(
          { error: 'Ya estás inscrito en este evento.', code: 'ALREADY_REGISTERED', registeredScheduleIds: existingScheduleIds },
          { status: 409 }
        );
      }
      const dup = scheduleIds.some((id) => existingScheduleIds.includes(id));
      if (dup) {
        await t.rollback();
        return NextResponse.json(
          { error: 'Ya estás inscrito para esa fecha. Elige otra.', code: 'ALREADY_REGISTERED_DATE', registeredScheduleIds: existingScheduleIds },
          { status: 409 }
        );
      }
    }

    // 4. Enlazar solo los horarios nuevos (alias de la asociación: 'schedules')
    const schedulesToAdd = schedules.filter((s: any) => !existingScheduleIds.includes(s.id));

    // Capacidad: respetar el máximo del evento y de cada fecha (cuenta participantes inscritos).
    const eventMax = Number((event as any).maxCapacity) || 0;
    const isNewToEvent = existingScheduleIds.length === 0;
    if (eventMax > 0 && isNewToEvent) {
      const eventCount = await getEventParticipantCount(event.id, t);
      if (eventCount >= eventMax) {
        await t.rollback();
        return NextResponse.json(
          { error: 'La capacidad máxima del evento ha sido alcanzada.', code: 'EVENT_FULL' },
          { status: 409 }
        );
      }
    }
    for (const s of schedulesToAdd) {
      const sMax = Number((s as any).maxCapacity) || 0;
      if (sMax > 0) {
        const sCount = await getScheduleParticipantCount(s.id, t);
        if (sCount >= sMax) {
          await t.rollback();
          return NextResponse.json(
            { error: `La fecha "${(s as any).scheduleName}" alcanzó su capacidad máxima. Elige otra.`, code: 'SCHEDULE_FULL', scheduleId: s.id },
            { status: 409 }
          );
        }
      }
    }

    await (participant as any).addSchedules(schedulesToAdd, { transaction: t });

    // 5. Invitados (cargas/acompañante): individuales, nunca concatenados
    for (const g of guestsInput) {
      if (g.id) {
        // Carga precargada seleccionada → marcar confirmada para esta fecha
        const guest = await Guest.findOne({
          where: { id: g.id, participantId: participant.id },
          transaction: t,
        });
        if (guest) {
          await guest.update({ confirmed: true, scheduleId: primaryScheduleId }, { transaction: t });
        }
      } else if (g.firstName) {
        // Invitado nuevo (ej. acompañante)
        await Guest.create(
          {
            participantId: participant.id,
            firstName: g.firstName,
            lastName: g.lastName ?? null,
            documentNumber: g.documentNumber ?? null,
            guestType: g.guestType ?? null,
            dietaryPreference: g.dietaryPreference ?? null,
            confirmed: true,
            scheduleId: primaryScheduleId,
          },
          { transaction: t }
        );
      }
    }

    await t.commit();
    return NextResponse.json(
      { message: 'Registration successful', participantId: participant.id },
      { status: 201 }
    );
  } catch (error: any) {
    await t.rollback();
    console.error('Error in public registration:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
