
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { accreditationService } from '@/services/accreditationService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: { scheduleId: string };
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const scheduleId = params.scheduleId;
    if (!scheduleId?.length) {
      return NextResponse.json({ message: 'Invalid schedule ID' }, { status: 400 });
    }
    const accreditations = await accreditationService.getAccreditationsBySchedule(scheduleId);
    return NextResponse.json(accreditations);
  } catch (error: any) {
    console.error(`Error fetching accreditations for schedule ${params.scheduleId}:`, error);
    return NextResponse.json({ message: 'Error fetching accreditations', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);
