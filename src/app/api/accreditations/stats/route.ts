import { NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { startOfDay, endOfDay } from 'date-fns';
import Accreditation from '@/models/Accreditation';
import EventSchedule from '@/models/EventSchedule';
import { withAuth, AuthenticatedRequest } from '@/middleware/auth';
import { ROLES } from '@/utils/constants';

// Volumetría de acreditación por evento. Hoy sin consumidor montado (la acción
// getAccreditationStats de accreditationStore no se invoca desde ningún componente);
// los roles son los del RoleGuard de la pantalla de acreditación, que es donde
// vive el store que la expone.
export const GET = withAuth(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const totalAccreditations = await Accreditation.count({
      include: [{ model: EventSchedule, where: { eventId } }],
    });

    const today = new Date();
    const accreditationsToday = await Accreditation.count({
      include: [{ model: EventSchedule, where: { eventId } }],
      where: {
        checkInTime: {
          [Op.between]: [startOfDay(today), endOfDay(today)],
        },
      },
    });

    return NextResponse.json({ totalAccreditations, accreditationsToday });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}, [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.GUARD]);
