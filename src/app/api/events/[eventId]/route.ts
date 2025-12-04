import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { eventService } from '@/services/eventService';
import { updateEventSchema } from '@/utils/validators/eventSchemas';
import { AuthenticatedRequest } from '@/types/auth';
import { z } from 'zod';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: Promise<{ eventId: string }>;
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    console.log('Fetching event with ID:', {params});
    const resolvedParams = await params;
    const eventId = resolvedParams.eventId;
    if (!eventId?.length) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }
    const event = await eventService.getEventById(eventId);
    return NextResponse.json(event);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 404 });
  }
}, [ADMIN, OPERATOR]);

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const resolvedParams = await params;
    const eventId = resolvedParams.eventId;
    if (!eventId?.length) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }
    const body = await req.json();
    const validatedData = updateEventSchema.parse(body);
    const updatedEvent = await eventService.updateEvent(eventId, validatedData);
    return NextResponse.json(updatedEvent);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const resolvedParams = await params;
    const eventId = resolvedParams.eventId;
    if (!eventId?.length) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }
    await eventService.deleteEvent(eventId);
    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}, [ADMIN]);
