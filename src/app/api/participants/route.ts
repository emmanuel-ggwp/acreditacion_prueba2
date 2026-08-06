import { NextResponse } from 'next/server';
import { ParticipantService } from '@/services/participantService';
import { errorHandler } from '@/utils/errors';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { ROLES } from '@/utils/constants';

const participantService = new ParticipantService();

// Mismos roles que PUT/DELETE del recurso ([participantId]/route.ts): la creación es
// escritura y MANAGER hoy no alcanza el formulario (SB-18, no puede listar eventos).
// Si SB-18 resuelve que MANAGER escribe, se amplían los cuatro verbos a la vez.
export const POST = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const body = await request.json();
    // El autor sale del token verificado, nunca del body (F1-01). Se descarta un
    // posible userId enviado por el cliente para que no llegue al servicio.
    const { userId: _ignored, ...participantData } = body;

    const participant = await participantService.createParticipant(participantData, request.user.id);
    return NextResponse.json(participant, { status: 201 });
  } catch (error: any) {
    const { message, details } = errorHandler(error);
    const status = error.statusCode || 500;
    return NextResponse.json({ message, details }, { status });
  }
}, [ROLES.ADMIN, ROLES.OPERATOR]);
