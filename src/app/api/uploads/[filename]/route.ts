import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import {
  UPLOADS_DIR,
  LEGACY_UPLOADS_DIR,
  EXT_MIME,
  safeFilename,
} from '@/utils/uploadsStorage';

/**
 * Sirve una imagen subida desde el disco persistente.
 *
 * Público (sin auth): las páginas públicas de inscripción muestran estas
 * imágenes. Se lee del directorio persistente y, como respaldo, de la carpeta
 * antigua public/uploads para no romper URLs ya guardadas en la BD.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  const ext = safeFilename(filename);
  if (!ext) {
    return NextResponse.json({ message: 'Archivo no válido.' }, { status: 400 });
  }

  let bytes: Buffer | null = null;
  for (const dir of [UPLOADS_DIR, LEGACY_UPLOADS_DIR]) {
    try {
      bytes = await readFile(path.join(dir, filename));
      break;
    } catch {
      // seguir con el siguiente directorio
    }
  }

  if (!bytes) {
    return NextResponse.json({ message: 'Imagen no encontrada.' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      'Content-Type': EXT_MIME[ext],
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
