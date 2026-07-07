'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { publicRegistrationSchema } from '@/utils/validators/participantSchemas';
import { getFormFields, guestDietaryEnabled, getGuestMode } from '@/utils/formFields';
import { getDietaryOptions, isFreeTextDiet, dietaryFull, ensureDietOption } from '@/utils/dietary';
import { sendConfirmationEmail } from '@/lib/emailjs';
import { buildGuestSummary } from '@/utils/guests';
import { isValidRut } from '@/utils/validators/rut';
import DateSelectModal from '@/components/public/DateSelectModal';
import { CONTACT_EMAIL } from '@/utils/contact';
import { Loader2, CheckCircle, AlertCircle, Calendar, ChevronDown, ShieldCheck } from 'lucide-react';

const FIELD_LABELS: Record<string, string> = { phone: 'Teléfono', documentNumber: 'RUT / Documento', company: 'Empresa', position: 'Cargo', numeroSap: 'Código SAP', dietary: 'Preferencia alimenticia' };
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
  const allSchedules: any[] = Array.isArray((event as any).schedules) ? (event as any).schedules : [];
  const availableSchedules = allSchedules.filter((s: any) => !s.full);
  const allFull = allSchedules.length > 0 && availableSchedules.length === 0;
  const variant: string = (event as any).publicTemplate || 'default';
  const multiple = !!(event as any).allowMultipleSchedules;
  // Con varias fechas, el modal se abre primero (elegir fecha antes del formulario).
  const [showDateModal, setShowDateModal] = useState(availableSchedules.length > 1);
  const guestDiet = guestDietaryEnabled((event as any).registrationConfig);
  const dietOpts = getDietaryOptions((event as any).registrationConfig);
  const maxGuests = Number((event as any).maxGuestsPerParticipant) || 0;
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
  const [openGuests, setOpenGuests] = useState<{ firstName: string; lastName: string; dietaryPreference?: string; dietaryComments?: string }[]>([]);
  const addGuest = () => setOpenGuests((g) => (g.length < maxGuests ? [...g, { firstName: '', lastName: '', dietaryPreference: 'NONE', dietaryComments: '' }] : g));
  const removeGuest = (i: number) => setOpenGuests((g) => g.filter((_, idx) => idx !== i));
  const updateGuest = (i: number, k: string, v: string) => setOpenGuests((g) => g.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<PublicRegistrationFormData>({
    resolver: zodResolver(publicRegistrationSchema),
    defaultValues: {
      // Con una sola fecha disponible se pre-selecciona; con varias se deja vacío
      // para que el asistente abra el modal y elija (más claro).
      scheduleIds: availableSchedules.length === 1 ? [availableSchedules[0].id] : []
    }
  });

  // Reja de RUT (modo 'rut'): busca al participante precargado y precarga sus datos.
  const doLookup = async () => {
    setLookupError('');
    if (!isValidRut(rutInput)) { setLookupError('Ingresa un RUT válido (ej. 12345678-9).'); return; }
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
      // Precargar dieta e invitados registrados en la precarga.
      setValue('dietaryPreference', p.dietaryPreference || 'NONE');
      setValue('dietaryComments', p.dietaryComments || '');
      if (Array.isArray(data.guests) && data.guests.length) {
        setOpenGuests(data.guests.map((g: any) => ({
          firstName: g.firstName || '',
          lastName: g.lastName || '',
          dietaryPreference: g.dietaryPreference || 'NONE',
          dietaryComments: '',
        })));
      }
      // Invitados en modos numéricos (count / companion).
      if (p.guestCount != null) setCountGuests(Number(p.guestCount) || 0);
      if (p.guestCompanion != null) setCompanion(!!p.guestCompanion);
      if (p.guestLoads != null) setLoads(Number(p.guestLoads) || 0);
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

  const onSubmit = async (data: PublicRegistrationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Validar campos obligatorios configurados por el evento.
      const missing: string[] = [];
      for (const key of Object.keys(ff)) {
        if (!ff[key].enabled || !ff[key].required) continue;
        const val = key === 'dietary' ? (data as any).dietaryPreference : (data as any)[key];
        if (!val || val === '' || (key === 'dietary' && val === 'NONE')) missing.push(FIELD_LABELS[key]);
      }
      if (missing.length) { setError('Completa los campos obligatorios: ' + missing.join(', ') + '.'); setIsSubmitting(false); return; }

      // Invitados según el modo del evento.
      let guests: any[] = [];
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
          guests = openGuests
            .filter((g) => g.firstName.trim())
            .map((g) => {
              const gd: any = {};
              if (guestDiet) {
                // El invitado no tiene columna de comentarios: si eligió Alergia/Otro y escribió,
                // guardamos el detalle dentro de dietaryPreference (ej.: "Alergia: maní").
                gd.dietaryPreference = isFreeTextDiet(g.dietaryPreference) && (g.dietaryComments || '').trim()
                  ? dietaryFull(g.dietaryPreference, g.dietaryComments)
                  : (g.dietaryPreference || 'NONE');
              }
              return { firstName: g.firstName.trim(), lastName: g.lastName.trim() || undefined, guestType: 'ACOMPANANTE', ...gd };
            });
        }
      }
      const response = await fetch(`/api/public/events/${slug}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, ...guestData, guests, ...(registrationMode === 'rut' && rutParticipantId ? { participantId: rutParticipantId } : {}) }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Error en el registro');
      }

      // Correo de confirmación con EmailJS (best-effort): la inscripción ya quedó
      // guardada, así que un fallo de correo NO debe romper el éxito.
      try {
        const templateId = (event as any).emailTemplate?.templateId;
        if (templateId) {
          const schedule = ((event as any).schedules || []).find((s: any) => s.id === (data.scheduleIds || [])[0]);
          const nombre = `${data.firstName} ${data.lastName}`.trim();
          // Invitados según el modo del evento (un solo texto sirve para los 3 modos).
          const gs = buildGuestSummary(guestMode, {
            names: guests.map((g: any) => `${g.firstName} ${g.lastName || ''}`.trim()),
            count: guestData.guestCount,
            companion,
            loads,
          });
          await sendConfirmationEmail(templateId, {
            to_email: data.email,
            email: data.email,
            participant_name: nombre,
            nombre,
            event_name: event.name,
            schedule_name: schedule ? (schedule.label || schedule.scheduleName) : '',
            fechaEvento: schedule ? new Date(schedule.startDateTime).toLocaleDateString('es-CL') : '',
            lugarEvento: schedule?.location || event.location || '',
            guests_count: String(gs.count),
            guests_summary: gs.summary,
          });
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
    />
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 apf-form">
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

        <div className="sm:col-span-2">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Correo electrónico *
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
                {...register('dietaryComments')}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {allowGuests && maxGuests > 0 && guestMode === 'named' && (
        <div className="border-t border-gray-200 pt-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invitados <span className="text-gray-400 font-normal">(hasta {maxGuests})</span>
          </label>
          <div className="space-y-2">
            {openGuests.map((g, i) => (
              <div key={i} className="border border-gray-200 rounded-md p-2 space-y-2">
                <div className="flex gap-2">
                  <input value={g.firstName} onChange={(e) => updateGuest(i, 'firstName', e.target.value)} placeholder={`Nombre del invitado ${i + 1}`} className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                  <input value={g.lastName} onChange={(e) => updateGuest(i, 'lastName', e.target.value)} placeholder="Apellido" className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                  <button type="button" onClick={() => removeGuest(i)} title="Quitar" className="px-3 text-gray-400 hover:text-red-600 border border-gray-300 rounded-md flex-shrink-0">✕</button>
                </div>
                {guestDiet && (
                  <select value={g.dietaryPreference || 'NONE'} onChange={(e) => updateGuest(i, 'dietaryPreference', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white">
                    {ensureDietOption(dietOpts, g.dietaryPreference).map((o) => <option key={o.value} value={o.value}>Preferencia alimenticia: {o.label}</option>)}
                  </select>
                )}
                {guestDiet && isFreeTextDiet(g.dietaryPreference) && (
                  <input
                    value={g.dietaryComments || ''}
                    onChange={(e) => updateGuest(i, 'dietaryComments', e.target.value)}
                    placeholder={String(g.dietaryPreference).toUpperCase().includes('ALERG') ? 'Especifica la alergia' : 'Especifica el requerimiento'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                )}
              </div>
            ))}
          </div>
          {openGuests.length < maxGuests && (
            <button type="button" onClick={addGuest} className="mt-2 text-sm font-medium" style={{ color: primary }}>+ Agregar invitado</button>
          )}
        </div>
      )}

      {/* Modo 'count': solo el número de invitados. */}
      {allowGuests && maxGuests > 0 && guestMode === 'count' && (
        <div className="border-t border-gray-200 pt-5">
          <label htmlFor="guestCount" className="block text-sm font-medium text-gray-700 mb-2">
            ¿Cuántos invitados llevas? <span className="text-gray-400 font-normal">(hasta {maxGuests})</span>
          </label>
          <input
            id="guestCount"
            type="number"
            min={0}
            max={maxGuests}
            value={countGuests}
            onChange={(e) => setCountGuests(Math.max(0, Math.min(maxGuests, parseInt(e.target.value, 10) || 0)))}
            className="block w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      )}

      {/* Modo 'companion': acompañante (sí/no) + número de cargas. */}
      {allowGuests && maxGuests > 0 && guestMode === 'companion' && (
        <div className="border-t border-gray-200 pt-5 space-y-3">
          <label className="block text-sm font-medium text-gray-700">
            Invitados <span className="text-gray-400 font-normal">(hasta {maxGuests} en total)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={companion}
              onChange={(e) => setCompanion(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Voy con acompañante
          </label>
          <div>
            <label htmlFor="guestLoads" className="block text-sm text-gray-700 mb-1">Número de cargas</label>
            <input
              id="guestLoads"
              type="number"
              min={0}
              max={Math.max(0, maxGuests - (companion ? 1 : 0))}
              value={loads}
              onChange={(e) => setLoads(Math.max(0, Math.min(Math.max(0, maxGuests - (companion ? 1 : 0)), parseInt(e.target.value, 10) || 0)))}
              className="block w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <p className="text-xs text-gray-500">Total de invitados: {(companion ? 1 : 0) + loads}</p>
        </div>
      )}

      {/* Selección de fecha mediante modal (si hay una sola, se muestra fija). */}
      {allSchedules.length > 0 && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Fecha del evento *</label>
          {allSchedules.length === 1 ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
              <span>{(allSchedules[0].label || allSchedules[0].scheduleName)} · {new Date(allSchedules[0].startDateTime).toLocaleString()}</span>
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
