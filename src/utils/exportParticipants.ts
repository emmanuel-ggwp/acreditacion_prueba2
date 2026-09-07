import * as XLSX from 'xlsx';
import apiClient from './apiClient';
import { dietaryFull, dietaryLabel } from './dietary';
import { getCustomQuestions, answerText } from './customQuestions';

const fmtDate = (d?: string) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('es-CL'); } catch { return ''; }
};
const fmtDateTime = (d?: string | null) => {
  if (!d) return '';
  try { return new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
};
const guestTypeLabel = (t?: string) =>
  t === 'CARGA' ? 'Carga' : t === 'ACOMPANANTE' ? 'Acompañante' : (t || '');

/**
 * Descarga un Excel (.xlsx) con los participantes del evento + sus invitados + fechas.
 * Hoja 1 "Participantes": una fila por participante (con lista de invitados).
 * Hoja 2 "Invitados": una fila por invitado.
 */
export async function exportParticipantsToExcel(eventId: string, eventName: string) {
  const participants = await apiClient.get<any[]>(`/api/events/${eventId}/export`);
  // Preguntas configurables del evento (Sí/No + lista): una columna por pregunta.
  let customQuestions: ReturnType<typeof getCustomQuestions> = [];
  try {
    const event = await apiClient.get<any>(`/api/events/${eventId}`);
    customQuestions = getCustomQuestions(event?.registrationConfig);
  } catch { /* si no se puede leer la config, se exporta sin esas columnas */ }

  const partRows = participants.map((p) => {
    const schedules = p.schedules || [];
    const fechas = schedules.map((s: any) => `${s.label || s.scheduleName} (${fmtDate(s.startDateTime)})`).join(' ; ');
    const lugares = Array.from(new Set(schedules.map((s: any) => s.location).filter(Boolean))).join(' ; ');
    const guests = p.guests || [];
    // Respuesta a cada pregunta configurable del evento (usa la respuesta guardada
    // en customData; si falta, se lee "No" cuando la pregunta existe).
    const customCols: Record<string, string> = {};
    for (const q of customQuestions) {
      const a = (p.customData && typeof p.customData === 'object') ? p.customData[q.key] : null;
      customCols[q.label] = a ? answerText(a) : '';
    }
    return {
      'Nombre': p.firstName || '',
      'Apellido': p.lastName || '',
      'RUT / Documento': p.documentNumber || '',
      'Correo': p.email || '',
      'Teléfono': p.phone || '',
      'Empresa': p.company || '',
      'Cargo': p.position || '',
      'Código SAP': p.numeroSap || '',
      'Estado': schedules.length > 0 ? 'Inscrito' : 'Precargado',
      'Acreditado': p.isAccredited ? 'Sí' : 'No',
      'Hora de acreditación': fmtDateTime(p.accreditedAt),
      'Fecha(s)': fechas,
      'Ubicación(es)': lugares,
      'Requerimiento alimentario': dietaryFull(p.dietaryPreference, p.dietaryComments),
      'Premiado': p.isAwarded ? 'Sí' : 'No',
      'Motivo premio': p.awardReason || '',
      'Cant. invitados': guests.length + (Number(p.guestCount) || 0),
      'Acompañante': p.guestCompanion ? 'Sí' : (Number(p.guestLoads) > 0 ? 'No' : ''),
      'Cargas': Number(p.guestLoads) > 0 ? p.guestLoads : '',
      'Invitados': guests.map((g: any) => `${g.firstName} ${g.lastName || ''}`.trim()).join(' ; '),
      ...customCols,
    };
  });

  const guestRows: any[] = [];
  participants.forEach((p) => {
    const fecha = (p.schedules || []).map((s: any) => fmtDate(s.startDateTime)).join(' ; ');
    (p.guests || []).forEach((g: any) => {
      guestRows.push({
        'Participante': `${p.firstName} ${p.lastName || ''}`.trim(),
        'RUT participante': p.documentNumber || '',
        'Invitado': g.firstName || '',
        'Apellido invitado': g.lastName || '',
        'Tipo': guestTypeLabel(g.guestType),
        'RUT invitado': g.documentNumber || '',
        'Acreditado': g.isAccredited ? 'Sí' : 'No',
        'Hora de acreditación': fmtDateTime(g.accreditedAt),
        'Requerimiento alimentario': dietaryLabel(g.dietaryPreference),
        'Fecha': fecha,
      });
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partRows.length ? partRows : [{ 'Sin participantes': '' }]), 'Participantes');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guestRows.length ? guestRows : [{ 'Sin invitados': '' }]), 'Invitados');

  const safe = (eventName || 'evento').replace(/[^a-z0-9áéíóúñ ]/gi, '').trim().replace(/\s+/g, '_') || 'evento';
  XLSX.writeFile(wb, `participantes_${safe}.xlsx`);
}
