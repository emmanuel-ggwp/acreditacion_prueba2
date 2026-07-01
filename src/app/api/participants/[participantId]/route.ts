import { NextRequest, NextResponse } from 'next/server';
import { ParticipantService } from '@/services/participantService';
import { errorHandler } from '@/utils/errors';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const participantService = new ParticipantService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await params;
    const participant = await participantService.getParticipant(participantId, true, true);
    return NextResponse.json(participant);
  } catch (error: any) {
    const { message, details } = errorHandler(error);
    const status = error.statusCode || 500;
    return NextResponse.json({ message, details }, { status });
  }
}

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ participantId: string }> }) => {
  try {
    const { participantId } = await params;
    const body = await req.json();
    const participant = await participantService.updateParticipant(participantId, body, req.user?.id);
    return NextResponse.json(participant);
  } catch (error: any) {
    const { message, details } = errorHandler(error);
    const status = error.statusCode || 500;
    return NextResponse.json({ message, details }, { status });
  }
}, [ROLES.ADMIN, ROLES.OPERATOR]);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ participantId: string }> }) => {
  try {
    const { participantId } = await params;
    const reason = new URL(req.url).searchParams.get('reason') || undefined;
    const result = await participantService.deleteParticipant(participantId, req.user?.id, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    const { message, details } = errorHandler(error);
    const status = error.statusCode || 500;
    return NextResponse.json({ message, details }, { status });
  }
}, [ROLES.ADMIN, ROLES.OPERATOR]);
