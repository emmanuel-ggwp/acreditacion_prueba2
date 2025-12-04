
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { reportService } from '@/services/reportService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: { scheduleId: string };
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const scheduleId = parseInt(params.scheduleId, 10);
    if (isNaN(scheduleId)) {
      return NextResponse.json({ message: 'Invalid schedule ID' }, { status: 400 });
    }
    const report = await reportService.getScheduleReport(scheduleId);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error(`Error generating schedule report for ${params.scheduleId}:`, error);
    return NextResponse.json({ message: 'Error generating schedule report', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
