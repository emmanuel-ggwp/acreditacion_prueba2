import { NextRequest, NextResponse } from 'next/server';
import { ParticipantService } from '@/services/participantService';
import { errorHandler } from '@/utils/errors';

const participantService = new ParticipantService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, ...participantData } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 401 });
    }

    const participant = await participantService.createParticipant(participantData, userId);
    return NextResponse.json(participant, { status: 201 });
  } catch (error: any) {
    const { message, details } = errorHandler(error);
    const status = error.statusCode || 500;
    return NextResponse.json({ message, details }, { status });
  }
}
