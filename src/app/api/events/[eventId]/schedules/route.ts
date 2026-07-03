
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { createScheduleSchema } from '@/utils/validators/eventSchemas';
import { eventScheduleService } from '@/services/eventScheduleService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: Promise<{ eventId: string }>;
}

export const POST = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const resolvedParams = await params;

    const { eventId } = resolvedParams;
    const body = await req.json();
    const validatedData = createScheduleSchema.parse(body);
    const schedule = await eventScheduleService.createSchedule(eventId, validatedData, req.user?.id);
    return NextResponse.json(schedule, { status: 201 });
  } catch (error: any) {
    console.error(`Error adding schedule to event:`, error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: error.message || 'Error adding schedule' }, { status: 400 });
  }
}, [ADMIN, OPERATOR]);

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const resolvedParams = await params;

    const { eventId } = resolvedParams;
    const schedules = await eventScheduleService.getSchedulesByEvent(eventId);
    return NextResponse.json(schedules);
  } catch (error: any) {
    // Note: params might not be available here if the error occurred before awaiting it
    console.error(`Error fetching schedules for event:`, error);
    return NextResponse.json({ message: 'Error fetching schedules', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);
