import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { Participant, Guest, EventSchedule, Accreditation } from '@/models/index';

const { ADMIN, OPERATOR, MANAGER } = ROLES;

// Devuelve todos los participantes del evento con sus invitados y horarios,
// para generar la exportación a Excel en el cliente. Incluye el estado de
// acreditación (isAccredited): true si existe al menos una acreditación
// registrada para esa persona en cualquier horario del evento.
export const GET = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ eventId: string }> }) => {
  try {
    const { eventId } = await params;
    const participants = await Participant.findAll({
      where: { eventId },
      include: [
        {
          model: Guest,
          as: 'guests',
          include: [{ model: Accreditation, attributes: ['id', 'checkInTime'], required: false }],
        },
        { model: EventSchedule, as: 'schedules', through: { attributes: [] } },
        { model: Accreditation, attributes: ['id', 'checkInTime'], required: false },
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });

    // La hora de acreditación es la más temprana de sus check-ins.
    const earliestCheckIn = (accs: any[]): string | null => {
      const times = (accs || []).map((a) => a.checkInTime).filter(Boolean).map((d) => new Date(d).getTime());
      return times.length ? new Date(Math.min(...times)).toISOString() : null;
    };

    // Aplanamos a objetos planos y agregamos isAccredited + accreditedAt (participante e invitados).
    const result = participants.map((p) => {
      const plain = p.get({ plain: true }) as any;
      plain.isAccredited = (plain.Accreditations || []).length > 0;
      plain.accreditedAt = earliestCheckIn(plain.Accreditations);
      plain.guests = (plain.guests || []).map((g: any) => ({
        ...g,
        isAccredited: (g.Accreditations || []).length > 0,
        accreditedAt: earliestCheckIn(g.Accreditations),
      }));
      return plain;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error exporting participants:', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, MANAGER]);
