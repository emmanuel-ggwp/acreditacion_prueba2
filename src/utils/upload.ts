import apiClient from './apiClient';

const MAX_SIZE = 8 * 1024 * 1024; // 8 MB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

/**
 * Sube una imagen al servidor (disco persistente) y devuelve su URL pública,
 * servida por el endpoint /api/uploads/<archivo>.
 * Reutiliza apiClient, que adjunta el token y maneja FormData automáticamente.
 */
export async function uploadImage(file: File): Promise<string> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Tipo de archivo no permitido. Usa PNG, JPG o WEBP.');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('El archivo supera el tamaño máximo de 8 MB.');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await apiClient.post<{ url: string }>('/api/uploads', formData);
  return res.url;
}
