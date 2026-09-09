'use client';

import React, { useState } from 'react';
import { Calendar, MapPin, ArrowRight, CheckCircle2, Clock, Loader2, Info, Mail, ChevronDown } from 'lucide-react';
import { isValidRut } from '@/utils/validators/rut';
import { sendConfirmationEmail } from '@/lib/emailjs';
import { buildGuestSummary } from '@/utils/guests';
import { getFormFields, guestDietaryEnabled, getGuestMode } from '@/utils/formFields';
import CustomQuestionFields from '@/components/public/CustomQuestionFields';
import { getCustomQuestions, initCustomAnswers, missingRequiredCustom, type CustomAnswers } from '@/utils/customQuestions';
import { getDietaryOptions, isFreeTextDiet, dietaryFull, dietaryLabel, ensureDietOption, DIET_COMMENTS_MAX, GUEST_DIET_DETAIL_MAX } from '@/utils/dietary';
import { hexToRgba } from '@/utils/color';
import { CONTACT_EMAIL } from '@/utils/contact';
import { getTitleFont, googleFontHref } from '@/utils/fonts';

const GALA_LABELS: Record<string, string> = { email: 'Correo electrónico', phone: 'Teléfono', documentNumber: 'RUT / Documento', company: 'Empresa', position: 'Cargo', numeroSap: 'Código SAP', dietary: 'Preferencia alimenticia' };

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
  // Color del texto DENTRO de los botones (Entrar, Continuar, Registrarse…). Útil
  // cuando el color del botón es claro y el texto blanco no se lee bien.
  const buttonTextColor = theme.buttonTextColor || '#ffffff';
  const hasBg = !!event.backgroundImageUrl;
  // Imagen destacada del evento (ej. "AURORA"): separada del fondo para que escale
  // bien en móvil. Se muestra en el inicio; si no hay, se usa el nombre como título.
  const heroUrl = event.registrationConfig?.images?.heroUrl || '';
  // Imágenes a pantalla completa tras inscripción exitosa (escritorio / celular).
  const successUrl = event.registrationConfig?.images?.successUrl || '';
  const successUrlMobile = event.registrationConfig?.images?.successUrlMobile || '';
  const overlay = typeof theme.overlayOpacity === 'number' ? theme.overlayOpacity : 0.55;
  const overlayColor = theme.overlayColor || '#000000';
  const titleColor = theme.titleColor || '#ffffff';
  // Fondo y transparencia de las tarjetas de fecha SIN foto (el default replica el
  // aspecto actual: negro al 50%). Las tarjetas CON foto conservan su fondo.
  const dateCardColor = theme.dateCardColor || '#000000';
  const dateCardOpacity = typeof theme.dateCardOpacity === 'number' ? theme.dateCardOpacity : 0.5;
  // Colores de los textos de la pantalla de selección de fecha.
  const datesTitleColor = theme.datesTitleColor || '#ffffff';       // "Elige una fecha de asistencia"
  const datesSubtitleColor = theme.datesSubtitleColor || '#ffffff'; // "Selecciona la fecha y lugar…"
  // Desplazamiento vertical del bloque del formulario en escritorio (negativo = más
  // arriba, positivo = más abajo). Default 0 = sin cambios (los eventos actuales no se mueven).
  const galaFormOffset = typeof theme.galaFormOffset === 'number' ? theme.galaFormOffset : 0;
  // Tamaño del título (nombre del evento) en el inicio SIN imagen destacada.
  // Clases literales para que Tailwind las incluya; 'lg' es el recomendado.
  const TITLE_SIZES: Record<string, string> = {
    sm: 'text-2xl md:text-3xl',
    md: 'text-3xl md:text-4xl',
    lg: 'text-3xl md:text-5xl',
    xl: 'text-4xl md:text-6xl',
    xxl: 'text-5xl md:text-7xl',
  };
  const titleSizeClass = TITLE_SIZES[theme.titleSize as string] || TITLE_SIZES.lg;
  // Sombra del título (para que resalte sobre el fondo).
  const TITLE_SHADOWS: Record<string, string> = {
    none: 'none',
    soft: '0 2px 8px rgba(0,0,0,0.45)',
    strong: '0 3px 16px rgba(0,0,0,0.75)',
  };
  const titleShadow = TITLE_SHADOWS[theme.titleShadow as string] || 'none';
  const titleFont = getTitleFont(event.registrationConfig, 'gala');
  const fontHref = googleFontHref(titleFont);
  // Fechas ordenadas cronológicamente (orden defensivo por si llegan sin ordenar).
  const schedules: any[] = (Array.isArray(event.schedules) ? [...event.schedules] : [])
    .sort((a: any, b: any) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
  const mode: 'open' | 'rut' = event.registrationConfig?.mode === 'rut' ? 'rut' : 'open';
  const ff = getFormFields(event.registrationConfig);
  ff.documentNumber = { enabled: true, required: true }; // RUT siempre visible y obligatorio.
  const guestDiet = guestDietaryEnabled(event.registrationConfig);
  const dietOpts = getDietaryOptions(event.registrationConfig);
  // Preguntas configurables del evento (Sí/No + lista, ej. transporte + recorrido).
  const customQuestions = getCustomQuestions(event.registrationConfig);
  const [customAnswers, setCustomAnswers] = useState<CustomAnswers>(() => initCustomAnswers(customQuestions));
  // Preferencia alimenticia: en Gala se elige con un modal (botón con apariencia de
  // select que abre la lista de opciones). `dietTemp` es la selección provisional
  // dentro del modal hasta que se pulsa "Aceptar".
  const [dietModalOpen, setDietModalOpen] = useState(false);
  const [dietTemp, setDietTemp] = useState<string>('NONE');
  // El botón-select muestra "Escoger opción" hasta que el asistente confirma una
  // opción (incluida "Ninguna"); a partir de ahí muestra la elegida.
  const [dietChosen, setDietChosen] = useState(false);
  const dietModalColor = theme.dietModalColor || '#0b1220';
  const dietLabelOf = (val: string) => {
    const found = ensureDietOption(dietOpts, val).find((o) => o.value === val);
    return found ? found.label : val;
  };

  const [step, setStep] = useState<'welcome' | 'rut' | 'fecha' | 'form' | 'already'>('welcome');
  const [allowMultiple, setAllowMultiple] = useState<boolean>(!!event.allowMultipleSchedules);
  const [registeredScheduleIds, setRegisteredScheduleIds] = useState<string[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string>(schedules.length === 1 && !schedules[0].full ? schedules[0].id : '');
  const [form, setForm] = useState({ firstName: '', lastName: '', documentNumber: '', phone: '', email: '', company: '', position: '', numeroSap: '', dietaryPreference: 'NONE', dietaryComments: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showSuccessImg, setShowSuccessImg] = useState(true);
  // Invitados que el servidor no pudo guardar por falta de cupo. Se enseñan: descartarlos
  // en silencio con un 201 es lo que hacía que el asistente creyera traer acompañante.
  const [guestsSkipped, setGuestsSkipped] = useState(0);

  // Modo RUT
  const [rutInput, setRutInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [cargas, setCargas] = useState<Carga[]>([]);
  const [acompEnabled, setAcompEnabled] = useState(false);
  const [acomp, setAcomp] = useState({ firstName: '', lastName: '', dietaryPreference: 'NONE', dietaryComments: '' });

  // Cupo de invitados. Se calcula IGUAL que en el servidor
  // (`api/public/events/[slug]/register/route.ts`): `registrationConfig.guests.max` solo
  // manda si declara algo, porque su esquema lo guarda en 0 por defecto y taparía el
  // máximo real del evento. Si el cupo es 0 no se ofrece ningún invitado — antes se
  // ofrecía acompañante mirando solo `allowGuests` y el servidor lo descartaba (R1-01).
  const capOf = (v: any) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; };
  const maxGuests = capOf(event.registrationConfig?.guests?.max) || capOf(event.maxGuestsPerParticipant);
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
  // Colores del formulario: por defecto Gala usa su estilo oscuro fijo (inmersivo).
  // Solo si el evento activó "personalizar colores del formulario" se aplican los del
  // tema (Fondo formulario / Inputs / Bordes / Texto). Así los eventos existentes NO cambian.
  const galaCustomForm = !!theme.galaCustomFormColors;
  const inputStyle: React.CSSProperties = galaCustomForm
    ? { backgroundColor: theme.inputColor || '#0b1220', borderColor: theme.borderColor || 'rgba(255,255,255,0.4)', color: theme.textColor || '#ffffff' }
    : { backgroundColor: 'rgba(0,0,0,0.55)', borderColor: 'rgba(255,255,255,0.4)', color: '#ffffff' };
  const inputClass = 'w-full rounded-full px-4 py-3 placeholder-white/50 border focus:outline-none focus:border-white transition';

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
      setForm((f) => ({ ...f, firstName: p.firstName || '', lastName: p.lastName || '', email: p.email || '', phone: p.phone || '', documentNumber: p.documentNumber || rutInput, company: p.company || '', position: p.position || '', numeroSap: p.numeroSap || '', dietaryPreference: p.dietaryPreference || 'NONE', dietaryComments: p.dietaryComments || '' }));
      // Cargas precargadas por el organizador: vienen MARCADAS por defecto (el
      // asistente puede desmarcar las que no asistirán).
      setCargas((data.guests || []).map((g: any) => ({ id: g.id, firstName: g.firstName, lastName: g.lastName, guestType: g.guestType, dietaryPreference: g.dietaryPreference || null, selected: true })));
      setCustomAnswers(initCustomAnswers(customQuestions, p.customData));
      setDietChosen((p.dietaryPreference || 'NONE') !== 'NONE');
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
      // El correo (si el evento lo exige) se valida en el bucle de campos configurables.
      for (const key of Object.keys(ff)) {
        if (!ff[key].enabled || !ff[key].required) continue;
        const val = key === 'dietary' ? form.dietaryPreference : (form as any)[key];
        // "Ninguna" (NONE) ES una respuesta válida: la preferencia obligatoria se
        // cumple cuando la persona ELIGIÓ en el modal (dietChosen), aunque elija Ninguna.
        if (key === 'dietary' ? !dietChosen : (!val || val === '')) missing.push(GALA_LABELS[key]);
      }
      if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { setError('Ingresa un correo electrónico válido.'); return; }
      missing.push(...missingRequiredCustom(customQuestions, customAnswers));
      if (missing.length) { setError('Completa los campos obligatorios: ' + missing.join(', ') + '.'); return; }
      // Acompañante nuevo (flujo RUT): incluye su preferencia alimenticia si el evento
      // la pide. El invitado no tiene columna de comentarios: el detalle (alergia/otro)
      // se compone dentro de dietaryPreference ("Alergia: maní"), igual que en el flujo abierto.
      let acompObj: any = null;
      if (acompEnabled && acomp.firstName.trim()) {
        acompObj = { firstName: acomp.firstName.trim(), lastName: acomp.lastName.trim() || undefined, guestType: 'ACOMPANANTE' };
        if (guestDiet) {
          acompObj.dietaryPreference = isFreeTextDiet(acomp.dietaryPreference) && acomp.dietaryComments.trim()
            ? dietaryFull(acomp.dietaryPreference, acomp.dietaryComments)
            : (acomp.dietaryPreference || 'NONE');
        }
      }
      const guests = [
        ...cargas.filter((c) => c.selected).map((c) => (guestDiet ? { id: c.id, dietaryPreference: c.dietaryPreference || 'NONE' } : { id: c.id })),
        ...(acompObj ? [acompObj] : []),
      ];
      payload = {
        participantId,
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined, company: form.company.trim() || undefined,
        position: form.position.trim() || undefined, numeroSap: form.numeroSap.trim() || undefined,
        ...(ff.dietary.enabled ? { dietaryPreference: form.dietaryPreference, dietaryComments: form.dietaryComments.trim() || undefined } : {}),
        customData: customAnswers,
        scheduleIds: [selectedScheduleId],
        guests,
      };
    } else {
      if (!form.firstName.trim() || !form.lastName.trim()) { setError('Ingresa tu nombre y apellido.'); return; }
      // Formato de correo solo si hay algo escrito; su obligatoriedad la controla el evento.
      if (form.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) { setError('Ingresa un correo electrónico válido.'); return; }
      if (ff.documentNumber.enabled && form.documentNumber && !isValidRut(form.documentNumber)) { setError('El RUT ingresado no es válido.'); return; }
      // Validar campos obligatorios configurados por el evento.
      const missing: string[] = [];
      for (const key of Object.keys(ff)) {
        if (!ff[key].enabled || !ff[key].required) continue;
        const val = key === 'dietary' ? form.dietaryPreference : (form as any)[key];
        // "Ninguna" (NONE) ES una respuesta válida: la preferencia obligatoria se
        // cumple cuando la persona ELIGIÓ en el modal (dietChosen), aunque elija Ninguna.
        if (key === 'dietary' ? !dietChosen : (!val || val === '')) missing.push(GALA_LABELS[key]);
      }
      missing.push(...missingRequiredCustom(customQuestions, customAnswers));
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
        firstName: form.firstName.trim(), lastName: form.lastName.trim(), email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined, documentNumber: form.documentNumber.trim() || undefined,
        company: form.company.trim() || undefined, position: form.position.trim() || undefined,
        numeroSap: form.numeroSap.trim() || undefined,
        ...(ff.dietary.enabled ? { dietaryPreference: form.dietaryPreference, dietaryComments: form.dietaryComments.trim() || undefined } : {}),
        ...guestData,
        customData: customAnswers,
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

      // El 201 dice cuántos invitados NUEVOS se guardaron y cuántos no cupieron (D1.3).
      // Sin esto el correo listaba acompañantes que el servidor había descartado.
      const ok = await res.json().catch(() => ({} as any));
      const createdGuests = Number.isFinite(Number(ok?.guestsCreated)) ? Number(ok.guestsCreated) : Number.MAX_SAFE_INTEGER;
      const skippedGuests = Number(ok?.guestsSkipped) || 0;
      const serverCap = Number.isFinite(Number(ok?.guestCap)) ? Number(ok.guestCap) : maxGuests;
      setGuestsSkipped(skippedGuests);

      // Correo de confirmación con EmailJS — la inscripción ya quedó guardada, así que
      // un fallo de correo NO debe romper el éxito.
      try {
        const templateId = form.email.trim() ? event.emailTemplate?.templateId : null;
        if (templateId) {
          const schedule = schedules.find((s) => s.id === selectedScheduleId);
          // Solo se nombran los invitados que el servidor CONFIRMÓ. Los que ya existían
          // (cargas seleccionadas por id) se guardan siempre; los nuevos, hasta el cupo.
          const existingNames = mode === 'rut'
            ? cargas.filter((c) => c.selected).map((c) => `${c.firstName} ${c.lastName || ''}`.trim())
            : [];
          const newNames = mode === 'rut'
            ? (acompEnabled && acomp.firstName.trim() ? [`${acomp.firstName} ${acomp.lastName}`.trim() + ' (Acompañante)'] : [])
            : openGuests.filter((g) => g.firstName.trim()).map((g) => `${g.firstName} ${g.lastName || ''}`.trim());
          const guestsList = [...existingNames, ...newNames.slice(0, createdGuests)];
          const nombre = `${form.firstName} ${form.lastName}`.trim();
          // Invitados según el modo del evento (un solo texto sirve para los 3 modos).
          // Los modos numéricos no crean filas: se recortan contra el cupo que devolvió
          // el servidor, que es el mismo con el que recorta `guestCount`.
          const gs = buildGuestSummary(guestMode, {
            names: guestsList,
            count: Math.min(countGuests, serverCap),
            companion,
            loads: Math.min(loads, serverCap),
          });
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
    // Ancho FIJO por tarjeta (móvil: ancho completo). Todas quedan del mismo tamaño
    // sin importar cuántas fechas haya; el contenedor las reparte y centra la última
    // fila incompleta (5 fechas → 3 arriba y 2 centradas). Con 4 fechas, el contenedor
    // se estrecha (abajo) para que queden 2 y 2 SIN ensancharse.
    // Etiqueta de estado (reutilizada en ambos diseños).
    const badge = already ? (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-500/30 text-green-100 whitespace-nowrap">Ya inscrito</span>
    ) : full ? (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-500/40 text-red-50 whitespace-nowrap">Capacidad máxima</span>
    ) : blockTypeLabel(s.blockType) ? (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-white/20 whitespace-nowrap">{blockTypeLabel(s.blockType)}</span>
    ) : null;

    // Partes de la fecha para el diseño tipográfico SIN imagen.
    const d = new Date(s.startDateTime);
    const validDate = !isNaN(d.getTime());
    const dayNum = validDate ? d.getDate() : '';
    const weekdayName = validDate ? d.toLocaleDateString('es-CL', { weekday: 'long' }) : '';
    const monthName = validDate ? d.toLocaleDateString('es-CL', { month: 'long' }) : '';

    return (
      <button key={s.id} type="button" disabled={blocked} onClick={() => { if (!blocked) setSelectedScheduleId(s.id); }} className="w-full sm:w-[18rem] text-left rounded-2xl overflow-hidden transition shadow-lg disabled:cursor-not-allowed" style={{ outline: selected ? `3px solid ${primary}` : '3px solid transparent', backgroundColor: s.imageUrl ? 'rgba(0,0,0,0.5)' : hexToRgba(dateCardColor, dateCardOpacity), border: '1px solid rgba(255,255,255,0.15)', opacity: blocked ? 0.55 : 1 }}>
        {s.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={s.imageUrl} alt={s.scheduleName} className="w-full h-32 object-cover" />
            <div className="p-4 text-white">
              <div className="flex items-start justify-between gap-2">
                <p className="font-bold">{s.label || s.scheduleName}</p>
                {badge}
              </div>
              <p className="text-sm text-white/85 capitalize flex items-center gap-1 mt-1"><Calendar className="h-3.5 w-3.5" /> {fmtDate(s.startDateTime)}</p>
              <p className="text-sm text-white/70 flex items-center gap-1 mt-0.5"><Clock className="h-3.5 w-3.5" /> {fmtTime(s.startDateTime)} – {fmtTime(s.endDateTime)}</p>
              {s.location && <p className="text-sm text-white/70 flex items-center gap-1 mt-0.5"><MapPin className="h-3.5 w-3.5" /> {s.location}</p>}
            </div>
          </>
        ) : (
          // Diseño SIN imagen: tipográfico, sin íconos. Día grande y liviano, con
          // día de la semana y mes en mayúsculas espaciadas y una fina línea de acento.
          <div className="px-6 py-8 text-white flex flex-col items-center text-center" style={{ minHeight: '13rem', justifyContent: 'center' }}>
            {badge && <div className="mb-3">{badge}</div>}
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50 capitalize">{weekdayName}</p>
            <p className="text-6xl font-light leading-none my-1.5" style={{ fontFamily: titleFont.stack }}>{dayNum}</p>
            <p className="text-sm uppercase tracking-[0.3em] text-white/75 capitalize">{monthName}</p>
            <div className="h-px w-8 my-4" style={{ backgroundColor: primary }} />
            <p className="font-semibold">{s.label || s.scheduleName}</p>
            <p className="text-sm text-white/70 mt-1">{fmtTime(s.startDateTime)} – {fmtTime(s.endDateTime)}</p>
            {s.location && <p className="text-xs text-white/50 mt-1.5 uppercase tracking-wide">{s.location}</p>}
          </div>
        )}
      </button>
    );
  };

  // ---- Éxito ----
  if (success) {
    // Imagen a pantalla completa (una por escritorio/celular; si falta una, se usa la otra).
    const successImgD = successUrl || successUrlMobile;
    const successImgM = successUrlMobile || successUrl;
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 md:bg-fixed" style={pageStyle}>
        {overlayNode}
        <div className="relative w-full max-w-md text-center rounded-3xl p-10 shadow-2xl" style={{ backgroundColor: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.15)' }}>
          <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: primary }} />
          <h1 className="text-2xl font-bold text-white mb-2">¡Inscripción exitosa!</h1>
          <p className="text-white/80">Tu inscripción a <b>{event.name}</b> fue registrada correctamente.</p>
          {guestsSkipped > 0 && (
            <p className="mt-4 text-sm text-amber-200">
              {guestsSkipped === 1
                ? 'No pudimos registrar a 1 de tus invitados: se alcanzó el cupo de invitados del evento.'
                : `No pudimos registrar a ${guestsSkipped} de tus invitados: se alcanzó el cupo de invitados del evento.`}
              {' '}Si necesitas ese cupo, escribe a <b>{CONTACT_EMAIL}</b>.
            </p>
          )}
          {/* Botón para volver a ver la imagen si la cerraron. */}
          {(successImgD || successImgM) && !showSuccessImg && (
            <button type="button" onClick={() => setShowSuccessImg(true)} className="mt-6 text-sm underline text-white/80 hover:text-white">Ver imagen del evento</button>
          )}
        </div>

        {/* Imagen a pantalla completa que cubre todo tras inscribirse. */}
        {(successImgD || successImgM) && showSuccessImg && (
          <div className="fixed inset-0 z-50 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={successImgD} alt="" className="hidden sm:block w-full h-full object-cover" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={successImgM} alt="" className="sm:hidden w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setShowSuccessImg(false)}
              aria-label="Cerrar"
              className="absolute top-4 right-4 h-10 w-10 flex items-center justify-center rounded-full bg-black/50 text-white text-lg hover:bg-black/70 transition"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- Ya inscrito (no puede modificar) ----
  if (step === 'already') {
    const regs = schedules.filter((s) => registeredScheduleIds.includes(s.id));
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 md:bg-fixed" style={pageStyle}>
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
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12 text-center md:bg-fixed" style={pageStyle}>
        {fontHref && <link rel="stylesheet" href={fontHref} />}
        <div className="absolute inset-0" style={{ backgroundColor: hexToRgba(overlayColor, overlay) }} aria-hidden="true" />
        <div className="relative flex flex-col items-center w-full max-w-2xl">
          {/* Logo arriba, centrado */}
          {event.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logoUrl} alt={event.name} className="h-16 md:h-20 w-auto mb-8 md:mb-10 drop-shadow-lg" />
          )}
          {/* Imagen destacada del evento (si se subió); si no, el nombre como título */}
          {heroUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={heroUrl} alt={event.name} className="w-full max-w-xs sm:max-w-md md:max-w-lg h-auto mb-6 drop-shadow-2xl" />
              <p className="text-lg md:text-xl mb-1" style={{ fontFamily: titleFont.stack, color: titleColor, opacity: 0.85, textShadow: titleShadow }}>Bienvenidos</p>
              <h1 className="text-2xl md:text-3xl font-semibold mb-8 break-words max-w-full" style={{ fontFamily: titleFont.stack, color: titleColor, textShadow: titleShadow }}>{event.name}</h1>
            </>
          ) : (
            <>
              <p className="text-lg md:text-xl mb-2" style={{ fontFamily: titleFont.stack, color: titleColor, opacity: 0.85, textShadow: titleShadow }}>Bienvenidos</p>
              <h1 className={`${titleSizeClass} font-bold mb-8 break-words max-w-full`} style={{ fontFamily: titleFont.stack, color: titleColor, textShadow: titleShadow }}>{event.name}</h1>
            </>
          )}
          <button onClick={() => setStep(mode === 'rut' ? 'rut' : (schedules.length ? 'fecha' : 'form'))} className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-white font-semibold shadow-lg hover:brightness-110 transition" style={{ backgroundColor: buttonColor, color: buttonTextColor }}>
            Entrar <ArrowRight className="h-5 w-5" />
          </button>
          {event.description && <p className="mt-6 text-sm text-white/70 max-w-xl">{event.description}</p>}
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
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 md:bg-fixed" style={pageStyle}>
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
          <button onClick={doLookup} disabled={lookupLoading} className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-white font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-60" style={{ backgroundColor: buttonColor, color: buttonTextColor }}>
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
      <div className="relative min-h-screen px-4 py-10 md:py-14 md:bg-fixed" style={pageStyle}>
        {overlayNode}
        <div className="relative max-w-4xl mx-auto">
          <header className="text-center mb-8 md:mt-16">
            {event.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.logoUrl} alt={event.name} className="h-16 w-auto mx-auto mb-4 drop-shadow" />
            )}
            <h1 className="text-2xl sm:text-3xl font-bold break-words" style={{ color: datesTitleColor }}>Elige una fecha de asistencia</h1>
            <p className="mt-2" style={{ color: hexToRgba(datesSubtitleColor, 0.8) }}>Selecciona la fecha y lugar al que asistirás.</p>
            {allowMultiple && registeredScheduleIds.length > 0 && (
              <p className="text-emerald-200/90 mt-2 text-sm">Ya estás inscrito en {registeredScheduleIds.length} fecha(s). Puedes elegir una nueva — las que ya tienes aparecen marcadas.</p>
            )}
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          </header>

          <div className={`flex flex-wrap justify-center gap-4 mx-auto ${
            schedules.length === 1 ? 'max-w-[20rem]'
            : (schedules.length === 2 || schedules.length === 4) ? 'max-w-[40rem]'
            : ''
          }`}>
            {schedules.map(renderDateCard)}
          </div>

          <div className="mt-8 flex justify-center">
            <button type="button" disabled={!selectedScheduleId} onClick={() => setStep('form')} className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-white font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-50" style={{ backgroundColor: buttonColor, color: buttonTextColor }}>
              Continuar <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Formulario ----
  return (
    <div className="relative min-h-screen px-4 py-10 md:py-14 md:bg-fixed" style={pageStyle}>
      {overlayNode}
      <style>{`@media (min-width:768px){.gala-form-block{margin-top:${galaFormOffset}px}}`}</style>
      <div className="relative max-w-2xl mx-auto gala-form-block">
        <header className="text-center mb-6">
          {event.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.logoUrl} alt={event.name} className="h-16 w-auto mx-auto mb-4 drop-shadow" />
          )}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold break-words" style={{ fontFamily: titleFont.stack, color: titleColor, textShadow: titleShadow }}>{event.name}</h1>
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

        <form onSubmit={handleSubmit} className="rounded-3xl p-6 md:p-8 shadow-2xl" style={{ backgroundColor: galaCustomForm ? (theme.formBackgroundColor || '#0b1220') : 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)' }}>
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
                {ff.email.enabled && (
                  <input className={`${inputClass} md:col-span-2`} style={inputStyle} type="email" placeholder={`Correo electrónico${ff.email.required ? ' *' : ''}`} value={form.email} onChange={(e) => setField('email', e.target.value)} />
                )}
                {ff.dietary.enabled && (
                  <div className="md:col-span-2">
                    <label className="block text-white/80 text-sm mb-1">Preferencia alimenticia{ff.dietary.required ? ' *' : ''}</label>
                    <button type="button" onClick={() => { setDietTemp(form.dietaryPreference); setDietModalOpen(true); }} className={`${inputClass} flex items-center justify-between`} style={inputStyle}>
                      <span className={dietChosen ? '' : 'text-white/50'}>{dietChosen ? dietLabelOf(form.dietaryPreference) : 'Escoger opción'}</span>
                      <ChevronDown className="h-5 w-5 text-white/60 flex-shrink-0" />
                    </button>
                    {isFreeTextDiet(form.dietaryPreference) && (
                      <input className={`${inputClass} mt-2`} style={inputStyle} maxLength={DIET_COMMENTS_MAX} placeholder={String(form.dietaryPreference).toUpperCase().includes('ALERG') ? 'Especifica tu alergia' : 'Especifica tu requerimiento'} value={form.dietaryComments} onChange={(e) => setField('dietaryComments', e.target.value)} />
                    )}
                  </div>
                )}
              </div>

              {customQuestions.length > 0 && (
                <div className="mb-5 mt-4">
                  <CustomQuestionFields questions={customQuestions} answers={customAnswers} onChange={setCustomAnswers} tone="dark" accent={buttonColor} />
                </div>
              )}

              {/* Cargas */}
              {cargas.length > 0 && (
                <div className="mb-5">
                  <p className="text-white font-semibold mb-2">Cargas</p>
                  <div className="space-y-2">
                    {cargas.map((c, idx) => (
                      <div key={c.id} className="p-3 rounded-xl border" style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.2)' }}>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={c.selected} onChange={(e) => setCargas((arr) => arr.map((x, i) => (i === idx ? { ...x, selected: e.target.checked } : x)))} className="w-5 h-5" style={{ accentColor: primary }} />
                          <span className="text-white">
                            {c.firstName} {c.lastName || ''}
                            {/* Sin edición de dieta: se muestra la preferencia precargada como etiqueta. */}
                            {!guestDiet && c.dietaryPreference && dietaryLabel(c.dietaryPreference) !== 'Ninguna' && (
                              <span className="text-white/60 text-xs ml-2">· {dietaryLabel(c.dietaryPreference)}</span>
                            )}
                          </span>
                        </label>
                        {/* Con dieta de invitados activa, el asistente puede corregir la de la carga precargada. */}
                        {guestDiet && c.selected && (
                          <select className={`${inputClass} mt-2`} style={inputStyle} value={c.dietaryPreference || 'NONE'} onChange={(e) => setCargas((arr) => arr.map((x, i) => (i === idx ? { ...x, dietaryPreference: e.target.value } : x)))}>
                            {ensureDietOption(dietOpts, c.dietaryPreference).map((o) => <option key={o.value} value={o.value} style={{ color: '#111' }}>{`Preferencia alimenticia: ${o.label}`}</option>)}
                          </select>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Acompañante — solo si el evento deja cupo para uno. */}
              {event.allowGuests && maxGuests > 0 && (
                <div className="mb-2">
                  <label className="flex items-center gap-3 text-white font-semibold cursor-pointer">
                    <input type="checkbox" checked={acompEnabled} onChange={(e) => setAcompEnabled(e.target.checked)} className="w-5 h-5" style={{ accentColor: primary }} />
                    ¿Asistes con acompañante?
                  </label>
                  {acompEnabled && (
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input className={inputClass} style={inputStyle} placeholder="Nombre del acompañante" value={acomp.firstName} onChange={(e) => setAcomp((a) => ({ ...a, firstName: e.target.value }))} />
                        <input className={inputClass} style={inputStyle} placeholder="Apellido del acompañante" value={acomp.lastName} onChange={(e) => setAcomp((a) => ({ ...a, lastName: e.target.value }))} />
                      </div>
                      {guestDiet && (
                        <>
                          <select className={inputClass} style={inputStyle} value={acomp.dietaryPreference} onChange={(e) => setAcomp((a) => ({ ...a, dietaryPreference: e.target.value }))}>
                            {ensureDietOption(dietOpts, acomp.dietaryPreference).map((o) => <option key={o.value} value={o.value} style={{ color: '#111' }}>{`Preferencia alimenticia: ${o.label}`}</option>)}
                          </select>
                          {isFreeTextDiet(acomp.dietaryPreference) && (
                            <input
                              className={inputClass}
                              style={inputStyle}
                              maxLength={GUEST_DIET_DETAIL_MAX}
                              placeholder={String(acomp.dietaryPreference).toUpperCase().includes('ALERG') ? 'Especifica la alergia' : 'Especifica el requerimiento'}
                              value={acomp.dietaryComments}
                              onChange={(e) => setAcomp((a) => ({ ...a, dietaryComments: e.target.value }))}
                            />
                          )}
                        </>
                      )}
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
                {ff.email.enabled && (
                  <input className={`${inputClass} md:col-span-2`} style={inputStyle} type="email" placeholder={`Correo electrónico${ff.email.required ? ' *' : ''}`} value={form.email} onChange={(e) => setField('email', e.target.value)} />
                )}
                {ff.dietary.enabled && (
                  <div className="md:col-span-2">
                    <label className="block text-white/80 text-sm mb-1">Preferencia alimenticia{ff.dietary.required ? ' *' : ''}</label>
                    <button type="button" onClick={() => { setDietTemp(form.dietaryPreference); setDietModalOpen(true); }} className={`${inputClass} flex items-center justify-between`} style={inputStyle}>
                      <span className={dietChosen ? '' : 'text-white/50'}>{dietChosen ? dietLabelOf(form.dietaryPreference) : 'Escoger opción'}</span>
                      <ChevronDown className="h-5 w-5 text-white/60 flex-shrink-0" />
                    </button>
                    {isFreeTextDiet(form.dietaryPreference) && (
                      <input
                        className={`${inputClass} mt-2`}
                        style={inputStyle}
                        maxLength={DIET_COMMENTS_MAX}
                        placeholder={String(form.dietaryPreference).toUpperCase().includes('ALERG') ? 'Especifica tu alergia' : 'Especifica tu requerimiento'}
                        value={form.dietaryComments}
                        onChange={(e) => setField('dietaryComments', e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>

              {customQuestions.length > 0 && (
                <div className="mt-5">
                  <CustomQuestionFields questions={customQuestions} answers={customAnswers} onChange={setCustomAnswers} tone="dark" accent={buttonColor} />
                </div>
              )}

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
                          // Más corto: este detalle viaja compuesto dentro de
                          // `dietaryPreference`, no en columna propia. Ver `dietary.ts`.
                          maxLength={GUEST_DIET_DETAIL_MAX}
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

          <button type="submit" disabled={submitting} className="mt-6 w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-3 text-white font-semibold shadow-lg hover:brightness-110 transition disabled:opacity-60" style={{ backgroundColor: buttonColor, color: buttonTextColor }}>
            {submitting ? 'Enviando…' : 'Registrarse'} <ArrowRight className="h-5 w-5" />
          </button>

          <p className="mt-6 text-center text-xs text-white/60">
            ¿Dudas o cambios en tu inscripción? Escríbenos a{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
          </p>

          {/* Modal de preferencia alimenticia (se abre desde el botón-select). */}
          {dietModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.35)' }} onClick={() => setDietModalOpen(false)}>
              <div className="w-full max-w-md sm:max-w-lg rounded-3xl p-8 shadow-2xl" style={{ backgroundColor: hexToRgba(dietModalColor, 0.6), backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,0.18)' }} onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-center mb-5">
                  <span className="text-white">Elige una </span>
                  <span style={{ color: primary }}>restricción alimentaria</span>
                </h3>
                <div className="space-y-2.5 max-h-[55vh] overflow-y-auto w-full max-w-[13rem] mx-auto">
                  {ensureDietOption(dietOpts, dietTemp).map((o) => {
                    const active = o.value === dietTemp;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setDietTemp(o.value)}
                        className="w-full rounded-full px-5 py-3 text-sm font-medium border transition text-center"
                        style={active
                          ? { backgroundColor: buttonColor, color: buttonTextColor, borderColor: buttonColor }
                          : { backgroundColor: 'rgba(255,255,255,0.06)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 flex justify-center gap-3">
                  <button type="button" onClick={() => setDietModalOpen(false)} className="px-5 py-2.5 rounded-full text-sm text-white/80 border" style={{ borderColor: 'rgba(255,255,255,0.25)' }}>Cancelar</button>
                  <button type="button" onClick={() => { setField('dietaryPreference', dietTemp); setDietChosen(true); setDietModalOpen(false); }} className="px-8 py-2.5 rounded-full text-sm font-semibold text-white transition" style={{ backgroundColor: buttonColor, color: buttonTextColor }}>Aceptar</button>
                </div>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
