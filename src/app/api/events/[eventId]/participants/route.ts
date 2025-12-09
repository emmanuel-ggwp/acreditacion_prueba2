import { NextRequest, NextResponse } from 'next/server';
import { ParticipantService } from '@/services/participantService';
import { errorHandler } from '@/utils/errors';

const participantService = new ParticipantService();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const name = searchParams.get('name') || undefined;
    const email = searchParams.get('email') || undefined;
    const search = searchParams.get('search') || undefined;
    const accredited = searchParams.get('accredited') === 'true' ? true : searchParams.get('accredited') === 'false' ? false : undefined;
    const withAward = searchParams.get('withAward') === 'true' ? true : undefined;

    if (search) {
      const results = await participantService.searchParticipants(eventId, search);
      return NextResponse.json({ participants: results, total: results.length, page: 1, limit: results.length });
    }

    const result = await participantService.listParticipants(
      eventId,
      { name, email, accredited, withAward },
      { page, limit }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    const { message, details } = errorHandler(error);
    const status = error.statusCode || 500;
    return NextResponse.json({ message, details }, { status });
  }
}
