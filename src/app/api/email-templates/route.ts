import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { emailTemplateService } from '@/services/emailTemplateService';

const { ADMIN, MANAGER, OPERATOR } = ROLES;

export const GET = withAuth(async () => {
  const templates = await emailTemplateService.list();
  return NextResponse.json(templates);
}, [ADMIN, MANAGER, OPERATOR]);

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const body = await req.json();
    const template = await emailTemplateService.create(body);
    return NextResponse.json(template, { status: 201 });
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validación fallida', errors: e.issues }, { status: 400 });
    }
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN]);
