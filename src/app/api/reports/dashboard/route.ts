
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { reportService } from '@/services/reportService';
import { AuthenticatedRequest } from '@/types/auth';
import { z } from 'zod';

const dashboardQuerySchema = z.object({
  eventId: z.string().optional(),
});

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    const { eventId } = dashboardQuerySchema.parse(query);

    let eventIdNum: number | undefined = undefined;
    if (eventId) {
      eventIdNum = parseInt(eventId, 10);
      if (isNaN(eventIdNum)) {
        return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
      }
    }

    const stats = await reportService.getDashboardStats(eventIdNum);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error generating dashboard stats:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error generating dashboard stats', error: error.message }, { status: 500 });
  }
}, ['admin', 'organizer']);
