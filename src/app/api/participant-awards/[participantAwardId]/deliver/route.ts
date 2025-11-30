
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { participantAwardService } from '@/services/participantAwardService';
import { AuthenticatedRequest } from '@/types/auth';

interface Params {
  params: { participantAwardId: string };
}

export const PATCH = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const participantAwardId = parseInt(params.participantAwardId, 10);
    if (isNaN(participantAwardId)) {
      return NextResponse.json({ message: 'Invalid participant award ID' }, { status: 400 });
    }
    const deliveredBy = req.user.id;
    const delivery = await participantAwardService.deliverAward(participantAwardId, deliveredBy);
    return NextResponse.json(delivery);
  } catch (error: any) {
    console.error(`Error delivering award ${params.participantAwardId}:`, error);
    return NextResponse.json({ message: 'Error delivering award', error: error.message }, { status: 500 });
  }
});
