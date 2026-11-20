import { adultCompanionForDate } from './adultCompanion';
import { getFormFields, getGuestMode } from './formFields';
import { answerText } from './customQuestions';
import { dietaryFull } from './dietary';
import { hasCentinelaAdultCompanion } from './centinelaCompanion';
export interface PublicRegistrationSummary {
  participantName: string;
  answers: { label: string; text: string }[];
  dietary: string | null;
  dates: { id: string; name: string; start: string | null; end: string | null;
    guests: { name: string; type: string }[]; numericGuests: number;
    adultCompanion: boolean | null; numericLoads: number | null; totalGuests: number }[];
}
const number = (n: unknown) => Math.max(0, Math.floor(Number(n) || 0));
const name = (p: any) => [p.firstName,p.lastName].filter(Boolean).join(' ').trim();
const iso = (date: any) => { const d = date ? new Date(date) : null; return d && !isNaN(d.getTime()) ? d.toISOString() : null; };
/** Proyección pública: solo respuestas configuradas y nombres de invitados inscritos. */
export function buildPublicRegistrationSummary(event: any, p: any, links: any[]): PublicRegistrationSummary {
  const config = event.registrationConfig || {};
  const questions = Array.isArray(config.customQuestions) ? config.customQuestions : [];
  const answers = questions.flatMap((question: any) => {
    const saved = p.customData?.[question.key];
    return saved && typeof saved.enabled === 'boolean' ? [{ label: question.label || saved.label || 'Respuesta', text: answerText({ ...saved, value: typeof saved.value === 'string' ? saved.value : null }) }] : [];
  });
  const byGuest = new Map<string, Set<string>>();
  for (const link of links) {
    if (!byGuest.has(link.guestId)) byGuest.set(link.guestId, new Set());
    byGuest.get(link.guestId)!.add(link.scheduleId);
  }
  const dates = [...(p.schedules || [])].sort((a,b) => String(iso(a.startDateTime)).localeCompare(String(iso(b.startDateTime))) || String(a.id).localeCompare(String(b.id))).map((schedule: any) => {
    const guests = (p.guests || []).filter((guest: any) => {
      if (guest.deletedAt) return false;
      const assigned = byGuest.get(guest.id);
      return assigned?.size ? assigned.has(schedule.id) : guest.confirmed === true;
    }).map((guest: any) => ({ name: name(guest), type: guest.guestType === 'CARGA' ? 'Carga' : guest.guestType === 'ACOMPANANTE' ? 'Acompañante' : guest.guestType || '' }));
    const native = adultCompanionForDate(p.customData, schedule.id);
    const numericGuests = native !== null ? (native ? 1 : 0) : number(p.guestCount);
    const hasCompanion = getGuestMode(config) === 'companion' || p.guestCompanion === true || hasCentinelaAdultCompanion({ ...p, eventId: event.id });
    return { id: schedule.id, name: schedule.label || schedule.scheduleName || 'Fecha inscrita', start: iso(schedule.startDateTime), end: iso(schedule.endDateTime), guests,
      numericGuests, adultCompanion: native !== null ? native : hasCompanion ? p.guestCompanion === true : null,
      numericLoads: native !== null ? null : (getGuestMode(config) === 'companion' || number(p.guestLoads) > 0) ? number(p.guestLoads) : null,
      totalGuests: guests.length + numericGuests };
  });
  return { participantName: name(p), answers,
    dietary: getFormFields(config).dietary.enabled && p.dietaryPreference ? dietaryFull(p.dietaryPreference,p.dietaryComments) : null,
    dates };
}
