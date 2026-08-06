import { NextResponse } from 'next/server';
import { ParticipantService } from '@/services/participantService';
import { errorHandler } from '@/utils/errors';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { ROLES } from '@/utils/constants';

const participantService = new ParticipantService();

// Mismos roles que PUT/DELETE del recurso ([participantId]/route.ts): crear es
// escribir, y los tres verbos de escritura deben decir lo mismo.
//
// MANAGER queda fuera, y NO porque no pueda llegar: sí puede. `/events/[eventId]/
// participants` no tiene RoleGuard y el GET de ese padrón sí lo admite, así que un
// MANAGER con el eventId en la URL ve la lista y el botón «Nuevo participante», y
// aquí recibe 403. Es el mismo rol incoherente de SB-18, ahora también en la UI.
// Se mantiene la coherencia con PUT/DELETE; resolver SB-18 debe tocar los tres
// verbos y las guardas de pantalla a la vez, no este endpoint suelto.
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
