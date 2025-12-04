import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { awardService } from '@/services/awardService';
import { updateAwardSchema } from '@/utils/validators/awardSchemas';
import { AuthenticatedRequest } from '@/types/auth';
import { z } from 'zod';
import { ROLES } from '@/utils/constants';

const { ADMIN, OPERATOR, GUARD} = ROLES;

interface Params {
  params: { awardId: string };
}

export const GET = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const awardId = params.awardId;
    const award = await awardService.getAwardById(awardId);
    if (!award) {
      return NextResponse.json({ message: 'Award not found' }, { status: 404 });
    }
    return NextResponse.json(award);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const awardId = params.awardId;
    const body = await req.json();
    const validatedData = updateAwardSchema.parse(body);
    const updatedAward = await awardService.updateAward(awardId, validatedData, req.user.id);
    return NextResponse.json(updatedAward);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validation failed', errors: error.issues }, { status: 400 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}, [ADMIN, OPERATOR]);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: Params) => {
  try {
    const awardId = params.awardId;
    await awardService.deleteAward(awardId, req.user.id);
    return NextResponse.json({ message: 'Award deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ message: 'error.message' }, { status: 500 });
  }
}, [ADMIN]);
