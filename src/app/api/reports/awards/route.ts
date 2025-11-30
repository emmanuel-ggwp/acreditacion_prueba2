
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { reportService } from '@/services/reportService';
import { AuthenticatedRequest } from '@/types/auth';
import { z } from 'zod';

const awardsQuerySchema = z.object({
  eventId: z.string(),
});

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    const { eventId } = awardsQuerySchema.parse(query);
    
    const eventIdNum = eventId;
    if (!eventIdNum?.length) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }

    const report = await reportService.getAwardsReport(eventIdNum);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating awards report:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error generating awards report', error: error.message }, { status: 500 });
  }
}, ['admin', 'organizer']);
