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
      include: [
        {
          model: EventSchedule,
          // Sequelize default alias for hasMany is the plural of the model name if not specified
          // But since we didn't specify 'as' in the definition, it might be 'EventSchedules'
          // Let's try without 'as' first or use the standard naming convention
        }
      ],
      attributes: ['id', 'name', 'description', 'location', 'registrationConfig', 'allowGuests', 'registrationOpen', 'allowMultipleSchedules', 'logoUrl', 'backgroundImageUrl']
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
