import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { auditLogService } from '@/services/auditLogService';

const { ADMIN } = ROLES;

export const GET = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const action = (searchParams.get('action') as any) || undefined;
    const entity = searchParams.get('entity') || undefined;
    const limit = parseInt(searchParams.get('limit') || '200', 10);
    const logs = await auditLogService.list({ action, entity, limit });
    return NextResponse.json(logs);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN]);
