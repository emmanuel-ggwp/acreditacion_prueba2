import path from 'path';

/**
 * Directorio donde se guardan los archivos subidos en tiempo de ejecución.
 *
 * IMPORTANTE: NO se usa `public/uploads` porque Next.js solo sirve como
 * estáticos los archivos que existían en `public/` al momento del build.
 * Los archivos escritos después del build no los sirve el handler estático,
 * y la petición cae en el catch-all devolviendo HTML en lugar de la imagen.
 *
 * En producción (VPS) conviene apuntar UPLOADS_DIR a una ruta absoluta y
 * estable fuera del directorio de deploy, p. ej. /var/lib/acreditacion/uploads,
 * para que las imágenes sobrevivan a los redeploys.
 */
export const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');

/** Carpeta antigua (build-time) para servir imágenes ya subidas previamente. */
export const LEGACY_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

/** Mapea extensión -> Content-Type para servir el archivo correctamente. */
export const EXT_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

/**
 * Valida que el nombre sea seguro (evita path traversal) y devuelve su
 * extensión permitida, o null si no es válido.
 */
export function safeFilename(name: string): string | null {
  // Solo se aceptan los nombres que genera el endpoint de subida:
  // <uuid>.<ext> con caracteres hex/guiones.
  if (!/^[a-zA-Z0-9._-]+$/.test(name)) return null;
  if (name.includes('..') || name.includes('/') || name.includes('\\')) return null;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (!EXT_MIME[ext]) return null;
  return ext;
}
