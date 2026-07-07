'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, ArrowRight, CheckCircle2, Clock, Loader2, Info, Mail } from 'lucide-react';
import { isValidRut } from '@/utils/validators/rut';
import { sendConfirmationEmail } from '@/lib/emailjs';
import { buildGuestSummary } from '@/utils/guests';
import { getFormFields, guestDietaryEnabled, getGuestMode } from '@/utils/formFields';
import { getDietaryOptions, isFreeTextDiet, dietaryFull, dietaryLabel, ensureDietOption } from '@/utils/dietary';
import { hexToRgba } from '@/utils/color';
import { CONTACT_EMAIL } from '@/utils/contact';
import { getTitleFont, googleFontHref } from '@/utils/fonts';

const GALA_LABELS: Record<string, string> = { phone: 'Teléfono', documentNumber: 'RUT / Documento', company: 'Empresa', position: 'Cargo', numeroSap: 'Código SAP', dietary: 'Preferencia alimenticia' };

interface TemplateProps {
  event: any;
  slug: string;
}

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString('es-CL', { weekday: 'long', day: '2-digit', month: 'long' });
  } catch {
    return '';
  }
};
const fmtTime = (d: string) => {
  try {
    return new Date(d).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const blockTypeLabel = (t?: string) => {
  switch (t) {
    case 'AM': return 'Mañana';
    case 'PM': return 'Tarde';
    case 'FULL_DAY': return 'Día completo';
    case 'CUSTOM': return 'Personalizado';
    default: return '';
  }
};

interface Carga { id: string; firstName: string; lastName?: string; guestType?: string; dietaryPreference?: string | null; selected: boolean; }

export default function GalaTemplate({ event, slug }: TemplateProps) {
  const theme = (event.registrationConfig && event.registrationConfig.theme) || {};
  const primary = theme.primaryColor || '#008a98';
  const buttonColor = theme.buttonColor || primary;
  const hasBg = !!event.backgroundImageUrl;
  const overlay = typeof theme.overlayOpacity === 'number' ? theme.overlayOpacity : 0.55;
  const overlayColor = theme.overlayColor || '#000000';
  const titleFont = getTitleFont(event.registrationConfig, 'gala');
  const fontHref = googleFontHref(titleFont);
  const schedules: any[] = Array.isArray(event.schedules) ? event.schedules : [];
  const mode: 'open' | 'rut' = event.registrationConfig?.mode === 'rut' ? 'rut' : 'open';
  const ff = getFormFields(event.registrationConfig);
  ff.documentNumber = { enabled: true, required: true }; // RUT siempre visible y obligatorio.
  const guestDiet = guestDietaryEnabled(event.registrationConfig);
  const dietOpts = getDietaryOptions(event.registrationConfig);

  const [step, setStep] = useState<'welcome' | 'rut' | 'fecha' | 'form' | 'already'>('welcome');
  const [allowMultiple, setAllowMultiple] = useState<boolean>(!!event.allowMultipleSchedules);
  const [registeredScheduleIds, setRegisteredScheduleIds] = useState<string[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(schedules.length === 1 && !schedules[0].full ? schedules[0].id : '');
  const [form, setForm] = useState({ firstName: '', lastName: '', documentNumber: '', phone: '', email: '', company: '', position: '', numeroSap: '', dietaryPreference: 'NONE', dietaryComments: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Modo RUT
  const [rutInput, setRutInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [acompEnabled, setAcompEnabled] = useState(false);
  const [acomp, setAcomp] = useState({ firstName: '', lastName: '' });

  // Modo abierto: invitados que agrega el asistente (hasta el máximo del evento)
  const maxGuests = Number(event.maxGuestsPerParticipant) || 0;
  const guestMode = getGuestMode(event.registrationConfig);
  const [countGuests, setCountGuests] = useState(0);
  const [companion, setCompanion] = useState(false);
  const [loads, setLoads] = useState(0);
  const [openGuests, setOpenGuests] = useState<{ firstName: string; lastName: string; dietaryPreference?: string; dietaryComments?: string }[]>([]);
  const addOpenGuest = () => setOpenGuests((g) => (g.length < maxGuests ? [...g, { firstName: '', lastName: '', dietaryPreference: 'NONE', dietaryComments: '' }] : g));
  const removeOpenGuest = (i: number) => setOpenGuests((g) => g.filter((_, idx) => idx !== i));
  const updateOpenGuest = (i: number, k: string, v: string) => setOpenGuests((g) => g.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));

  const setField = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Etiqueta legible del tipo de invitado: usa las configuradas del evento, con respaldo.
  const guestTypeLabel = (val?: string) => {
    if (!val) return '';
    const types = event.registrationConfig?.guests?.types || [];
    const found = types.find((t: any) => t.value === val);
    if (found) return found.label;
    const fallback: Record<string, string> = { CARGA: 'Carga', ACOMPANANTE: 'Acompañante' };
    return fallback[val] || val;
  };

  // Nota: sin background-attachment: fixed (rompe en iOS Safari / móviles).
  const pageStyle: React.CSSProperties = hasBg
    ? { backgroundImage: `url(${event.backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: '#0b1220' };
  const inputStyle: React.CSSProperties = { backgroundColor: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.4)' };
  const inputClass = 'w-full rounded-full px-4 py-3 text-white placeholder-white/50 border focus:outline-none focus:border-white transition';

  // ---- Lookup por RUT ----
  const doLookup = async () => {
    setLookupError('');
    // No exigimos validez matemática del RUT: la reja solo debe ENCONTRAR al precargado.
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
      setParticipantId(p.id);
      setForm((f) => ({ ...f, firstName: p.firstName || '', lastName: p.lastName || '', email: p.email || '', phone: p.phone || '', documentNumber: p.documentNumber || rutInput, dietaryPreference: p.dietaryPreference || 'NONE', dietaryComments: p.dietaryComments || '' }));
      setCargas((data.guests || []).map((g: any) => ({ id: g.id, firstName: g.firstName, lastName: g.lastName, guestType: g.guestType, dietaryPreference: g.dietaryPreference || null, selected: false })));
      const regIds: string[] = data.registeredScheduleIds || [];
      setAllowMultiple(!!data.allowMultiple);
      setRegisteredScheduleIds(regIds);
      // Ya inscrito y NO puede varias fechas → pantalla informativa.
      if (regIds.length > 0 && !data.allowMultiple) { setStep('already'); return; }
      // Si puede varias fechas, no preseleccionar una fecha en la que ya está inscrito.
      if (regIds.includes(selectedScheduleId)) setSelectedScheduleId('');
      setStep(schedules.length ? 'fecha' : 'form');
    } catch (e: any) {
      setLookupError(e.message || 'Error al validar el RUT.');
    } finally {
      setLookupLoading(false);
    }
  };

  // ---- Envío ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!selectedScheduleId) { setError('Selecciona una fecha de asistencia.'); return; }

    let payload: any;
    if (mode === 'rut') {
      if (!participantId) { setError('Primero identifícate con tu RUT.'); return; }
      // El precargado puede venir incompleto: exigimos los datos que pide el evento.
      const missing: string[] = [];
      if (!form.firstName.trim()) missing.push('Nombre');
      if (!form.lastName.trim()) missing.push('Apellido');
      if (!form.email.trim()) missing.push('Correo electrónico');
      for (const key of Object.keys(ff)) {
        if (!ff[key].enabled || !ff[key].required) continue;
        const val = key === 'dietary' ? form.dietaryPreference : (form as any)[key];
        if (!val || val === '' || (key === 'dietary' && val === 'NONE')) missing.push(GALA_LABELS[key]);
      }
      if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { setError('Ingresa un correo electrónico válido.'); return; }
      if (missing.length) { setError('Completa los campos obligatorios: ' + missing.join(', ') + '.'); return; }
      const guests = [
        ...cargas.filter((c) => c.selected).map((c) => ({ id: c.id })),
        ...(acompEnabled && acomp.firstName.trim() ? [{ firstName: acomp.firstName.trim(), lastName: acomp.lastName.trim() || undefined, guestType: 'ACOMPANANTE' }] : []),
      ];
      payload = {
        participantId,
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(),
        phone: form.phone.trim() || undefined, company: form.company.trim() || undefined,
        position: form.position.trim() || undefined, numeroSap: form.numeroSap.trim() || undefined,
        ...(ff.dietary.enabled ? { dietaryPreference: form.dietaryPreference, dietaryComments: form.dietaryComments.trim() || undefined } : {}),
        scheduleIds: [selectedScheduleId],
        guests,
      };
    } else {
      if (!form.firstName.trim() || !form.lastName.trim()) { setError('Ingresa tu nombre y apellido.'); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { setError('Ingresa un correo electrónico válido.'); return; }
      if (ff.documentNumber.enabled && form.documentNumber && !isValidRut(form.documentNumber)) { setError('El RUT ingresado no es válido.'); return; }
      // Validar campos obligatorios configurados por el evento.
      const missing: string[] = [];
      for (const key of Object.keys(ff)) {
        if (!ff[key].enabled || !ff[key].required) continue;
        const val = key === 'dietary' ? form.dietaryPreference : (form as any)[key];
        if (!val || val === '' || (key === 'dietary' && val === 'NONE')) missing.push(GALA_LABELS[key]);
      }
      if (missing.length) { setError('Completa los campos obligatorios: ' + missing.join(', ') + '.'); return; }
      // Invitados según el modo del evento.
      let openGuestList: any[] = [];
      const guestData: any = {};
      if (event.allowGuests && maxGuests > 0) {
        if (guestMode === 'count') {
          guestData.guestCount = Math.max(0, Math.min(countGuests, maxGuests));
        } else if (guestMode === 'companion') {
          const total = (companion ? 1 : 0) + Math.max(0, loads);
          guestData.guestCompanion = companion;
          guestData.guestLoads = Math.max(0, loads);
          guestData.guestCount = Math.min(total, maxGuests);
        } else {
          openGuestList = openGuests
            .filter((g) => g.firstName.trim())
            .map((g) => {
              const gd: any = {};
              if (guestDiet) {
                // El invitado no tiene columna de comentarios: la alergia/detalle se guarda dentro
                // de dietaryPreference (ej.: "Alergia: maní").
                gd.dietaryPreference = isFreeTextDiet(g.dietaryPreference) && (g.dietaryComments || '').trim()
                  ? dietaryFull(g.dietaryPreference, g.dietaryComments)
                  : (g.dietaryPreference || 'NONE');
              }
              return { firstName: g.firstName.trim(), lastName: g.lastName.trim() || undefined, guestType: 'ACOMPANANTE', ...gd };
            });
        }
      }
      payload = {
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim(),
        phone: form.phone.trim() || undefined, documentNumber: form.documentNumber.trim() || undefined,
        company: form.company.trim() || undefined, position: form.position.trim() || undefined,
        numeroSap: form.numeroSap.trim() || undefined,
        ...(ff.dietary.enabled ? { dietaryPreference: form.dietaryPreference, dietaryComments: form.dietaryComments.trim() || undefined } : {}),
        ...guestData,
        scheduleIds: [selectedScheduleId],
        guests: openGuestList,
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/public/events/${slug}/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.code === 'ALREADY_REGISTERED') {
          setRegisteredScheduleIds(data.registeredScheduleIds || []);
          setStep('already');
          return;
        }
        if (data.code === 'ALREADY_REGISTERED_DATE') {
          setRegisteredScheduleIds(data.registeredScheduleIds || []);
          setSelectedScheduleId('');
          setError('Ya estás inscrito para esa fecha. Elige otra.');
          setStep('fecha');
          return;
        }
        throw new Error(data.error || 'No se pudo completar la inscripción.');
      }

      // Correo de confirmación con EmailJS — la inscripción ya quedó guardada, así que
      // un fallo de correo NO debe romper el éxito.
      try {
        const templateId = event.emailTemplate?.templateId;
        if (templateId) {
          const schedule = schedules.find((s) => s.id === selectedScheduleId);
          const guestsList = mode === 'rut'
            ? [
                ...cargas.filter((c) => c.selected).map((c) => `${c.firstName} ${c.lastName || ''}`.trim()),
                ...(acompEnabled && acomp.firstName.trim() ? [`${acomp.firstName} ${acomp.lastName}`.trim() + ' (Acompañante)'] : []),
              ]
            : openGuests.filter((g) => g.firstName.trim()).map((g) => `${g.firstName} ${g.lastName || ''}`.trim());
          const nombre = `${form.firstName} ${form.lastName}`.trim();
          // Invitados según el modo del evento (un solo texto sirve para los 3 modos).
          const gs = buildGuestSummary(guestMode, { names: guestsList, count: countGuests, companion, loads });
          await sendConfirmationEmail(templateId, {
            to_email: form.email,
            email: form.email,
            participant_name: nombre,
            nombre,
            event_name: event.name,
            schedule_name: schedule ? (schedule.label || schedule.scheduleName) : '',
            fechaEvento: schedule ? new Date(schedule.startDateTime).toLocaleDateString('es-CL') : '',
            lugarEvento: schedule?.location || '',
            guests_count: String(gs.count),
            guests_summary: gs.summary,
          });
        }
      } catch (_) {
        // Silencioso: no afecta la inscripción ya guardada.
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const overlayNode = <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(overlayColor, overlay) }} aria-hidden="true" />;

  const selectedSchedule = schedules.find((s) => s.id === selectedScheduleId);

  const renderDateCard = (s: any) => {
    const selected = s.id === selectedScheduleId;
    const already = registeredScheduleIds.includes(s.id);
    const full = !!s.full;
    const blocked = already || full;
    return (
      <button key={s.id} type="button" disabled={blocked} onClick={() => { if (!blocked) setSelectedScheduleId(s.id); }} className="text-left rounded-2xl overflow-hidden transition shadow-lg disabled:cursor-not-allowed" style={{ outline: selected ? `3px solid ${primary}` : '3px solid transparent', backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', opacity: blocked ? 0.55 : 1 }}>
        {s.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.imageUrl} alt={s.scheduleName} className="w-full h-32 object-cover" />
        ) : (
          <div className="w-full h-32 flex items-center justify-center" style={{ backgroundColor: primary }}><Calendar className="h-10 w-10 text-white/80" /></div>
        )}
        <div className="p-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold">{s.label || s.scheduleName}</p>
            {already ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/30 text-green-100 whitespace-nowrap">Ya inscrito</span>
            ) : full ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/40 text-red-50 whitespace-nowrap">Capacidad máxima</span>
            ) : blockTypeLabel(s.blockType) ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 whitespace-nowrap">{blockTypeLabel(s.blockType)}</span>
            ) : null}
          </div>
          <p className="text-sm text-white/85 capitalize flex items-center gap-1 mt-1"><Calendar className="h-3.5 w-3.5" /> {fmtDate(s.startDateTime)}</p>
          <p className="text-sm text-white/70 flex items-center gap-1 mt-0.5"><Clock className="h-3.5 w-3.5" /> {fmtTime(s.startDateTime)} – {fmtTime(s.endDateTime)}</p>
          {s.location && <p className="text-sm text-white/70 flex items-center gap-1 mt-0.5"><MapPin className="h-3.5 w-3.5" /> {s.location}</p>}
        </div>
      </button>
    );
  };

  // ---- Éxito ----
  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12" style={pageStyle}>
        {overlayNode}
        <div className="relative w-full max-w-md text-center rounded-3xl p-10 shadow-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: primary }} />
          <h1 className="text-2xl font-bold text-white mb-2">¡Inscripción exitosa!</h1>
          <p className="text-white/80">Tu inscripción a <b>{event.name}</b> fue registrada correctamente.</p>
        </div>
      </div>
    );
  }

  // ---- Ya inscrito (no puede modificar) ----
  if (step === 'already') {
    const regs = schedules.filter((s) => registeredScheduleIds.includes(s.id));
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12" style={pageStyle}>
        {overlayNode}
        <div className="relative w-full max-w-md text-center rounded-3xl p-8 md:p-10 shadow-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
          {event.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logoUrl} alt={event.name} className="h-14 w-auto mx-auto mb-5 drop-shadow" />
          )}
          <Info className="h-14 w-14 mx-auto mb-4" style={{ color: primary }} />
          <h1 className="text-2xl font-bold text-white mb-2">Ya estás inscrito</h1>
          <p className="text-white/80">Ya tienes una inscripción registrada en <b>{event.name}</b>.</p>

          {/* Datos del participante */}
          {(form.firstName || form.lastName) && (
            <div className="mt-5 text-left rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-white font-semibold text-lg">{`${form.firstName} ${form.lastName}`.trim()}</p>
              <div className="mt-1 space-y-0.5 text-white/75 text-sm">
                {form.documentNumber && <p>RUT: {form.documentNumber}</p>}
                {form.email && <p>Correo: {form.email}</p>}
                {form.phone && <p>Teléfono: {form.phone}</p>}
              </div>
            </div>
          )}

          {/* Cargas / invitados registrados */}
          {cargas.length > 0 && (
            <div className="mt-3 text-left rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-white/90 text-sm font-semibold mb-2">Invitados / cargas:</p>
              <ul className="space-y-1">
                {cargas.map((c) => (
                  <li key={c.id} className="text-white/85 text-sm">• {c.firstName} {c.lastName || ''}{c.guestType ? ` (${guestTypeLabel(c.guestType)})` : ''}</li>
                ))}
              </ul>
            </div>
          )}

          {regs.length > 0 && (
            <div className="mt-3 text-left rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
              <p className="text-white/90 text-sm font-semibold mb-2">Te inscribiste para:</p>
              <ul className="space-y-2">
                {regs.map((s) => (
                  <li key={s.id} className="text-white/85 text-sm flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="capitalize">
                      {(s.label || s.scheduleName)} · {fmtDate(s.startDateTime)} · {fmtTime(s.startDateTime)}{s.location ? ` · ${s.location}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {CONTACT_EMAIL && (
            <p className="mt-6 text-white/80 text-sm flex items-center justify-center gap-2">
              <Mail className="h-4 w-4" />
              ¿Quieres modificar tu inscripción? Escribe a <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-semibold">{CONTACT_EMAIL}</a>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ---- Bienvenida ----
  if (step === 'welcome') {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center" style={pageStyle}>
        {fontHref && <link rel="stylesheet" href={fontHref} />}
        <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(overlayColor, Math.max(overlay, 0.4)) }} aria-hidden="true" />
        <div className="relative flex flex-col items-center">
          {event.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logoUrl} alt={event.name} className="w-40 md:w-52 h-auto mb-8 drop-shadow-lg" />
          )}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 break-words max-w-full" style={{ fontFamily: titleFont.stack }}>{event.name}</h1>
          {event.description && <p className="text-white/80 max-w-xl mb-8">{event.description}</p>}
          <button onClick={() => setStep(mode === 'rut' ? 'rut' : (schedules.length ? 'fecha' : 'form'))} className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-white font-semibold shadow-lg hover:brightness-110 transition" style={{ backgroundColor: buttonColor }}>
            Entrar <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-8 text-xs text-white/60">
            ¿Dudas o cambios en tu inscripción? Escríbenos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
          </p>
        </div>
      </div>
    );
  }

  // ---- Paso RUT (modo rut) ----
  if (step === 'rut') {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12" style={pageStyle}>
        {overlayNode}
        <div className="relative w-full max-w-md rounded-3xl p-8 shadow-2xl text-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}>
          {event.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logoUrl} alt={event.name} className="h-16 w-auto mx-auto mb-5 drop-shadow" />
          )}
          <h1 className="text-xl font-bold text-white mb-2">Identifícate con tu RUT</h1>
          <p className="text-white/70 text-sm mb-5">Ingresa tu RUT sin puntos y con guión para continuar.</p>
          <input
            value={rutInput}
            onChange={(e) => setRutInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') doLookup(); }}
            placeholder="Ej: 12345678-9"
            className="w-full rounded-full px-5 py-3 text-center text-gray-900 bg-white placeholder-gray-400 border border-white/60 focus:outline-none"
          />
          {lookupError && <p className="mt-3 text-sm text-red-300">{lookupError}</p>}
          <button onClick={doLookup} disabled={lookupLoading} className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-white font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-60" style={{ backgroundColor: buttonColor }}>
            {lookupLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
            {lookupLoading ? 'Validando…' : 'Continuar'}
          </button>
        </div>
      </div>
    );
  }

  // ---- Paso: selección de fecha (pantalla propia, antes del formulario) ----
  if (step === 'fecha') {
    return (
      <div className="relative min-h-screen px-4 py-10 md:py-14" style={pageStyle}>
        {overlayNode}
        <div className="relative max-w-4xl mx-auto">
          <header className="text-center mb-8">
            {event.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.logoUrl} alt={event.name} className="h-16 w-auto mx-auto mb-4 drop-shadow" />
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-white break-words">Elige una fecha de asistencia</h1>
            <p className="text-white/80 mt-2">Selecciona la fecha y lugar al que asistirás.</p>
            {allowMultiple && registeredScheduleIds.length > 0 && (
              <p className="text-emerald-200/90 mt-2 text-sm">Ya estás inscrito en {registeredScheduleIds.length} fecha(s). Puedes elegir una nueva — las que ya tienes aparecen marcadas.</p>
            )}
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {schedules.map(renderDateCard)}
          </div>

          <div className="mt-8 flex justify-center">
            <button type="button" disabled={!selectedScheduleId} onClick={() => setStep('form')} className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-white font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-50" style={{ backgroundColor: buttonColor }}>
              Continuar <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Formulario ----
  return (
    <div className="relative min-h-screen px-4 py-10 md:py-14" style={pageStyle}>
      {overlayNode}
      <div className="relative max-w-2xl mx-auto">
        <header className="text-center mb-6">
          {event.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logoUrl} alt={event.name} className="h-16 w-auto mx-auto mb-4 drop-shadow" />
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white break-words">{event.name}</h1>
          <p className="text-white/80 mt-2">Completa la información para registrarte en el evento.</p>
        </header>

        {/* Resumen de la fecha elegida (con opción de cambiarla) */}
        {selectedSchedule && (
          <div className="mb-6 rounded-2xl p-4 flex items-center justify-between gap-3" style={{ backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="text-white text-sm min-w-0">
              <p className="font-semibold flex items-center gap-1">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{selectedSchedule.label || selectedSchedule.scheduleName}{blockTypeLabel(selectedSchedule.blockType) ? ` · ${blockTypeLabel(selectedSchedule.blockType)}` : ''}</span>
              </p>
              <p className="text-white/75 capitalize mt-0.5">{fmtDate(selectedSchedule.startDateTime)} · {fmtTime(selectedSchedule.startDateTime)}{selectedSchedule.location ? ` · ${selectedSchedule.location}` : ''}</p>
            </div>
            <button type="button" onClick={() => setStep('fecha')} className="text-sm underline text-white/90 hover:text-white whitespace-nowrap flex-shrink-0">Cambiar fecha</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="rounded-3xl p-6 md:p-8 shadow-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}>
          {mode === 'rut' ? (
            <>
              {/* Identificado con RUT + completar datos que falten */}
              <div className="mb-4">
                <p className="text-white/70 text-sm">Identificado con RUT</p>
                <p className="text-lg font-semibold text-white">{form.documentNumber}</p>
                <p className="text-white/60 text-xs mt-1">Completa o confirma tus datos para inscribirte.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                <input className={inputClass} style={inputStyle} placeholder="Nombre *" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                <input className={inputClass} style={inputStyle} placeholder="Apellido *" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                {ff.phone.enabled && (
                  <input className={inputClass} style={inputStyle} placeholder={`Teléfono${ff.phone.required ? ' *' : ''}`} value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                )}
                {ff.numeroSap.enabled && (
                  <input className={inputClass} style={inputStyle} placeholder={`Código SAP${ff.numeroSap.required ? ' *' : ''}`} value={form.numeroSap} onChange={(e) => setField('numeroSap', e.target.value)} />
                )}
                {ff.company.enabled && (
                  <input className={inputClass} style={inputStyle} placeholder={`Empresa${ff.company.required ? ' *' : ''}`} value={form.company} onChange={(e) => setField('company', e.target.value)} />
                )}
                {ff.position.enabled && (
                  <input className={inputClass} style={inputStyle} placeholder={`Cargo${ff.position.required ? ' *' : ''}`} value={form.position} onChange={(e) => setField('position', e.target.value)} />
                )}
                <input className={`${inputClass} md:col-span-2`} style={inputStyle} type="email" placeholder="Correo electrónico *" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                {ff.dietary.enabled && (
                  <div className="md:col-span-2">
                    <label className="block text-white/80 text-sm mb-1">Preferencia alimenticia{ff.dietary.required ? ' *' : ''}</label>
                    <select className={inputClass} style={inputStyle} value={form.dietaryPreference} onChange={(e) => setField('dietaryPreference', e.target.value)}>
                      {ensureDietOption(dietOpts, form.dietaryPreference).map((o) => <option key={o.value} value={o.value} style={{ color: '#111' }}>{o.label}</option>)}
                    </select>
                    {isFreeTextDiet(form.dietaryPreference) && (
                      <input className={`${inputClass} mt-2`} style={inputStyle} placeholder={String(form.dietaryPreference).toUpperCase().includes('ALERG') ? 'Especifica tu alergia' : 'Especifica tu requerimiento'} value={form.dietaryComments} onChange={(e) => setField('dietaryComments', e.target.value)} />
                    )}
                  </div>
                )}
              </div>

              {/* Cargas */}
              {cargas.length > 0 && (
                <div className="mb-5">
                  <p className="text-white font-semibold mb-2">Cargas</p>
                  <div className="space-y-2">
                    {cargas.map((c, idx) => (
                      <label key={c.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer border" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.2)' }}>
                        <input type="checkbox" checked={c.selected} onChange={(e) => setCargas((arr) => arr.map((x, i) => (i === idx ? { ...x, selected: e.target.checked } : x)))} className="w-5 h-5" style={{ accentColor: primary }} />
                        <span className="text-white">
                          {c.firstName} {c.lastName || ''}
                          {c.dietaryPreference && dietaryLabel(c.dietaryPreference) !== 'Ninguna' && (
                            <span className="text-white/60 text-xs ml-2">· {dietaryLabel(c.dietaryPreference)}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Acompañante */}
              {event.allowGuests && (
                <div className="mb-2">
                  <label className="flex items-center gap-3 text-white font-semibold cursor-pointer">
                    <input type="checkbox" checked={acompEnabled} onChange={(e) => setAcompEnabled(e.target.checked)} className="w-5 h-5" style={{ accentColor: primary }} />
                    ¿Asistes con acompañante?
                  </label>
                  {acompEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      <input className={inputClass} style={inputStyle} placeholder="Nombre del acompañante" value={acomp.firstName} onChange={(e) => setAcomp((a) => ({ ...a, firstName: e.target.value }))} />
                      <input className={inputClass} style={inputStyle} placeholder="Apellido del acompañante" value={acomp.lastName} onChange={(e) => setAcomp((a) => ({ ...a, lastName: e.target.value }))} />
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input className={inputClass} style={inputStyle} placeholder="Nombre *" value={form.firstName} onChange={(e) => setField('firstName', e.target.value)} />
                <input className={inputClass} style={inputStyle} placeholder="Apellido *" value={form.lastName} onChange={(e) => setField('lastName', e.target.value)} />
                {ff.documentNumber.enabled && (
                  <input className={inputClass} style={inputStyle} placeholder={`RUT (ej. 12345678-9)${ff.documentNumber.required ? ' *' : ''}`} value={form.documentNumber} onChange={(e) => setField('documentNumber', e.target.value)} />
                )}
                {ff.phone.enabled && (
                  <input className={inputClass} style={inputStyle} placeholder={`Teléfono${ff.phone.required ? ' *' : ''}`} value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
                )}
                {ff.numeroSap.enabled && (
                  <input className={inputClass} style={inputStyle} placeholder={`Código SAP${ff.numeroSap.required ? ' *' : ''}`} value={form.numeroSap} onChange={(e) => setField('numeroSap', e.target.value)} />
                )}
                {ff.company.enabled && (
                  <input className={inputClass} style={inputStyle} placeholder={`Empresa${ff.company.required ? ' *' : ''}`} value={form.company} onChange={(e) => setField('company', e.target.value)} />
                )}
                {ff.position.enabled && (
                  <input className={inputClass} style={inputStyle} placeholder={`Cargo${ff.position.required ? ' *' : ''}`} value={form.position} onChange={(e) => setField('position', e.target.value)} />
                )}
                <input className={`${inputClass} md:col-span-2`} style={inputStyle} type="email" placeholder="Correo electrónico *" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                {ff.dietary.enabled && (
                  <div className="md:col-span-2">
                    <label className="block text-white/80 text-sm mb-1">Preferencia alimenticia{ff.dietary.required ? ' *' : ''}</label>
                    <select className={inputClass} style={inputStyle} value={form.dietaryPreference} onChange={(e) => setField('dietaryPreference', e.target.value)}>
                      {ensureDietOption(dietOpts, form.dietaryPreference).map((o) => <option key={o.value} value={o.value} style={{ color: '#111' }}>{o.label}</option>)}
                    </select>
                    {isFreeTextDiet(form.dietaryPreference) && (
                      <input
                        className={`${inputClass} mt-2`}
                        style={inputStyle}
                        placeholder={String(form.dietaryPreference).toUpperCase().includes('ALERG') ? 'Especifica tu alergia' : 'Especifica tu requerimiento'}
                        value={form.dietaryComments}
                        onChange={(e) => setField('dietaryComments', e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>

              {event.allowGuests && maxGuests > 0 && guestMode === 'named' && (
                <div className="mt-5">
                  <p className="text-white font-semibold mb-2">Invitados <span className="text-white/60 text-sm font-normal">(hasta {maxGuests})</span></p>
                  {openGuests.map((g, i) => (
                    <div key={i} className="mb-3 rounded-xl p-2" style={{ border: '1px solid rgba(255,255,255,0.18)' }}>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input className={`${inputClass} flex-1`} style={inputStyle} placeholder={`Nombre del invitado ${i + 1}`} value={g.firstName} onChange={(e) => updateOpenGuest(i, 'firstName', e.target.value)} />
                        <input className={`${inputClass} flex-1`} style={inputStyle} placeholder="Apellido" value={g.lastName} onChange={(e) => updateOpenGuest(i, 'lastName', e.target.value)} />
                        <button type="button" onClick={() => removeOpenGuest(i)} title="Quitar invitado" className="px-4 py-2 rounded-full text-white border self-start" style={{ borderColor: 'rgba(255,255,255,0.3)' }}>✕</button>
                      </div>
                      {guestDiet && (
                        <select className={`${inputClass} mt-2`} style={inputStyle} value={g.dietaryPreference || 'NONE'} onChange={(e) => updateOpenGuest(i, 'dietaryPreference', e.target.value)}>
                          {ensureDietOption(dietOpts, g.dietaryPreference).map((o) => <option key={o.value} value={o.value} style={{ color: '#111' }}>{`Preferencia alimenticia: ${o.label}`}</option>)}
                        </select>
                      )}
                      {guestDiet && isFreeTextDiet(g.dietaryPreference) && (
                        <input
                          className={`${inputClass} mt-2`}
                          style={inputStyle}
                          placeholder={String(g.dietaryPreference).toUpperCase().includes('ALERG') ? 'Especifica la alergia' : 'Especifica el requerimiento'}
                          value={g.dietaryComments || ''}
                          onChange={(e) => updateOpenGuest(i, 'dietaryComments', e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                  {openGuests.length < maxGuests && (
                    <button type="button" onClick={addOpenGuest} className="text-sm underline text-white/90 hover:text-white">+ Agregar invitado</button>
                  )}
                </div>
              )}

              {/* Modo 'count': solo el número de invitados. */}
              {event.allowGuests && maxGuests > 0 && guestMode === 'count' && (
                <div className="mt-5">
                  <p className="text-white font-semibold mb-2">¿Cuántos invitados llevas? <span className="text-white/60 text-sm font-normal">(hasta {maxGuests})</span></p>
                  <input
                    className={`${inputClass} sm:max-w-[10rem]`}
                    style={inputStyle}
                    type="number" min={0} max={maxGuests}
                    value={countGuests}
                    onChange={(e) => setCountGuests(Math.max(0, Math.min(maxGuests, parseInt(e.target.value, 10) || 0)))}
                  />
                </div>
              )}

              {/* Modo 'companion': acompañante (sí/no) + número de cargas. */}
              {event.allowGuests && maxGuests > 0 && guestMode === 'companion' && (
                <div className="mt-5 space-y-3">
                  <p className="text-white font-semibold">Invitados <span className="text-white/60 text-sm font-normal">(hasta {maxGuests} en total)</span></p>
                  <label className="flex items-center gap-2 text-white/90 text-sm">
                    <input type="checkbox" checked={companion} onChange={(e) => setCompanion(e.target.checked)} className="h-4 w-4 rounded" />
                    Voy con acompañante
                  </label>
                  <div>
                    <p className="text-white/80 text-sm mb-1">Número de cargas</p>
                    <input
                      className={`${inputClass} sm:max-w-[10rem]`}
                      style={inputStyle}
                      type="number" min={0} max={Math.max(0, maxGuests - (companion ? 1 : 0))}
                      value={loads}
                      onChange={(e) => setLoads(Math.max(0, Math.min(Math.max(0, maxGuests - (companion ? 1 : 0)), parseInt(e.target.value, 10) || 0)))}
                    />
                  </div>
                  <p className="text-white/60 text-xs">Total de invitados: {(companion ? 1 : 0) + loads}</p>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="mt-4 text-sm text-red-300">
              <p>{error}</p>
              <p className="mt-1 text-red-200/80">¿Necesitas ayuda? Escríbenos a <a href={`mailto:${CONTACT_EMAIL}`} className="underline font-semibold">{CONTACT_EMAIL}</a></p>
            </div>
          )}

          <button type="submit" disabled={submitting} className="mt-6 w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-white font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-60" style={{ backgroundColor: buttonColor }}>
            {submitting ? 'Enviando…' : 'Registrarse'} <ArrowRight className="h-5 w-5" />
          </button>

          <p className="mt-6 text-center text-xs text-white/60">
            ¿Dudas o cambios en tu inscripción? Escríbenos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
          </p>
        </form>
      </div>
    </div>
  );
}
