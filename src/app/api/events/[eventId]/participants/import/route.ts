import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { participantService } from '@/services/participantService';

const { ADMIN, OPERATOR } = ROLES;

// Importación masiva de participantes (filas ya mapeadas desde Excel/CSV en el cliente).
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ eventId: string }> }) => {
  try {
    const { eventId } = await params;
    const body = await req.json();
    const { scheduleId, participants } = body || {};

    if (!Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json({ message: 'No hay filas para importar.' }, { status: 400 });
    }

    const result = await participantService.importParticipants(
      eventId,
      scheduleId || null,
      participants,
      req.user.id
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Error importing participants:', error);
    return NextResponse.json({ message: error.message || 'Error al importar' }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
