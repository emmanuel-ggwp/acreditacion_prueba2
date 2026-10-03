import apiClient from '@/utils/apiClient';

// Tipo MIME del .xlsx (Office Open XML). El API ahora devuelve Excel, no CSV.
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Descarga un blob con un nombre de archivo, usando enlace + click (método confiable
// en todos los navegadores; funciona donde XLSX.writeFile no dispara la descarga).
function downloadBlob(data: unknown, filename: string) {
  const blob = new Blob([data as BlobPart], { type: XLSX_MIME });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function downloadEventGeneralReport(eventId: string, eventName: string) {
  const response = await apiClient.get(`/api/reports/events/${eventId}?type=general`, {
    responseType: 'blob',
  });
  downloadBlob(response, `event_report_${eventName.replace(/\s+/g, '_')}.xlsx`);
}

// Reporte de invitados (una fila por invitado: participante, invitado, RUT, edad, dieta, asistencia).
export async function downloadEventGuestsReport(eventId: string, eventName: string) {
  const response = await apiClient.get(`/api/reports/events/${eventId}?type=guests`, {
    responseType: 'blob',
  });
  downloadBlob(response, `event_guests_${eventName.replace(/\s+/g, '_')}.xlsx`);
}
