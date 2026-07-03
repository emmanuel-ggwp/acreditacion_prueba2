import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { emailTemplateService } from '@/services/emailTemplateService';

const { ADMIN } = ROLES;

export const PUT = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const body = await req.json();
    const template = await emailTemplateService.update(id, body);
    return NextResponse.json(template);
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ message: 'Validación fallida', errors: e.issues }, { status: 400 });
    }
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN]);

export const DELETE = withAuth(async (req: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await params;
    const result = await emailTemplateService.remove(id);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 });
  }
}, [ADMIN]);
