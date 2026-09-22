import { NextResponse } from 'next/server';
import { participantService } from '@/services/participantService';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR } = ROLES;

// Asigna los invitados de un participante a fechas concretas (invitados por fecha, admin).
// Body: { guests: [{ id?, firstName?, lastName?, documentNumber?, age?, guestType?, scheduleIds: string[] }] }
export const POST = withAuth(async (
  req: AuthenticatedRequest,
  { params }: { params: Promise<{ participantId: string }> }
) => {
  try {
    const { participantId } = await params;
    const body = await req.json().catch(() => ({}));
    const guests = Array.isArray(body?.guests) ? body.guests : [];
    const result = await participantService.setGuestDates(participantId, guests, req.user.id);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Error al asignar invitados por fecha' }, { status: 400 });
  }
}, [ADMIN, OPERATOR]);
