import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { accreditationService } from '@/services/accreditationService';

const { ADMIN, OPERATOR, MANAGER, GUARD } = ROLES;

// Lista de personas con requerimiento alimentario en el evento del horario, con su acreditación.
export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const scheduleId = new URL(req.url).searchParams.get('scheduleId');
    if (!scheduleId) {
      return NextResponse.json({ message: 'scheduleId requerido' }, { status: 400 });
    }
    const list = await accreditationService.getDietaryList(scheduleId);
    return NextResponse.json(list);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR, MANAGER, GUARD]);
