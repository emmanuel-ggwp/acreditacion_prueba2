import emailjs from '@emailjs/browser';

const SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || '';
const PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || '';

/**
 * Envía el correo de confirmación con EmailJS desde el cliente.
 * NUNCA debe romper el flujo: la inscripción ya quedó guardada en el servidor.
 * Devuelve un objeto con el resultado en vez de lanzar.
 */
export async function sendConfirmationEmail(
  templateId: string | undefined | null,
  params: Record<string, any>
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  if (!SERVICE_ID || !PUBLIC_KEY || !templateId) {
    return { ok: false, skipped: true };
  }
  try {
    await emailjs.send(SERVICE_ID, templateId, params, { publicKey: PUBLIC_KEY });
    return { ok: true };
  } catch (e: any) {
    // Best-effort: la inscripción ya se guardó. Usamos warn (no error) para no
    // disparar el overlay de error de Next en desarrollo por un fallo de correo.
    console.warn('EmailJS no pudo enviar el correo de confirmación (la inscripción sí se guardó):', e?.text || e?.message || e);
    return { ok: false, error: e?.text || e?.message || 'Error desconocido al enviar correo' };
  }
}
