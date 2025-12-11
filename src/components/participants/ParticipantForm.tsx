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

const participantFormSchema = createParticipantSchema.extend({
  id: z.guid().optional(),
});

type ParticipantFormData = z.input<typeof participantFormSchema>;

interface ParticipantFormProps {
  eventId: string;
  participant?: Participant;
  onClose: () => void;
}

const ParticipantForm: React.FC<ParticipantFormProps> = ({ eventId, participant, onClose }) => {
  const { createParticipant, updateParticipant, fetchParticipantById, currentParticipant, searchParticipants } = useParticipantStore();
  const { EventSchedules, fetchSchedulesForEvent } = useEventStore();
  const isEditMode = !!participant;

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
      allowedGuests: participant?.allowedGuests || 0,
      dietaryPreference: participant?.dietaryPreference || 'NONE',
      dietaryComments: participant?.dietaryComments || '',
      scheduleIds: [],
    },
  });

  const [searchResults, setSearchResults] = useState<Participant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const documentNumberValue = watch('documentNumber');
  const formId = watch('id');
  const isEffectiveEditMode = isEditMode || !!formId;

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
      allowedGuests: p.allowedGuests,
      dietaryPreference: p.dietaryPreference || 'NONE',
      dietaryComments: p.dietaryComments || '',
      scheduleIds: [], 
    });
    setShowResults(false);
  };

  useEffect(() => {
    fetchSchedulesForEvent(eventId);
  }, [eventId, fetchSchedulesForEvent]);

  useEffect(() => {
    if (!isEditMode && EventSchedules.length > 0) {
      const now = new Date();
      const sortedSchedules = [...EventSchedules].sort((a, b) => new Date(a.dataValues.startTime).getTime() - new Date(b.dataValues.startTime).getTime());

      const upcomingSchedule = sortedSchedules.find(s => new Date(s.startDateTime) > now);
      const targetSchedule = upcomingSchedule || sortedSchedules[sortedSchedules.length - 1];

      if (targetSchedule) {
        setValue('scheduleIds', [targetSchedule.id]);
      }
    }
  }, [isEditMode, EventSchedules, setValue]);

  useEffect(() => {
    if (participant?.id) {
      fetchParticipantById(participant.id);
    }
  }, [participant?.id, fetchParticipantById]);

  useEffect(() => {
    if (participant && currentParticipant && currentParticipant.id === participant.id) {
      const scheduleIds = (currentParticipant as any).EventSchedules?.map((s: any) => s.id) || [];
      reset({
        id: currentParticipant.id,
        firstName: currentParticipant.firstName,
        lastName: currentParticipant.lastName,
        email: currentParticipant.email,
        phone: currentParticipant.phone || '',
        documentNumber: currentParticipant.documentNumber || '',
        company: currentParticipant.company || '',
        position: currentParticipant.position || '',
        allowedGuests: currentParticipant.allowedGuests,
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
          showToast.success('Participant updated successfully');
        } else {
          throw new Error('Participant ID is required for update.');
        }
        onClose();
      } else {
        const submissionData = createParticipantSchema.parse(participantData);
        await createParticipant({
          ...submissionData,
        });
        showToast.success('Participant created successfully');
        onClose();
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
        <h2 className="text-2xl font-bold mb-6">{isEffectiveEditMode ? 'Edit Participant' : 'Create New Participant'}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <InputField label="Document Number" name="documentNumber" register={register} error={errors.documentNumber} />
              {isSearching && <div className="absolute right-3 top-9 text-gray-400 text-sm">Searching...</div>}
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
            <InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
            <InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
            <InputField label="Email" name="email" type="email" register={register} error={errors.email} />
            <InputField label="Phone" name="phone" register={register} error={errors.phone} />
            <InputField label="Company" name="company" register={register} error={errors.company} />
            <InputField label="Position" name="position" register={register} error={errors.position} />
            <InputField label="Allowed Guests" name="allowedGuests" type="number" register={register} error={errors.allowedGuests} />
            
            <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
               <h3 className="text-sm font-medium text-gray-900 mb-3">Dietary Requirements</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dietaryPreference" className="block text-sm font-medium text-gray-700">Preference</label>
                    <select
                      id="dietaryPreference"
                      {...register('dietaryPreference')}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    >
                      <option value="NONE">None</option>
                      <option value="VEGETARIAN">Vegetarian</option>
                      <option value="VEGAN">Vegan</option>
                      <option value="CELIAC">Celiac (Gluten Free)</option>
                      <option value="KOSHER">Kosher</option>
                      <option value="HALAL">Halal</option>
                      <option value="OTHER">Other</option>
                    </select>
                    {errors.dietaryPreference && <p className="mt-2 text-sm text-red-600">{errors.dietaryPreference.message}</p>}
                  </div>
                  <InputField label="Comments / Allergies" name="dietaryComments" register={register} error={errors.dietaryComments} />
               </div>
            </div>
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedules</label>
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No schedules</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new schedule for this event.</p>
                </div>
              )}
            </div>
            {errors.scheduleIds && <p className="mt-2 text-sm text-red-600">{errors.scheduleIds.message}</p>}
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : (isEffectiveEditMode ? 'Save Changes' : 'Create Participant')}
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
