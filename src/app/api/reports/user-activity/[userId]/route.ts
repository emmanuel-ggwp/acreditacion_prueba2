
import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { reportService } from '@/services/reportService';
import { AuthenticatedRequest } from '@/types/auth';
import { z } from 'zod';

const userActivityQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

interface Params {
  params: { userId: string };
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const userId = parseInt(params.userId, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ message: 'Invalid user ID' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const query = Object.fromEntries(searchParams.entries());
    const { startDate, endDate } = userActivityQuerySchema.parse(query);

    const report = await reportService.getUserActivityReport(userId, { startDate, endDate });
    return NextResponse.json(report);
  } catch (error: any) {
    console.error(`Error generating user activity report for ${params.userId}:`, error);
    if (error.name === 'ZodError') {
      return NextResponse.json({ message: 'Validation failed', errors: error.errors }, { status: 400 });
    }
    return NextResponse.json({ message: 'Error generating user activity report', error: error.message }, { status: 500 });
  }
}, ['admin']);
