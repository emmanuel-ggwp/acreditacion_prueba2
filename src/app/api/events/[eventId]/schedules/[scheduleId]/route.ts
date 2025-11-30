
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { updateScheduleSchema } from '@/utils/validators/eventSchemas';
import { eventScheduleService } from '@/services/eventScheduleService';
import { AuthenticatedRequest } from '@/types/auth';

interface Params {
  params: { eventId: string; scheduleId: string };
}

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const scheduleId = params.scheduleId;
    if (!scheduleId?.length) {
      return NextResponse.json({ message: 'Invalid schedule ID' }, { status: 400 });
    }
    const body = await req.json();
    const validatedData = updateScheduleSchema.parse(body);
    const updatedSchedule = await eventScheduleService.updateSchedule(scheduleId, validatedData);
    return NextResponse.json(updatedSchedule);
  } catch (error: any) {
    console.error(`Error updating schedule ${params.scheduleId}:`, error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error updating schedule', error: error.message }, { status: 500 });
  }
}, ['admin', 'organizer']);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const scheduleId = params.scheduleId;
    if (!scheduleId?.length) {
      return NextResponse.json({ message: 'Invalid schedule ID' }, { status: 400 });
    }
    await eventScheduleService.deleteSchedule(scheduleId);
    return NextResponse.json({ message: 'Schedule deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error(`Error deleting schedule ${params.scheduleId}:`, error);
    return NextResponse.json({ message: 'Error deleting schedule', error: error.message }, { status: 500 });
  }
}, ['admin', 'organizer']);
