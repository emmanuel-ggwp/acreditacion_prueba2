
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { createScheduleSchema } from '@/utils/validators/eventSchemas';
import { eventScheduleService } from '@/services/eventScheduleService';
import { AuthenticatedRequest } from '@/types/auth';

interface Params {
  params: { eventId: string };
}

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { eventId } = params;
    const body = await req.json();
    const validatedData = createScheduleSchema.parse(body);
    const schedule = await eventScheduleService.createSchedule(eventId, validatedData);
    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    console.error(`Error adding schedule to event ${params.eventId}:`, error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error adding schedule', error: error.message }, { status: 500 });
  }
}, ['admin', 'organizer']);

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { eventId } = params;
    const schedules = await eventScheduleService.getSchedulesByEvent(eventId);
    return NextResponse.json(schedules);
  } catch (error: any) {
    console.error(`Error fetching schedules for event ${params.eventId}:`, error);
    return NextResponse.json({ message: 'Error fetching schedules', error: error.message }, { status: 500 });
  }
}, ['admin', 'organizer', 'staff']);
