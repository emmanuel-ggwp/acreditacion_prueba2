'use client';

import React, { useEffect } from 'react';
import { useForm, SubmitHandler, UseFormRegister, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useParticipantStore from '@/store/participantStore';
import useEventStore from '@/store/eventStore';
import { createParticipantSchema, updateParticipantSchema } from '@/utils/validators/participantSchemas';
import Participant from '@/models/Participant';
import { errorHandler } from '@/utils/errors';

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
  const { createParticipant, updateParticipant } = useParticipantStore();
  const { schedules, fetchSchedulesForEvent } = useEventStore();
  const isEditMode = !!participant;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    reset,
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
      scheduleIds: [], // Initialize with empty array or participant's schedules if available
    },
  });

  useEffect(() => {
    fetchSchedulesForEvent(eventId);
  }, [eventId, fetchSchedulesForEvent]);

  useEffect(() => {
    if (participant) {
      // TODO: Populate scheduleIds from participant data if available
      // Assuming participant has schedules loaded, we would map them here.
      // For now, we might need to fetch them or assume they are passed.
      // If participant.EventSchedules exists:
      const currentScheduleIds = (participant as any).EventSchedules?.map((s: any) => s.id) || [];
      
      reset({
        ...participant,
        phone: participant.phone ?? '',
        documentNumber: participant.documentNumber ?? '',
        company: participant.company ?? '',
        position: participant.position ?? '',
        scheduleIds: currentScheduleIds,
      });
    }
  }, [participant, reset]);

  const onSubmit: SubmitHandler<ParticipantFormData> = async (data) => {
    try {
      // Remove eventId injection
      const participantData = { ...data };
      
      if (isEditMode && participant) {
        const submissionData = updateParticipantSchema.parse(participantData);
        await updateParticipant(participant.id, submissionData);
      } else {
        const submissionData = createParticipantSchema.parse(participantData);
        await createParticipant({
            ...submissionData,
            id: '', // Mocking properties expected by the store
            createdBy: '',
            isAccredited: false,
        });
      }
      onClose();
    } catch (e) {
      errorHandler(e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Participant' : 'Create New Participant'}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField label="First Name" name="firstName" register={register} error={errors.firstName} />
            <InputField label="Last Name" name="lastName" register={register} error={errors.lastName} />
            <InputField label="Email" name="email" type="email" register={register} error={errors.email} />
            <InputField label="Phone" name="phone" register={register} error={errors.phone} />
            <InputField label="Document Number" name="documentNumber" register={register} error={errors.documentNumber} />
            <InputField label="Company" name="company" register={register} error={errors.company} />
            <InputField label="Position" name="position" register={register} error={errors.position} />
            <InputField label="Allowed Guests" name="allowedGuests" type="number" register={register} error={errors.allowedGuests} />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Schedules</label>
            <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                {schedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-center mb-2">
                        <input
                            type="checkbox"
                            id={`schedule-${schedule.id}`}
                            value={schedule.id}
                            {...register('scheduleIds')}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`schedule-${schedule.id}`} className="ml-2 block text-sm text-gray-900">
                            {schedule.name} ({new Date(schedule.startTime).toLocaleString()})
                        </label>
                    </div>
                ))}
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
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Participant')}
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
