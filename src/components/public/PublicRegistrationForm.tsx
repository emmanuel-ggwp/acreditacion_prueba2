'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { publicRegistrationSchema } from '@/utils/validators/participantSchemas';
import { getFormFields, guestDietaryEnabled, getGuestMode, getGuestFields } from '@/utils/formFields';
import { getDietaryOptions, isFreeTextDiet, dietaryFull, ensureDietOption, DIET_COMMENTS_MAX, GUEST_DIET_DETAIL_MAX } from '@/utils/dietary';
import { sendConfirmationEmail } from '@/lib/emailjs';
import { buildGuestSummary, buildAttendanceDetail } from '@/utils/guests';
import { formatDateCL, formatTimeCL } from '@/utils/formatters';
import { hexToRgba } from '@/utils/color';
import DateSelectModal from '@/components/public/DateSelectModal';
import CustomQuestionFields from '@/components/public/CustomQuestionFields';
import { getCustomQuestions, initCustomAnswers, missingRequiredCustom, type CustomAnswers } from '@/utils/customQuestions';
import { CONTACT_EMAIL } from '@/utils/contact';
import { Loader2, CheckCircle, AlertCircle, Calendar, ChevronDown, ShieldCheck } from 'lucide-react';

const FIELD_LABELS: Record<string, string> = { email: 'Correo electrónico', phone: 'Teléfono', documentNumber: 'RUT / Documento', company: 'Empresa', position: 'Cargo', numeroSap: 'Código SAP', dietary: 'Preferencia alimenticia' };
import { useRouter } from 'next/navigation';

type PublicRegistrationFormData = z.infer<typeof publicRegistrationSchema>;

interface PublicRegistrationFormProps {
  event: {
    id: string;
    name: string;
    description?: string;
    location?: string;
    registrationConfig?: any;
    EventSchedules?: any[];
    allowGuests?: boolean;
  };
  slug: string;
  // La plantilla recibe la(s) fecha(s) elegida(s) para mostrarlas en su encabezado.
  onSelectedSchedulesChange?: (schedules: any[]) => void;
}

export default function PublicRegistrationForm({ event, slug, onSelectedSchedulesChange }: PublicRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  // Invitados que el servidor no pudo guardar por falta de cupo: se enseñan en pantalla
  // en lugar de descartarlos tras un 201 mudo (D1.3).
  const [guestsSkipped, setGuestsSkipped] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const theme: any = (event as any).registrationConfig?.theme || {};
  const primary: string = theme.primaryColor || '#1e293b';
  const btnColor: string = theme.buttonColor || primary;
  // CSS acotado al formulario para aplicar la paleta elegida (solo lo que el admin definió).
  const themeCss = `
    .apf-form label { ${theme.textColor ? `color:${theme.textColor};` : ''} }
    .apf-form input:not([type=checkbox]):not([type=radio]), .apf-form select, .apf-form textarea {
      ${theme.inputColor ? `background-color:${theme.inputColor};` : ''}
      ${theme.borderColor ? `border-color:${theme.borderColor};` : ''}
      ${theme.textColor ? `color:${theme.textColor};` : ''}
    }
  `;
  const ff = getFormFields((event as any).registrationConfig);
  ff.documentNumber = { enabled: true, required: true }; // RUT siempre visible y obligatorio.
  const allSchedules: any[] = (Array.isArray((event as any).schedules) ? [...(event as any).schedules] : [])
    .sort((a: any, b: any) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
  const availableSchedules = allSchedules.filter((s: any) => !s.full);
  const allFull = allSchedules.length > 0 && availableSchedules.length === 0;
  const variant: string = (event as any).publicTemplate || 'default';
  const multiple = !!(event as any).allowMultipleSchedules;
  // Con varias fechas, el modal se abre primero (elegir fecha antes del formulario).
  const [showDateModal, setShowDateModal] = useState(availableSchedules.length > 1);
  const guestDiet = guestDietaryEnabled((event as any).registrationConfig);
  // Campos configurables por evento para cada invitado (apellido / RUT / edad).
  const guestFields = getGuestFields((event as any).registrationConfig);
  const dietOpts = getDietaryOptions((event as any).registrationConfig);
  // Preguntas configurables del evento (Sí/No + lista, ej. transporte + recorrido).
  const customQuestions = getCustomQuestions((event as any).registrationConfig);
  const [customAnswers, setCustomAnswers] = useState<CustomAnswers>(() => initCustomAnswers(customQuestions));
  // Mismo cálculo que el servidor (`api/public/events/[slug]/register/route.ts`):
  // `registrationConfig.guests.max` solo manda si declara algo — su esquema lo guarda
  // en 0 por defecto y taparía el máximo real del evento (R1-01).
  const capOf = (v: any) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; };
  const maxGuests = capOf((event as any).registrationConfig?.guests?.max) || capOf((event as any).maxGuestsPerParticipant);
  const allowGuests = (event as any).allowGuests !== false;
  const guestMode = getGuestMode((event as any).registrationConfig);
  // Modo 'count': solo un número. Modo 'companion': acompañante (sí/no) + cargas.
  const [countGuests, setCountGuests] = useState(0);
  const [companion, setCompanion] = useState(false);
  const [loads, setLoads] = useState(0);
  // Modo de inscripción del evento: 'rut' = solo RUT precargado (reja previa al formulario).
  const registrationMode: 'open' | 'rut' = (event as any).registrationConfig?.mode === 'rut' ? 'rut' : 'open';
  const [rutInput, setRutInput] = useState('');
  const [rutParticipantId, setRutParticipantId] = useState<string | null>(null);
  const [rutPassed, setRutPassed] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  // Invitados POR FECHA (modo 'named'): el asistente puede llevar personas distintas en
  // cada fecha. `cargas` = pool precargado por el organizador (se ofrece para marcar en
  // cada fecha, nunca consume cupo). `dateState[scheduleId]` = qué cargas marcó y qué
  // invitados NUEVOS agregó para ESA fecha. Las cargas se envían por id (confirmación),
  // los nuevos con nombre; el servidor los liga a la fecha vía GuestSchedule.
  type NewGuest = { firstName: string; lastName: string; documentNumber?: string; age?: string; dietaryPreference?: string; dietaryComments?: string };
  const [cargas, setCargas] = useState<{ id: string; firstName: string; lastName: string; dietaryPreference?: string }[]>([]);
  const [lockedIds, setLockedIds] = useState<string[]>([]);
  const [lockedGuests, setLockedGuests] = useState<Record<string, string[]>>({});
  const [dateState, setDateState] = useState<Record<string, { cargas: string[]; news: NewGuest[] }>>({});
  const cargaById = (id: string) => cargas.find((c) => c.id === id);
  const stateFor = (sid: string) => dateState[sid] || { cargas: [], news: [] };
  const toggleCarga = (sid: string, cid: string) => setDateState((st) => {
    const cur = st[sid] || { cargas: [], news: [] };
    const has = cur.cargas.includes(cid);
    return { ...st, [sid]: { ...cur, cargas: has ? cur.cargas.filter((x) => x !== cid) : [...cur.cargas, cid] } };
  });
  const addDateGuest = (sid: string) => setDateState((st) => {
    const cur = st[sid] || { cargas: [], news: [] };
    if (cur.news.length >= maxGuests) return st;
    return { ...st, [sid]: { ...cur, news: [...cur.news, { firstName: '', lastName: '', documentNumber: '', age: '', dietaryPreference: 'NONE', dietaryComments: '' }] } };
  });
  const updateDateGuest = (sid: string, i: number, k: string, v: string) => setDateState((st) => {
    const cur = st[sid] || { cargas: [], news: [] };
    return { ...st, [sid]: { ...cur, news: cur.news.map((g, idx) => (idx === i ? { ...g, [k]: v } : g)) } };
  });
  const removeDateGuest = (sid: string, i: number) => setDateState((st) => {
    const cur = st[sid] || { cargas: [], news: [] };
    return { ...st, [sid]: { ...cur, news: cur.news.filter((_, idx) => idx !== i) } };
  });

  // Controles numéricos con aspecto de botón (consistente con la plantilla Gala).
  const stepper = (value: number, onChange: (n: number) => void, min: number, max: number) => {
    const cls = 'h-10 w-10 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-xl leading-none font-semibold transition hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed';
    const st = { borderColor: btnColor, color: btnColor };
    return (
      <div className="inline-flex items-center gap-4">
        <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} className={cls} style={st} aria-label="Quitar uno">−</button>
        <span className="min-w-[2.5rem] text-center text-2xl font-bold text-gray-800 tabular-nums">{value}</span>
        <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} className={cls} style={st} aria-label="Agregar uno">＋</button>
      </div>
    );
  };
  const toggleCard = (checked: boolean, onChange: (b: boolean) => void, label: string) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="w-full sm:w-auto inline-flex items-center gap-3 rounded-xl px-4 py-3 border-2 transition text-left"
      style={checked ? { borderColor: btnColor, backgroundColor: hexToRgba(btnColor, 0.08) } : { borderColor: '#e5e7eb', backgroundColor: '#fff' }}
    >
      <span className="flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center text-white text-xs leading-none"
        style={{ borderColor: checked ? btnColor : '#d1d5db', backgroundColor: checked ? btnColor : 'transparent' }}>{checked ? '✓' : ''}</span>
      <span className="text-sm font-semibold text-gray-800">{label}</span>
    </button>
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<PublicRegistrationFormData>({
    resolver: zodResolver(publicRegistrationSchema) as any,
    defaultValues: {
      // Con una sola fecha disponible se pre-selecciona; con varias se deja vacío
      // para que el asistente abra el modal y elija (más claro).
      scheduleIds: availableSchedules.length === 1 ? [availableSchedules[0].id] : []
    }
  });

  // Reja de RUT (modo 'rut'): busca al participante precargado y precarga sus datos.
  const doLookup = async () => {
    setLookupError('');
    // No exigimos validez matemática del RUT: la reja solo debe ENCONTRAR al precargado.
    // (Así funcionan RUT de personas mayores, documentos extranjeros o listas de empresas.)
    if (rutInput.replace(/[.\-\s]/g, '').trim().length < 2) { setLookupError('Ingresa tu RUT.'); return; }
    setLookupLoading(true);
    try {
      const res = await fetch(`/api/public/events/${slug}/lookup?rut=${encodeURIComponent(rutInput)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo validar el RUT.');
      if (!data.found) {
        setLookupError('No encontramos tu RUT en este evento. Verifica el número o contacta al organizador.');
        return;
      }
      const p = data.participant;
      setRutParticipantId(p.id);
      setValue('firstName', p.firstName || '');
      setValue('lastName', p.lastName || '');
      setValue('email', p.email || '');
      setValue('phone', p.phone || '');
      setValue('documentNumber', p.documentNumber || rutInput);
      setValue('company', p.company || '');
      setValue('position', p.position || '');
      setValue('numeroSap', p.numeroSap || '');
      // Precargar dieta e invitados registrados en la precarga.
      setValue('dietaryPreference', p.dietaryPreference || 'NONE');
      setValue('dietaryComments', p.dietaryComments || '');
      // Pool de cargas precargadas (se ofrecen para marcar en CADA fecha).
      setCargas(Array.isArray(data.guests) ? data.guests.map((g: any) => ({
        id: g.id, firstName: g.firstName || '', lastName: g.lastName || '', dietaryPreference: g.dietaryPreference || 'NONE',
      })) : []);
      // Fechas ya inscritas (bloqueadas) + sus invitados (solo lectura).
      setLockedIds(Array.isArray(data.registeredScheduleIds) ? data.registeredScheduleIds : []);
      setLockedGuests(data.registeredGuestsBySchedule || {});
      // Invitados en modos numéricos (count / companion).
      if (p.guestCount != null) setCountGuests(Number(p.guestCount) || 0);
      if (p.guestCompanion != null) setCompanion(!!p.guestCompanion);
      if (p.guestLoads != null) setLoads(Number(p.guestLoads) || 0);
      // Respuestas previas a las preguntas configurables (si el precargado ya las traía).
      setCustomAnswers(initCustomAnswers(customQuestions, p.customData));
      setRutPassed(true);
    } catch (e: any) {
      setLookupError(e.message || 'Error al validar el RUT.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Avisa a la plantilla la(s) fecha(s) seleccionada(s) para el encabezado.
  const watchedScheduleIds = watch('scheduleIds');
  useEffect(() => {
    if (!onSelectedSchedulesChange) return;
    const ids: string[] = (watchedScheduleIds as string[]) || [];
    onSelectedSchedulesChange(allSchedules.filter((s: any) => ids.includes(s.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(watchedScheduleIds) ? watchedScheduleIds.join(',') : String(watchedScheduleIds)]);

  // Crea el estado de invitados por cada fecha seleccionada (modo 'named').
  useEffect(() => {
    const ids: string[] = (watchedScheduleIds as string[]) || [];
    setDateState((st) => {
      let changed = false;
      const nx = { ...st };
      for (const id of ids) { if (!nx[id]) { nx[id] = { cargas: [], news: [] }; changed = true; } }
      return changed ? nx : st;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Array.isArray(watchedScheduleIds) ? watchedScheduleIds.join(',') : String(watchedScheduleIds)]);

  const onSubmit = async (data: PublicRegistrationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validar campos obligatorios configurados por el evento.
      const missing: string[] = [];
      for (const key of Object.keys(ff)) {
        if (!ff[key].enabled || !ff[key].required) continue;
        // "Ninguna" (NONE) ES una respuesta válida para la preferencia alimenticia:
        // no bloquea el envío (igual que Gala y que el servidor).
        if (key === 'dietary') continue;
        const val = (data as any)[key];
        if (!val || val === '') missing.push(FIELD_LABELS[key]);
      }
      // Preguntas configurables obligatorias (Sí + sin opción elegida).
      missing.push(...missingRequiredCustom(customQuestions, customAnswers));
      if (missing.length) { setError('Completa los campos obligatorios: ' + missing.join(', ') + '.'); setIsSubmitting(false); return; }

      // Solo se inscriben fechas NUEVAS: las ya inscritas (bloqueadas) se excluyen para no
      // recibir un 409 ALREADY_REGISTERED_DATE y para no tocar esas inscripciones.
      const selectedIds: string[] = ((data.scheduleIds as string[]) || []).filter((id) => !lockedIds.includes(id));
      if (selectedIds.length === 0) {
        setError('Elige al menos una fecha nueva para inscribirte.');
        setIsSubmitting(false);
        return;
      }
      let guestsBySchedule: Record<string, any[]> | undefined;
      const guestData: any = {};
      if (allowGuests && maxGuests > 0) {
        if (guestMode === 'count') {
          guestData.guestCount = Math.max(0, Math.min(countGuests, maxGuests));
        } else if (guestMode === 'companion') {
          const total = (companion ? 1 : 0) + Math.max(0, loads);
          guestData.guestCompanion = companion;
          guestData.guestLoads = Math.max(0, loads);
          guestData.guestCount = Math.min(total, maxGuests);
        } else {
          // Modo 'named': invitados POR FECHA. Por cada fecha elegida se arman las cargas
          // marcadas (por id) + los invitados nuevos (con nombre) de esa fecha.
          guestsBySchedule = {};
          for (const sid of selectedIds) {
            const stt = stateFor(sid);
            guestsBySchedule[sid] = [
              // Carga precargada: se confirma por id. El servidor la liga a esta fecha.
              ...stt.cargas.map((id) => ({ id })),
              ...stt.news.filter((g) => g.firstName.trim()).map((g) => {
                const gd: any = {};
                if (guestDiet) {
                  // El invitado no tiene columna de comentarios: si eligió Alergia/Otro y escribió,
                  // guardamos el detalle dentro de dietaryPreference (ej.: "Alergia: maní").
                  gd.dietaryPreference = isFreeTextDiet(g.dietaryPreference) && (g.dietaryComments || '').trim()
                    ? dietaryFull(g.dietaryPreference, g.dietaryComments)
                    : (g.dietaryPreference || 'NONE');
                }
                if (guestFields.documentNumber.enabled && (g.documentNumber || '').trim()) gd.documentNumber = g.documentNumber!.trim();
                if (guestFields.age.enabled && String(g.age ?? '').trim()) gd.age = Number(g.age);
                return { firstName: g.firstName.trim(), lastName: g.lastName.trim() || undefined, guestType: 'ACOMPANANTE', ...gd };
              }),
            ];
          }
        }
      }
      const response = await fetch(`/api/public/events/${slug}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Correo vacío → undefined: el esquema del modo RUT valida formato de email y
        // rechaza "" (optional/nullable no eximen a la cadena vacía), lo que bloqueaba a
        // un precargado sin correo. Enviar undefined es válido en ambos modos.
        body: JSON.stringify({ ...data, scheduleIds: selectedIds, email: String((data as any).email ?? '').trim() || undefined, ...guestData, ...(guestsBySchedule ? { guestsBySchedule } : {}), customData: customAnswers, ...(registrationMode === 'rut' && rutParticipantId ? { participantId: rutParticipantId } : {}) }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en el registro');
      }
      setGuestsSkipped(Number(result?.guestsSkipped) || 0);

      // Correo de confirmación con EmailJS (best-effort): la inscripción ya quedó
      // guardada, así que un fallo de correo NO debe romper el éxito.
      try {
        const templateId = (event as any).emailTemplate?.templateId;
        if (templateId && data.email) {
          const selDates = selectedIds
            .map((id) => allSchedules.find((s: any) => s.id === id))
            .filter(Boolean)
            .sort((a: any, b: any) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
          const primary: any = selDates[0];
          const nombre = `${data.firstName} ${data.lastName}`.trim();
          const serverCap = Number.isFinite(Number(result?.guestCap)) ? Number(result.guestCap) : maxGuests;
          const fmtWhen = (s: any) => {
            const day = formatDateCL(s.startDateTime, { weekday: 'short', day: '2-digit', month: 'long' });
            const time = formatTimeCL(s.startDateTime);
            return day ? `${day}, ${time}` : '';
          };
          // Nombres de invitados de una fecha (cargas marcadas + invitados nuevos con nombre).
          const namesForDate = (sid: string) => {
            const stt = stateFor(sid);
            return [
              ...stt.cargas.map((cid) => { const c = cargaById(cid); return c ? `${c.firstName} ${c.lastName || ''}`.trim() : ''; }).filter(Boolean),
              ...stt.news.filter((g) => g.firstName.trim()).map((g) => `${g.firstName} ${g.lastName || ''}`.trim()),
            ];
          };
          // Resumen compatible (correo antiguo): invitados de la PRIMERA fecha o números.
          const gs = buildGuestSummary(guestMode, {
            names: guestMode === 'named' && primary ? namesForDate(primary.id) : [],
            count: Math.min(Number(guestData.guestCount) || 0, serverCap),
            companion,
            loads: Math.min(loads, serverCap),
          });
          // Detalle POR FECHA (modo 'named'): un solo bloque {{detalle_asistencia}}. Una
          // fecha → formato simple; varias → desglose con los invitados de cada una.
          const detalle = guestMode === 'named'
            ? buildAttendanceDetail(selDates.map((s: any) => ({
                name: s.label || s.scheduleName,
                when: fmtWhen(s),
                location: s.location || event.location || '',
                guestNames: namesForDate(s.id),
              })))
            : '';
          const emailRes = await sendConfirmationEmail(templateId, {
            to_email: data.email,
            email: data.email,
            participant_name: nombre,
            nombre,
            event_name: event.name,
            schedule_name: primary ? (primary.label || primary.scheduleName) : '',
            fechaEvento: primary ? formatDateCL(primary.startDateTime) : '',
            lugarEvento: primary?.location || event.location || '',
            guests_count: String(gs.count),
            guests_summary: gs.summary,
            detalle_asistencia: detalle,
          });
          // Reportar el resultado del envío para guardarlo en el participante (best-effort).
          if (result?.participantId) {
            fetch(`/api/public/events/${slug}/register/email-status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ participantId: result.participantId, ok: emailRes.ok, skipped: emailRes.skipped, error: emailRes.error }),
            }).catch(() => {});
          }
        }
      } catch (_) {
        // Silencioso: el correo es best-effort y no afecta la inscripción.
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (allFull) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md mx-auto">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 mb-6">
          <AlertCircle className="h-8 w-8 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Cupos agotados</h2>
        <p className="text-gray-600">Todas las fechas de este evento alcanzaron su capacidad máxima. Ya no hay cupos disponibles para inscribirse.</p>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md mx-auto">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Registro exitoso!</h2>
        <p className="text-gray-600 mb-6">
          Te has registrado correctamente en <strong>{event.name}</strong>.
          Hemos enviado un correo de confirmación a tu dirección.
        </p>
        {guestsSkipped > 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3 mb-6">
            No pudimos registrar a {guestsSkipped} de tus invitados: se alcanzó el cupo de
            invitados del evento. Si necesitas ese cupo, escríbenos a {CONTACT_EMAIL}.
          </p>
        )}
        <p className="text-xs text-gray-400 mb-6">
          ¿Necesitas modificar tu inscripción? Escríbenos a{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Registrar a otra persona
        </button>
      </div>
    );
  }

  // Modo 'rut': reja previa. Solo tras identificar el RUT precargado se muestra el formulario.
  if (registrationMode === 'rut' && !rutPassed) {
    return (
      <>
        <style>{themeCss}</style>
        <div className="apf-form">
          <div className="max-w-sm mx-auto text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
              <ShieldCheck className="h-7 w-7" style={{ color: primary }} />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Identifícate con tu RUT</h2>
            <p className="text-sm text-gray-500 mt-1.5">
              Este evento es solo para invitados registrados previamente. Ingresa tu RUT para acceder a tu inscripción.
            </p>

            <div className="mt-6 text-left">
              <label htmlFor="rutGate" className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
              <input
                id="rutGate"
                value={rutInput}
                onChange={(e) => setRutInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); doLookup(); } }}
                placeholder="Ej. 12.345.678-9"
                className="block w-full px-4 py-3 text-center text-lg tracking-wide border border-gray-300 rounded-lg shadow-sm placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-gray-400"
              />
              {lookupError && <p className="mt-2 text-sm text-red-600 text-center">{lookupError}</p>}
            </div>

            <button
              type="button"
              onClick={doLookup}
              disabled={lookupLoading}
              className="mt-4 w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-white font-semibold shadow-sm hover:brightness-110 transition disabled:opacity-60"
              style={{ backgroundColor: btnColor }}
            >
              {lookupLoading && <Loader2 className="h-5 w-5 animate-spin" />}
              {lookupLoading ? 'Validando…' : 'Continuar'}
            </button>

            <div className="mt-5 rounded-lg bg-gray-50 border border-gray-100 p-3 text-xs text-gray-500 leading-relaxed">
              ¿Tu RUT no aparece o tienes algún problema? Escríbenos a{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-medium" style={{ color: primary }}>{CONTACT_EMAIL}</a>
            </div>
          </div>
        </div>
      </>
    );
  }

  const selIds: string[] = (watch('scheduleIds') as string[]) || [];
  const selectedNames = allSchedules.filter((s: any) => selIds.includes(s.id)).map((s: any) => s.label || s.scheduleName).join(', ');

  return (
    <>
    <style>{themeCss}</style>
    <DateSelectModal
      open={showDateModal}
      onClose={() => setShowDateModal(false)}
      schedules={allSchedules}
      selectedIds={selIds}
      multiple={multiple}
      onChange={(ids) => setValue('scheduleIds', ids, { shouldValidate: true })}
      variant={variant}
      accent={btnColor}
      registeredIds={lockedIds}
    />
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 apf-form">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <p className="mt-1 text-xs text-red-600/90">
                ¿Necesitas ayuda? Escríbenos a{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-medium">{CONTACT_EMAIL}</a>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            Nombre *
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="firstName"
              {...register('firstName')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.firstName && (
              <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Apellido *
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="lastName"
              {...register('lastName')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.lastName && (
              <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {ff.email.enabled && (
        <div className="sm:col-span-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico{ff.email.required ? ' *' : ''}
          </label>
          <div className="mt-1">
            <input
              type="email"
              id="email"
              {...register('email')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
        </div>
        )}

        {ff.phone.enabled && (
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Teléfono{ff.phone.required ? ' *' : ''}
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="phone"
              {...register('phone')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        )}

        {ff.documentNumber.enabled && (
        <div>
          <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">
            RUT / Documento{ff.documentNumber.required ? ' *' : ''}
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="documentNumber"
              readOnly={registrationMode === 'rut'}
              {...register('documentNumber')}
              className={`appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${registrationMode === 'rut' ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
            />
          </div>
          {registrationMode === 'rut' && (
            <p className="mt-1 text-xs text-gray-400">El RUT no se puede modificar (validado en la lista de invitados).</p>
          )}
        </div>
        )}

        {ff.numeroSap.enabled && (
        <div>
          <label htmlFor="numeroSap" className="block text-sm font-medium text-gray-700">
            Código SAP{ff.numeroSap.required ? ' *' : ''}
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="numeroSap"
              {...register('numeroSap')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        )}

        {ff.company.enabled && (
        <div className="sm:col-span-2">
          <label htmlFor="company" className="block text-sm font-medium text-gray-700">
            Empresa / Organización{ff.company.required ? ' *' : ''}
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="company"
              {...register('company')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        )}

        {ff.position.enabled && (
        <div className="sm:col-span-2">
          <label htmlFor="position" className="block text-sm font-medium text-gray-700">
            Cargo{ff.position.required ? ' *' : ''}
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="position"
              {...register('position')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
        </div>
        )}

        {ff.dietary.enabled && (
        <div className="sm:col-span-2">
          <label htmlFor="dietaryPreference" className="block text-sm font-medium text-gray-700">
            Preferencia alimenticia{ff.dietary.required ? ' *' : ''}
          </label>
          <div className="mt-1">
            <select
              id="dietaryPreference"
              {...register('dietaryPreference')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              {ensureDietOption(dietOpts, watch('dietaryPreference')).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        )}

        {ff.dietary.enabled && isFreeTextDiet(watch('dietaryPreference')) && (
          <div className="sm:col-span-2">
            <label htmlFor="dietaryComments" className="block text-sm font-medium text-gray-700">
              {String(watch('dietaryPreference')).toUpperCase().includes('ALERG') ? 'Especifica tu alergia' : 'Especifica tus requerimientos alimentarios'}
            </label>
            <div className="mt-1">
              <textarea
                id="dietaryComments"
                rows={3}
                // El freno se ve ANTES de enviar: sin él, el texto de más se descubría
                // como «Validation error» después de rellenar todo el formulario.
                maxLength={DIET_COMMENTS_MAX}
                {...register('dietaryComments')}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {customQuestions.length > 0 && (
        <div className="border-t border-gray-200 pt-5">
          <CustomQuestionFields
            questions={customQuestions}
            answers={customAnswers}
            onChange={setCustomAnswers}
            tone="light"
            accent={btnColor}
          />
        </div>
      )}

      {allowGuests && maxGuests > 0 && guestMode === 'named' && (
        <div className="border-t border-gray-200 pt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Invitados por fecha</label>
            <p className="text-xs text-gray-500 mt-0.5">Marca las cargas registradas y agrega invitados nuevos para <strong>cada fecha</strong>. Puedes llevar personas distintas en cada una (hasta {maxGuests} invitados nuevos por fecha).</p>
          </div>

          {/* Fechas ya inscritas: solo lectura (para cambiarlas se contacta al organizador). */}
          {lockedIds.map((sid) => {
            const s = allSchedules.find((x: any) => x.id === sid);
            if (!s) return null;
            const names = lockedGuests[sid] || [];
            return (
              <div key={`locked-${sid}`} className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800">{s.label || s.scheduleName}</p>
                  <span className="text-xs font-semibold text-emerald-700 whitespace-nowrap">✓ Ya inscrito</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{names.length ? `Invitados: ${names.join(', ')}` : 'Sin invitados adicionales'}</p>
                <p className="text-[11px] text-gray-400 mt-1">Para cambiar los invitados de esta fecha, escríbenos a {CONTACT_EMAIL}.</p>
              </div>
            );
          })}

          {selIds.filter((id) => !lockedIds.includes(id)).length === 0 && lockedIds.length === 0 && (
            <p className="text-sm text-gray-400 rounded-md border border-dashed border-gray-200 p-3">Elige una fecha (más abajo) para agregar sus invitados.</p>
          )}

          {/* Panel editable por cada fecha NUEVA seleccionada. */}
          {selIds.filter((id) => !lockedIds.includes(id)).map((sid) => {
            const s = allSchedules.find((x: any) => x.id === sid);
            if (!s) return null;
            const stt = stateFor(sid);
            return (
              <div key={sid} className="rounded-md border border-gray-200 p-3 space-y-3">
                <p className="text-sm font-semibold text-gray-800">
                  {s.label || s.scheduleName}
                  <span className="text-xs font-normal text-gray-400"> · {new Date(s.startDateTime).toLocaleDateString('es-CL', { timeZone: 'America/Santiago' })}</span>
                </p>

                {cargas.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Cargas registradas — marca quién asiste</p>
                    <div className="space-y-1.5">
                      {cargas.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={stt.cargas.includes(c.id)}
                            onChange={() => toggleCarga(sid, c.id)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{`${c.firstName} ${c.lastName || ''}`.trim()}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Invitados nuevos de esta fecha</p>
                  <div className="space-y-2">
                    {stt.news.map((g, i) => (
                      <div key={i} className="border border-gray-200 rounded-md p-2 space-y-2">
                        <div className="flex gap-2">
                          <input value={g.firstName} onChange={(e) => updateDateGuest(sid, i, 'firstName', e.target.value)} placeholder={`Nombre del invitado ${i + 1} *`} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                          {guestFields.lastName.enabled && (
                            <input value={g.lastName} onChange={(e) => updateDateGuest(sid, i, 'lastName', e.target.value)} placeholder={`Apellido${guestFields.lastName.required ? ' *' : ''}`} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                          )}
                          <button type="button" onClick={() => removeDateGuest(sid, i)} title="Quitar" className="px-3 text-gray-400 hover:text-red-600 border border-gray-300 rounded-md flex-shrink-0">✕</button>
                        </div>
                        {(guestFields.documentNumber.enabled || guestFields.age.enabled) && (
                          <div className="flex gap-2">
                            {guestFields.documentNumber.enabled && (
                              <input value={g.documentNumber || ''} onChange={(e) => updateDateGuest(sid, i, 'documentNumber', e.target.value)} placeholder={`RUT / Documento${guestFields.documentNumber.required ? ' *' : ''}`} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            )}
                            {guestFields.age.enabled && (
                              <input type="number" min={0} max={120} value={g.age || ''} onChange={(e) => updateDateGuest(sid, i, 'age', e.target.value)} placeholder={`Edad${guestFields.age.required ? ' *' : ''}`} className="w-24 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                            )}
                          </div>
                        )}
                        {guestDiet && (
                          <select value={g.dietaryPreference || 'NONE'} onChange={(e) => updateDateGuest(sid, i, 'dietaryPreference', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
                            {ensureDietOption(dietOpts, g.dietaryPreference).map((o) => <option key={o.value} value={o.value}>Preferencia alimenticia: {o.label}</option>)}
                          </select>
                        )}
                        {guestDiet && isFreeTextDiet(g.dietaryPreference) && (
                          <input value={g.dietaryComments || ''} onChange={(e) => updateDateGuest(sid, i, 'dietaryComments', e.target.value)} maxLength={GUEST_DIET_DETAIL_MAX} placeholder={String(g.dietaryPreference).toUpperCase().includes('ALERG') ? 'Especifica la alergia' : 'Especifica el requerimiento'} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                        )}
                      </div>
                    ))}
                  </div>
                  {/* El cupo lo consumen los invitados NUEVOS; las cargas del organizador no (D1.2). */}
                  {stt.news.length < maxGuests && (
                    <button
                      type="button"
                      onClick={() => addDateGuest(sid)}
                      className="mt-2 inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border-2 px-4 py-2.5 text-sm font-semibold transition hover:bg-gray-50"
                      style={{ borderColor: btnColor, color: btnColor }}
                    >
                      <span className="text-base leading-none">＋</span> Agregar invitado
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modo 'count': solo el número de invitados. */}
      {allowGuests && maxGuests > 0 && guestMode === 'count' && (
        <div className="border-t border-gray-200 pt-5">
          <label htmlFor="guestCount" className="block text-sm font-medium text-gray-700 mb-2">
            ¿Cuántos invitados llevas? <span className="text-gray-400 font-normal">(hasta {maxGuests})</span>
          </label>
          {stepper(countGuests, (n) => setCountGuests(Math.max(0, Math.min(maxGuests, n))), 0, maxGuests)}
        </div>
      )}

      {/* Modo 'companion': acompañante (sí/no) + número de cargas. */}
      {allowGuests && maxGuests > 0 && guestMode === 'companion' && (
        <div className="border-t border-gray-200 pt-5 space-y-3">
          <label className="block text-sm font-medium text-gray-700">Invitados</label>
          {toggleCard(companion, setCompanion, 'Voy con acompañante')}
          <div>
            <label className="block text-sm text-gray-700 mb-1">Número de cargas <span className="text-gray-400 font-normal">(hasta {maxGuests})</span></label>
            {stepper(loads, (n) => setLoads(Math.max(0, Math.min(maxGuests, n))), 0, maxGuests)}
          </div>
          <p className="text-xs text-gray-500">Total de invitados: {(companion ? 1 : 0) + loads}{companion ? ` (1 acompañante${loads ? ` + ${loads} carga${loads === 1 ? '' : 's'}` : ''})` : ''}</p>
        </div>
      )}

      {/* Selección de fecha mediante modal (si hay una sola, se muestra fija). */}
      {allSchedules.length > 0 && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha del evento *</label>
          {allSchedules.length === 1 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>{(allSchedules[0].label || allSchedules[0].scheduleName)} · {new Date(allSchedules[0].startDateTime).toLocaleString('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowDateModal(true)}
              className="w-full flex items-center justify-between gap-2 rounded-md border border-gray-300 bg-white px-4 py-3 text-left text-sm hover:border-indigo-400 hover:shadow-sm transition cursor-pointer"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Calendar className="h-4 w-4 flex-shrink-0" style={{ color: btnColor }} />
                <span className={selectedNames ? 'text-gray-900 truncate' : 'text-gray-400'}>{selectedNames || 'Selecciona una fecha'}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
            </button>
          )}
          {errors.scheduleIds && (
            <p className="mt-1 text-sm text-red-600">{errors.scheduleIds.message}</p>
          )}
        </div>
      )}

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ backgroundColor: btnColor }}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Registrando...
            </>
          ) : (
            'Completar registro'
          )}
        </button>
      </div>
    </form>
    </>
  );
}
