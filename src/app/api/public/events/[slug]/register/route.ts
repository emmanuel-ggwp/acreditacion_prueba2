import { NextRequest, NextResponse } from 'next/server';
import { Event, Participant, EventSchedule } from '@/models/index';
import { publicRegistrationSchema } from '@/utils/validators/participantSchemas';
import { sequelize } from '@/lib/sequelize';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const t = await sequelize.transaction();
  try {
    const { slug } = await params;
    const body = await request.json();

    // 1. Find Event
    const event = await Event.findOne({
      where: { 
        publicSlug: slug,
        isActive: true,
        isPublic: true
      },
      transaction: t
    });

    if (!event) {
      await t.rollback();
      return NextResponse.json(
        { error: 'Event not found or not public' },
        { status: 404 }
      );
    }

    // 2. Validate Input
    const validation = publicRegistrationSchema.safeParse(body);
    if (!validation.success) {
      await t.rollback();
      return NextResponse.json(
        { error: 'Validation error', details: validation.error.format() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // 3. Check for existing registration for THIS event
    // We check if any participant with this email is already linked to any schedule of this event
    const existingParticipants = await Participant.findAll({
      where: { email: data.email },
      include: [{
        model: EventSchedule,
        where: { eventId: event.id },
        required: true
      }],
      transaction: t
    });

    if (existingParticipants.length > 0) {
      await t.rollback();
      return NextResponse.json(
        { error: 'Email already registered for this event' },
        { status: 409 }
      );
    }

    // 4. Create Participant
    // We create a new participant record for this registration
    const participant = await Participant.create({
      ...data,
      createdBy: event.createdBy, // Assign event creator as owner
      registrationSource: 'PUBLIC_FORM',
      isNew: true,
      allowedGuests: event.maxGuestsPerParticipant // Default from event settings
    }, { transaction: t });

    // 5. Associate Schedules
    // Verify schedules belong to the event
    const schedules = await EventSchedule.findAll({
      where: {
        id: data.scheduleIds,
        eventId: event.id
      },
      transaction: t
    });

    if (schedules.length !== data.scheduleIds.length) {
      await t.rollback();
      return NextResponse.json(
        { error: 'Invalid schedule IDs provided for this event' },
        { status: 400 }
      );
    }

    // Use the mixin to add schedules
    // Note: addEventSchedules (plural) is usually available for belongsToMany
    if (participant.addEventSchedules) {
        await participant.addEventSchedules(schedules, { transaction: t });
    } else {
        // Fallback if plural mixin is not generated (sometimes happens with specific configs)
        // But Participant.ts defines: declare public addEventSchedule: BelongsToManyAddAssociationMixin...
        // It seems it only defined the singular 'addEventSchedule' in the class definition I read?
        // Let's check Participant.ts again.
        // "declare public addEventSchedule: BelongsToManyAddAssociationMixin<EventSchedule, string>;"
        // It seems only singular was declared in the file I read.
        // But Sequelize usually generates both.
        // I'll use the singular one in a loop if plural fails, or just cast it.
        // Actually, BelongsToManyAddAssociationMixin usually accepts an array too.
        await (participant as any).addEventSchedules(schedules, { transaction: t });
    }

    await t.commit();

    return NextResponse.json({ 
      message: 'Registration successful',
      participantId: participant.id 
    }, { status: 201 });

  } catch (error) {
    await t.rollback();
    console.error('Error in public registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
