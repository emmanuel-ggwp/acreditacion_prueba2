import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { AuthenticatedRequest } from '@/types/auth';
import { ROLES } from '@/utils/constants';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { UPLOADS_DIR } from '@/utils/uploadsStorage';

const { ADMIN, OPERATOR } = ROLES;

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
// SVG se omite a propósito por riesgo de XSS al servirse estáticamente.
const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
};

export const POST = withAuth(async (req: AuthenticatedRequest) => {
  try {
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json({ message: 'No se recibió ningún archivo.' }, { status: 400 });
    }

    const f = file as File;
    const ext = MIME_EXT[f.type];
    if (!ext) {
      return NextResponse.json(
        { message: 'Tipo de archivo no permitido. Usa PNG, JPG o WEBP.' },
        { status: 400 }
      );
    }
    if (f.size > MAX_SIZE) {
      return NextResponse.json(
        { message: 'El archivo supera el tamaño máximo de 8 MB.' },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await f.arrayBuffer());
    await mkdir(UPLOADS_DIR, { recursive: true });

    // Nombre generado (no se usa el original) para evitar path traversal y colisiones.
    const filename = `${randomUUID()}.${ext}`;
    await writeFile(path.join(UPLOADS_DIR, filename), bytes);

    // Se sirve por el endpoint GET /api/uploads/<archivo>, no como estático de
    // public/, porque Next no sirve archivos escritos después del build.
    return NextResponse.json({ url: `/api/uploads/${filename}` }, { status: 201 });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { message: 'Error al subir el archivo', error: error.message },
      { status: 500 }
    );
  }
}, [ADMIN, OPERATOR]);
