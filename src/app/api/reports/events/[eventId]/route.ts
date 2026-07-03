
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { reportService } from '@/services/reportService';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

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

    if (type === 'general') {
        const reportData = await reportService.getGeneralReport(eventId);
        const csv = await reportService.generateCsv(reportData);
        
        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="event_report_${eventId}.csv"`,
            },
        });
    }

    const report = await reportService.getEventReport(eventId);
    return NextResponse.json(report);
  } catch (error: any) {
    console.error('Error generating event report:', error);
    return NextResponse.json({ message: 'Error generating event report', error: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);
