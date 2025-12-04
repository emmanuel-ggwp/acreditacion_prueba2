
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { createEventSchema, eventFilterSchema } from '@/utils/validators/eventSchemas';
import { eventService } from '@/services/eventService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const validatedData = createEventSchema.parse(body);
    const event = await eventService.createEvent(validatedData, req.user.id);
    return NextResponse.json(event, { status: 201 });
  } catch (error: any) {
    console.error('Error creating event:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error creating event', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const filters = Object.fromEntries(searchParams.entries());
    const validatedFilters = eventFilterSchema.parse(filters);
    
    const events = await eventService.getAllEvents(validatedFilters);
    return NextResponse.json(events);
  } catch (error: any) {
    console.error('Error fetching events:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error fetching events', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);
