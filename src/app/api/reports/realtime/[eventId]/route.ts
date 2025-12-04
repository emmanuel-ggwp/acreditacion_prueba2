
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { reportService } from '@/services/reportService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: { eventId: string };
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const eventId = parseInt(params.eventId, 10);
    if (isNaN(eventId)) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }
    const stats = await reportService.getRealTimeStats(eventId);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error(`Error generating real-time stats for ${params.eventId}:`, error);
    return NextResponse.json({ message: 'Error generating real-time stats', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);
