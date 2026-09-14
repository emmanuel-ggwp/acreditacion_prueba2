import { NextRequest, NextResponse } from 'next/server';
import { Event, EventSchedule } from '@/models/index';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const event = await Event.findOne({
      where: {
        publicSlug: slug,
        isActive: true,
        isPublic: true
      },
      // La asociación se declara como `Event.hasMany(EventSchedule, { as: 'schedules' })`
      // (ver EventSchedule.ts). Sin el `as`, Sequelize lanza EagerLoadingError y el
      // endpoint respondía siempre 500. `required: false` para no descartar eventos sin
      // fechas. Se ordenan cronológicamente, igual que la landing (page.tsx).
      include: [
        {
          model: EventSchedule,
          as: 'schedules',
          required: false,
        }
      ],
      order: [[{ model: EventSchedule, as: 'schedules' }, 'startDateTime', 'ASC']],
      attributes: ['id', 'name', 'description', 'location', 'registrationConfig', 'allowGuests', 'registrationOpen', 'allowMultipleSchedules', 'publicTemplate', 'logoUrl', 'backgroundImageUrl'],
    });

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found or not public' },
        { status: 404 }
      );
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error fetching public event:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
