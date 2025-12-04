
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { participantAwardService } from '@/services/participantAwardService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: { participantId: string };
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const participantId = parseInt(params.participantId, 10);
    if (isNaN(participantId)) {
      return NextResponse.json({ message: 'Invalid participant ID' }, { status: 400 });
    }
    const awards = await participantAwardService.listParticipantAwards(participantId);
    return NextResponse.json(awards);
  } catch (error: any) {
    console.error(`Error fetching awards for participant ${params.participantId}:`, error);
    return NextResponse.json({ message: 'Error fetching participant awards', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, GUARD]);
