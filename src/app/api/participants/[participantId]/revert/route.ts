import { NextResponse } from 'next/server';
import { ParticipantService } from '@/services/participantService';
import { errorHandler } from '@/utils/errors';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const participantService = new ParticipantService();

// Vuelve un participante inscrito a estado "precargado" SIN borrarlo: quita la
// inscripción y la acreditación, resetea las cargas precargadas y elimina los
// acompañantes que la persona agregó al inscribirse. Es reversible: se puede volver a
// inscribir con el flujo normal.
export const POST = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ participantId: string }> }) => {
  try {
    const { participantId } = await params;
    const result = await participantService.revertToPreloaded(participantId, req.user?.id);
    return NextResponse.json(result);
  } catch (error: any) {
    const { message, details } = errorHandler(error);
    const status = error.statusCode || 500;
    return NextResponse.json({ message, details }, { status });
  }
}, [ROLES.ADMIN, ROLES.OPERATOR]);
