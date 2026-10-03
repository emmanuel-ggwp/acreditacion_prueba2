
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { reportService } from '@/services/reportService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, MANAGER, OPERATOR } = ROLES;

interface Params {
  params: Promise<{ eventId: string }>;
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const { eventId } = await params;
    if (!eventId?.length) {
      return NextResponse.json({ message: 'Invalid event ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    // Tipo MIME del .xlsx (Office Open XML). Se descarga como Excel, no CSV.
    const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    if (type === 'general') {
        const reportData = await reportService.getGeneralReport(eventId);
        const xlsx = await reportService.generateXlsx(reportData, 'Reporte General');

        return new NextResponse(xlsx, {
            status: 200,
            headers: {
                'Content-Type': XLSX_MIME,
                'Content-Disposition': `attachment; filename="event_report_${eventId}.xlsx"`,
            },
        });
    }

    if (type === 'guests') {
        const reportData = await reportService.getGuestsReport(eventId);
        const xlsx = await reportService.generateXlsx(reportData, 'Invitados');

        return new NextResponse(xlsx, {
            status: 200,
            headers: {
                'Content-Type': XLSX_MIME,
                'Content-Disposition': `attachment; filename="event_guests_${eventId}.xlsx"`,
            },
        });
    }

    const report = await reportService.getEventReport(eventId);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating event report:', error);
    return NextResponse.json({ message: 'Error generating event report', error: error.message }, { status: 500 });
  }
}, [ADMIN, MANAGER, OPERATOR]);
