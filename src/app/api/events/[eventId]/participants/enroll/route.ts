import { NextResponse } from 'next/server';
import { participantService } from '@/services/participantService';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR } = ROLES;

// Inscripción masiva: suma las fechas marcadas a los participantes seleccionados
// (aditivo, idempotente). Solo actúa sobre datos del propio evento.
export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ eventId: string }> }
) => {
  try {
    const { eventId } = await params;
    const body = await req.json().catch(() => ({}));
    const participantIds = Array.isArray(body?.participantIds) ? body.participantIds : [];
    const scheduleIds = Array.isArray(body?.scheduleIds) ? body.scheduleIds : [];
    if (!participantIds.length) {
      return NextResponse.json({ message: 'No hay participantes seleccionados.' }, { status: 400 });
    }
    if (!scheduleIds.length) {
      return NextResponse.json({ message: 'Debes elegir al menos una fecha.' }, { status: 400 });
    }
    const result = await participantService.bulkEnrollParticipants(
      eventId,
      { participantIds, scheduleIds },
      req.user.id
    );
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al inscribir participantes' }, { status: 400 });
  }
}, [ADMIN, OPERATOR]);
