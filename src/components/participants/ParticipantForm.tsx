'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, UseFormRegister, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useParticipantStore from '@/store/participantStore';
import useEventStore from '@/store/eventStore';
import { createParticipantSchema, updateParticipantSchema } from '@/utils/validators/participantSchemas';
import Participant from '@/models/Participant';
import { errorHandler } from '@/utils/errors';
import { Clock } from 'lucide-react';
import EventSchedule from '@/models/EventSchedule';
import { showToast } from '@/components/ui/Toast';
import GuestList from './GuestList';
import { getFormFields, guestDietaryEnabled } from '@/utils/formFields';
import { getDietaryOptions } from '@/utils/dietary';

const participantFormSchema = createParticipantSchema.extend({
  id: z.guid().optional(),
});

type ParticipantFormData = z.input<typeof participantFormSchema>;

interface ParticipantFormProps {
  eventId: string;
  participant?: Participant;
  onClose?: () => void;
}

const ParticipantForm: React.FC<ParticipantFormProps> = ({ eventId, participant, onClose }) => {
  const { createParticipant, updateParticipant, fetchParticipantById, currentParticipant, searchParticipants } = useParticipantStore();
  const { EventSchedules, fetchSchedulesForEvent, events, currentEvent, fetchEventById } = useEventStore();
  const isEditMode = !!participant;

  // Config de campos del evento: el admin ve los mismos campos habilitados en la landing.
  const eventForCfg: any = (currentEvent && currentEvent.id === eventId) ? currentEvent : (events || []).find((e: any) => e.id === eventId);
  const ff = getFormFields(eventForCfg?.registrationConfig);
  const dietOpts = getDietaryOptions(eventForCfg?.registrationConfig);
  const guestDiet = guestDietaryEnabled(eventForCfg?.registrationConfig);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<ParticipantFormData>({
    resolver: zodResolver(participantFormSchema),
    defaultValues: {
      id: participant?.id,
      firstName: participant?.firstName || '',
      lastName: participant?.lastName || '',
      email: participant?.email || '',
      phone: participant?.phone || '',
      documentNumber: participant?.documentNumber || '',
      company: participant?.company || '',
      position: participant?.position || '',
      numeroSap: (participant as any)?.numeroSap || '',
      allowedGuests: participant?.allowedGuests || 0,
      allowMultipleSchedules: participant?.allowMultipleSchedules || false,
      dietaryPreference: participant?.dietaryPreference || 'NONE',
      dietaryComments: participant?.dietaryComments || '',
      scheduleIds: [],
    },
  });

  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const documentNumberValue = watch('documentNumber');
  const participantId = watch('id');
  const isEffectiveEditMode = isEditMode || !!participantId;

  useEffect(() => {
    const search = async () => {
      if (documentNumberValue && documentNumberValue.length >= 3 && !isEditMode) {
        setIsSearching(true);
        try {
          const results = await searchParticipants(eventId, documentNumberValue);
          setSearchResults(results);
          setShowResults(true);
        } catch (error) {
          console.error(error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    };

    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [documentNumberValue, eventId, searchParticipants, isEditMode]);

  const handleSelectParticipant = (p: Participant) => {
    reset({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      phone: p.phone || '',
      documentNumber: p.documentNumber || '',
      company: p.company || '',
      position: p.position || '',
      numeroSap: (p as any).numeroSap || '',
      allowedGuests: p.allowedGuests,
      dietaryPreference: p.dietaryPreference || 'NONE',
      dietaryComments: p.dietaryComments || '',
      scheduleIds: [], 
    });
    setShowResults(false);
  };

  useEffect(() => {
    fetchSchedulesForEvent(eventId);
    fetchEventById(eventId);
  }, [eventId, fetchSchedulesForEvent, fetchEventById]);

  useEffect(() => {
    if (participant?.id) {
      fetchParticipantById(participant.id, { includeGuests: true, includeSchedules: true });
    }
  }, [participant?.id, fetchParticipantById]);

  useEffect(() => {
    if (participant && currentParticipant && currentParticipant.id === participant.id) {
      const scheduleIds = (currentParticipant as any).schedules?.map((s: any) => s.id) || [];
      reset({
        id: currentParticipant.id,
        firstName: currentParticipant.firstName,
        lastName: currentParticipant.lastName,
        email: currentParticipant.email,
        phone: currentParticipant.phone || '',
        documentNumber: currentParticipant.documentNumber || '',
        company: currentParticipant.company || '',
        position: currentParticipant.position || '',
        numeroSap: (currentParticipant as any).numeroSap || '',
        allowedGuests: currentParticipant.allowedGuests,
        allowMultipleSchedules: (currentParticipant as any).allowMultipleSchedules || false,
        dietaryPreference: currentParticipant.dietaryPreference || 'NONE',
        dietaryComments: currentParticipant.dietaryComments || '',
        scheduleIds: scheduleIds,
      });
    }
  }, [currentParticipant, participant, reset]);

  const onSubmit: SubmitHandler<ParticipantFormData> = async (data) => {
    try {
      // Remove eventId injection
      const participantData = { ...data };

      if (isEffectiveEditMode) {
        const id = participant?.id || data.id;
        if (id) {
          const submissionData = updateParticipantSchema.parse(participantData);
          await updateParticipant(id, submissionData);
          showToast.success('Participante actualizado correctamente');
        } else {
          throw new Error('Participant ID is required for update.');
        }
        onClose?.();
      } else {
        const submissionData = createParticipantSchema.parse({ ...participantData, eventId });
        await createParticipant(submissionData);
        showToast.success('Participante creado correctamente');
        onClose?.();
      }
    } catch (e) {
      const error = errorHandler(e);
      showToast.error(error.message);
    }
  };

  console.log('EventSchedules in ParticipantForm:', EventSchedules);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{isEffectiveEditMode ? 'Editar participante' : 'Crear nuevo participante'}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ff.documentNumber.enabled && (
            <div className="relative col-span-1 md:col-span-2">
              <InputField label={`RUT / Documento${ff.documentNumber.required ? ' *' : ''}`} name="documentNumber" register={register} error={errors.documentNumber} />
              {isSearching && <div className="absolute right-3 top-9 text-gray-400 text-sm">Buscando...</div>}
              {showResults && searchResults.length > 0 && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto mt-1">
                  {searchResults.map((p) => (
                    <li
                      key={p.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSelectParticipant(p)}
                    >
                      <div className="font-medium text-gray-900">
                        {p.firstName} {p.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {p.documentNumber} - {p.email}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            )}
            <InputField label="Nombre" name="firstName" register={register} error={errors.firstName} />
            <InputField label="Apellido" name="lastName" register={register} error={errors.lastName} />
            <InputField label="Correo" name="email" type="email" register={register} error={errors.email} />
            {ff.phone.enabled && <InputField label={`Teléfono${ff.phone.required ? ' *' : ''}`} name="phone" register={register} error={errors.phone} />}
            {ff.company.enabled && <InputField label={`Empresa${ff.company.required ? ' *' : ''}`} name="company" register={register} error={errors.company} />}
            {ff.position.enabled && <InputField label={`Cargo${ff.position.required ? ' *' : ''}`} name="position" register={register} error={errors.position} />}
            {ff.numeroSap.enabled && <InputField label={`Código SAP${ff.numeroSap.required ? ' *' : ''}`} name={'numeroSap' as any} register={register} error={(errors as any).numeroSap} />}
            <InputField label="Invitados permitidos" name="allowedGuests" type="number" register={register} error={errors.allowedGuests} />

            <label className="col-span-1 md:col-span-2 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" {...register('allowMultipleSchedules')} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              Permitir que este participante se inscriba en <b>varias fechas</b> (aunque el evento no lo permita)
            </label>

            {ff.dietary.enabled && (
            <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
               <h3 className="text-sm font-medium text-gray-900 mb-3">Requerimientos alimentarios</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dietaryPreference" className="block text-sm font-medium text-gray-700">Preferencia{ff.dietary.required ? ' *' : ''}</label>
                    <select
                      id="dietaryPreference"
                      {...register('dietaryPreference')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      {dietOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    {errors.dietaryPreference && <p className="mt-2 text-sm text-red-600">{errors.dietaryPreference.message}</p>}
                  </div>
                  <InputField label="Comentarios / Alergias" name="dietaryComments" register={register} error={errors.dietaryComments} />
               </div>
            </div>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Horarios</label>
            <p className="text-xs text-gray-500 mb-2">Sin horario seleccionado = participante <b>precargado</b> (podrá inscribirse luego por la landing). Marca uno o más para <b>inscribirlo</b> directamente.</p>
            <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
              {EventSchedules.length > 0 ? (
                EventSchedules.map((schedule: EventSchedule) => (
                  <div key={schedule.id} className="flex items-center mb-2">
                    <input
                      type="checkbox"
                      id={`schedule-${schedule.id}`}
                      value={schedule.id}
                      {...register('scheduleIds')}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor={`schedule-${schedule.id}`} className="ml-2 block text-sm text-gray-900">
                      {schedule.scheduleName} ({new Date(schedule.startDateTime).toLocaleString()})
                    </label>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Sin horarios</h3>
                  <p className="mt-1 text-sm text-gray-500">Comienza creando un nuevo horario para este evento.</p>
                </div>
              )}
            </div>
            {errors.scheduleIds && <p className="mt-2 text-sm text-red-600">{errors.scheduleIds.message}</p>}
          </div>

          {isEffectiveEditMode && participantId && (
            <div className="col-span-2 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Invitados</h3>
                <p className="text-xs text-gray-500">Permitidos: {watch('allowedGuests') || 0}</p>
              </div>
              <GuestList participantId={participantId} allowedGuests={watch('allowedGuests') || 0} guestDietary={guestDiet} dietaryOptions={dietOpts} />
            </div>
          )}

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={() => onClose?.()}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Guardando...' : (isEffectiveEditMode ? 'Guardar cambios' : 'Crear participante')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface InputFieldProps {
  label: string;
  name: keyof ParticipantFormData;
  type?: string;
  register: UseFormRegister<ParticipantFormData>;
  error?: { message?: string };
}

const InputField: React.FC<InputFieldProps> = ({ label, name, type = 'text', register, error }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-gray-700">
      {label}
    </label>
    <input
      id={name}
      type={type}
      {...register(name, {
        valueAsNumber: type === 'number',
      })}
      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
    />
    {error && <p className="mt-2 text-sm text-red-600">{error.message}</p>}
  </div>
);

export default ParticipantForm;
