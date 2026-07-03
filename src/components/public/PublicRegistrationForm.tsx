'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { publicRegistrationSchema } from '@/utils/validators/participantSchemas';
import { getFormFields, guestDietaryEnabled } from '@/utils/formFields';
import { getDietaryOptions } from '@/utils/dietary';
import { sendConfirmationEmail } from '@/lib/emailjs';
import DateSelectModal from '@/components/public/DateSelectModal';
import { CONTACT_EMAIL } from '@/utils/contact';
import { Loader2, CheckCircle, AlertCircle, Calendar, ChevronDown } from 'lucide-react';

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
  const primary: string = theme.primaryColor || '#4f46e5';
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
  const [openGuests, setOpenGuests] = useState<{ firstName: string; lastName: string; dietaryPreference?: string }[]>([]);
  const addGuest = () => setOpenGuests((g) => (g.length < maxGuests ? [...g, { firstName: '', lastName: '', dietaryPreference: 'NONE' }] : g));
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

      const guests = openGuests
        .filter((g) => g.firstName.trim())
        .map((g) => ({ firstName: g.firstName.trim(), lastName: g.lastName.trim() || undefined, guestType: 'ACOMPANANTE', ...(guestDiet ? { dietaryPreference: g.dietaryPreference || 'NONE' } : {}) }));
      const response = await fetch(`/api/public/events/${slug}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, guests }),
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
          await sendConfirmationEmail(templateId, {
            to_email: data.email,
            email: data.email,
            participant_name: nombre,
            nombre,
            event_name: event.name,
            schedule_name: schedule ? (schedule.label || schedule.scheduleName) : '',
            fechaEvento: schedule ? new Date(schedule.startDateTime).toLocaleDateString('es-CL') : '',
            lugarEvento: schedule?.location || event.location || '',
            guests_count: String(guests.length),
            guests_summary: guests.map((g: any) => `${g.firstName} ${g.lastName || ''}`.trim()).join(', '),
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
              {...register('documentNumber')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
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
              {dietOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        )}

        {ff.dietary.enabled && watch('dietaryPreference') === 'OTHER' && (
          <div className="sm:col-span-2">
            <label htmlFor="dietaryComments" className="block text-sm font-medium text-gray-700">
              Especifica tus requerimientos alimentarios
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

      {allowGuests && maxGuests > 0 && (
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
                    {dietOpts.map((o) => <option key={o.value} value={o.value}>Preferencia alimenticia: {o.label}</option>)}
                  </select>
                )}
              </div>
            ))}
          </div>
          {openGuests.length < maxGuests && (
            <button type="button" onClick={addGuest} className="mt-2 text-sm font-medium" style={{ color: primary }}>+ Agregar invitado</button>
          )}
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
