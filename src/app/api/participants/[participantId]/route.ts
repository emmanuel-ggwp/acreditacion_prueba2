import { NextRequest, NextResponse } from 'next/server';
import { ParticipantService } from '@/services/participantService';
import { errorHandler } from '@/utils/errors';

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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await params;
    const body = await request.json();
    const participant = await participantService.updateParticipant(participantId, body);
    return NextResponse.json(participant);
  } catch (error: any) {
    const { message, details } = errorHandler(error);
    const status = error.statusCode || 500;
    return NextResponse.json({ message, details }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  try {
    const { participantId } = await params;
    const result = await participantService.deleteParticipant(participantId);
    return NextResponse.json(result);
  } catch (error: any) {
    const { message, details } = errorHandler(error);
    const status = error.statusCode || 500;
    return NextResponse.json({ message, details }, { status });
  }
}
