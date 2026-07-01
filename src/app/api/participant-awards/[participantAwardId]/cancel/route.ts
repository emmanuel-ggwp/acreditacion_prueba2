
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { participantAwardService } from '@/services/participantAwardService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: Promise<{ participantAwardId: string }>;
}

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { participantAwardId } = await params;
    if (!participantAwardId?.length) {
      return NextResponse.json({ message: 'Invalid participant award ID' }, { status: 400 });
    }
    await participantAwardService.cancelAwardAssignment(participantAwardId, req.user.id);
    return NextResponse.json({ message: 'Award assignment cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling award assignment:', error);
    return NextResponse.json({ message: 'Error cancelling award assignment', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
