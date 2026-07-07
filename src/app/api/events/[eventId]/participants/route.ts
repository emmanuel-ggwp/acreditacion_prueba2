import { NextRequest, NextResponse } from 'next/server';
import { ParticipantService } from '@/services/participantService';
import { errorHandler } from '@/utils/errors';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const participantService = new ParticipantService();
const { ADMIN, OPERATOR } = ROLES;

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

// Eliminación masiva de participantes: por ids seleccionados o TODOS (vaciar).
export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ eventId: string }> }) => {
  try {
    const { eventId } = await params;
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids) ? body.ids : undefined;
    const all = !!body?.all;
    if (!all && (!ids || !ids.length)) {
      return NextResponse.json({ message: 'Indica ids a eliminar o all=true para vaciar.' }, { status: 400 });
    }
    const result = await participantService.bulkDeleteParticipants(eventId, { ids, all }, req.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al eliminar participantes' }, { status: 400 });
  }
}, [ADMIN, OPERATOR]);
