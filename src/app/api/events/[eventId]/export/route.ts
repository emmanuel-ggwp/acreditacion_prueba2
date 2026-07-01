import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { Participant, Guest, EventSchedule } from '@/models/index';

const { ADMIN, OPERATOR, MANAGER } = ROLES;

// Devuelve todos los participantes del evento con sus invitados y horarios,
// para generar la exportación a Excel en el cliente.
export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ eventId: string }> }) => {
  try {
    const { eventId } = await params;
    const participants = await Participant.findAll({
      where: { eventId },
      include: [
        { model: Guest, as: 'guests' },
        { model: EventSchedule, as: 'schedules', through: { attributes: [] } },
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    return NextResponse.json(participants);
  } catch (error: any) {
    console.error('Error exporting participants:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, MANAGER]);
