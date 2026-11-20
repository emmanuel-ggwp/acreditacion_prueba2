import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { reportService } from '@/services/reportService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, MANAGER, OPERATOR, GUARD } = ROLES;

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);

    // Support either a single comma-separated `ids` param or repeated `id` params
    const idsParam = searchParams.get('ids');
    let ids: string[] = [];

    if (idsParam) {
      ids = idsParam
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    } else {
      ids = searchParams
        .getAll('id')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);
    }

    if (!ids.length) {
      return NextResponse.json({ message: 'No event IDs provided' }, { status: 400 });
    }

    const reports = await Promise.all(
      ids.map(async (eventId) => {
        try {
          const report = await reportService.getEventReport(eventId);
          return { eventId, ...report };
        } catch (error) {
          console.error(`Error generating event report for ${eventId}:`, error);
          return null;
        }
      })
    );

    const filteredReports = reports.filter((r) => r !== null);

    if (filteredReports.length === 0) {
      return NextResponse.json({ message: 'No se pudieron cargar los reportes de los eventos. Reintenta o revisa el registro del servidor.' }, { status: 500 });
    }
    return NextResponse.json(filteredReports);
  } catch (error: any) {
    console.error('Error generating batch event reports:', error);
    return NextResponse.json(
      { message: 'Error generating batch event reports', error: error.message },
      { status: 500 }
    );
  }
}, [ADMIN, MANAGER, OPERATOR, GUARD]);
