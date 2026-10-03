import * as XLSX from 'xlsx';
import apiClient from './apiClient';
import { dietaryFull, dietaryLabel } from './dietary';
import { getCustomQuestions, answerText } from './customQuestions';
import { formatDateCL, formatDateTimeCL } from './formatters';

// Fecha corta (solo día) y fecha+hora, siempre en hora de Chile (es-CL + America/Santiago)
// para que la exportación no dependa del reloj/zona del navegador que la genera.
const fmtDate = (d?: string) => (d ? formatDateCL(d) : '');
const fmtDateTime = (d?: string | null) => (d ? formatDateTimeCL(d) : '');

const guestTypeLabel = (t?: string) =>
  t === 'CARGA' ? 'Carga' : t === 'ACOMPANANTE' ? 'Acompañante' : (t || '');

// Etiqueta de una fecha del evento: "Nombre de la fecha (dd-mm-aaaa)".
const scheduleLabel = (s: any) => `${s.label || s.scheduleName} (${fmtDate(s.startDateTime)})`;

/**
 * Fechas elegidas de un invitado. Con "invitados por fecha" cada invitado puede ir a
 * fechas distintas (Guest.schedules). Si el invitado no está ligado a ninguna fecha
 * concreta (cargas antiguas / agregado sin fecha), va a todas las del participante:
 * en ese caso se muestran las del participante, que es donde efectivamente asiste.
 */
const guestFechas = (g: any, p: any) => {
  const gs = Array.isArray(g.schedules) && g.schedules.length ? g.schedules : (p.schedules || []);
  return gs.map(scheduleLabel).join(' ; ');
};

/**
 * Descarga un Excel (.xlsx) con los participantes del evento + sus invitados + fechas.
 * Hoja 1 "Participantes": UNA fila por participante; cada invitado sale en la misma fila
 *   en columnas propias (Invitado N · Dieta invitado N · Fecha invitado N).
 * Hoja 2 "Invitados": una fila por invitado (lista plana), con su dieta y su fecha real.
 */
export async function exportParticipantsToExcel(eventId: string, eventName: string) {
  const participants = await apiClient.get<any[]>(`/api/events/${eventId}/export`);
  // Preguntas configurables del evento (Sí/No + lista): una columna por pregunta.
  let customQuestions: ReturnType<typeof getCustomQuestions> = [];
  try {
    const event = await apiClient.get<any>(`/api/events/${eventId}`);
    customQuestions = getCustomQuestions(event?.registrationConfig);
  } catch { /* si no se puede leer la config, se exporta sin esas columnas */ }

  // Máximo de invitados con nombre entre todos los participantes: define cuántos
  // bloques de columnas (Invitado N …) lleva la hoja. Todas las filas comparten las
  // mismas columnas (vacías donde no haya invitado) para que el Excel quede parejo.
  const maxGuests = participants.reduce((m, p) => Math.max(m, (p.guests || []).length), 0);

  const partRows = participants.map((p) => {
    const schedules = p.schedules || [];
    const fechas = schedules.map(scheduleLabel).join(' ; ');
    const lugares = Array.from(new Set(schedules.map((s: any) => s.location).filter(Boolean))).join(' ; ');
    const guests = p.guests || [];

    // Respuesta a cada pregunta configurable del evento.
    const customCols: Record<string, string> = {};
    for (const q of customQuestions) {
      const a = (p.customData && typeof p.customData === 'object') ? p.customData[q.key] : null;
      customCols[q.label] = a ? answerText(a) : '';
    }

    // Un bloque de columnas por invitado (nombre · dieta · fecha), hasta maxGuests.
    const guestCols: Record<string, string> = {};
    for (let i = 0; i < maxGuests; i++) {
      const g = guests[i];
      guestCols[`Invitado ${i + 1}`] = g ? `${g.firstName} ${g.lastName || ''}`.trim() : '';
      guestCols[`Dieta invitado ${i + 1}`] = g ? dietaryLabel(g.dietaryPreference) : '';
      guestCols[`Fecha invitado ${i + 1}`] = g ? guestFechas(g, p) : '';
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
      ...guestCols,
      ...customCols,
    };
  });

  const guestRows: any[] = [];
  participants.forEach((p) => {
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
        'Fecha': guestFechas(g, p),
      });
    });
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(partRows.length ? partRows : [{ 'Sin participantes': '' }]), 'Participantes');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(guestRows.length ? guestRows : [{ 'Sin invitados': '' }]), 'Invitados');

  const safe = (eventName || 'evento').replace(/[^a-z0-9áéíóúñ ]/gi, '').trim().replace(/\s+/g, '_') || 'evento';
  // Descarga con Blob + enlace (método confiable en todos los navegadores). Antes se usaba
  // XLSX.writeFile, que en algunos navegadores NO dispara la descarga (el toast decía
  // "éxito" pero el archivo no bajaba). XLSX.write(type:'array') genera el .xlsx en memoria.
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `participantes_${safe}.xlsx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
