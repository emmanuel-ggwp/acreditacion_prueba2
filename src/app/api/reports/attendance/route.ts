
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { reportService } from '@/services/reportService';
import { AuthenticatedRequest } from '@/types/auth';
import { z } from 'zod';

const attendanceQuerySchema = z.object({
  eventId: z.string().optional(),
  scheduleId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  format: z.enum(['json', 'csv']).default('json'),
});

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    const validatedQuery = attendanceQuerySchema.parse(query);

    const reportData = await reportService.getAttendanceReport(validatedQuery);

    if (validatedQuery.format === 'csv') {
      const csv = await reportService.generateCsv(reportData);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="attendance_report.csv"`,
        },
      });
    }

    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error('Error generating attendance report:', error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error generating attendance report', error: error.message }, { status: 500 });
  }
}, ['admin', 'organizer']);
