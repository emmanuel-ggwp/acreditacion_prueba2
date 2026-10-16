import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { participantService } from '@/services/participantService';

const { ADMIN, OPERATOR } = ROLES;

// Premiación masiva (filas ya mapeadas desde Excel/CSV en el cliente): marca como
// premiados a participantes que YA existen en el evento; los no encontrados se devuelven
// sin marcar. No crea participantes.
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ eventId: string }> }) => {
  try {
    const { eventId } = await params;
    const body = await req.json();
    const { participants } = body || {};

    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ message: 'No hay filas para premiar.' }, { status: 400 });
    }

    const result = await participantService.importAwards(eventId, participants, req.user.id);

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error importing awards:', error);
    return NextResponse.json({ message: error.message || 'Error al premiar' }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
