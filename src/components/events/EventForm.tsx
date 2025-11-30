'use client';

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useEventStore from '@/store/eventStore';
import { createEventSchema, updateEventSchema } from '@/utils/validators/eventSchemas';
import { errorHandler } from '@/utils/errors';

// Define a frontend-safe Event interface
interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  maxCapacity: number | null;
  allowGuests: boolean;
  maxGuestsPerParticipant: number;
}

// Schema for form validation
const eventFormValidationSchema = createEventSchema.extend({
  id: z.string().uuid().optional(),
});

type EventFormInputs = z.infer<typeof eventFormValidationSchema>;

interface EventFormProps {
  event?: Event;
  onClose: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ event, onClose }) => {
  const { createEvent, updateEvent } = useEventStore();
  const isEditMode = !!event;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EventFormInputs>({
    resolver: zodResolver(eventFormValidationSchema),
    defaultValues: {
      id: event?.id,
      name: event?.name || '',
      description: event?.description || '',
      location: event?.location || '',
      maxCapacity: event?.maxCapacity ?? null,
      allowGuests: event?.allowGuests ?? true,
      maxGuestsPerParticipant: event?.maxGuestsPerParticipant ?? 0,
    },
  });

  const onSubmit: SubmitHandler<EventFormInputs> = async (data) => {
    try {
      if (isEditMode && event) {
        // Use updateEventSchema for submission
        const submissionData = updateEventSchema.parse(data);
        await updateEvent(event.id, submissionData);
      } else {
        // Use createEventSchema for submission
        const submissionData = createEventSchema.parse(data);
        await createEvent(submissionData);
      }
      onClose();
    } catch (error) {
      errorHandler(error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center">
      <div className="bg-white p-8 rounded-lg shadow-xl z-50 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">{isEditMode ? 'Edit Event' : 'Create New Event'}</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-6">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Event Name
              </label>
              <input
                type="text"
                id="name"
                {...register('name')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.name && <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                {...register('description')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                id="location"
                {...register('location')}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700">
                Max Capacity
              </label>
              <input
                type="number"
                id="maxCapacity"
                {...register('maxCapacity', {
                  setValueAs: (v) => (v === '' || v === null ? null : parseInt(v, 10)),
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.maxCapacity && <p className="mt-2 text-sm text-red-600">{errors.maxCapacity.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="allowGuests"
                    type="checkbox"
                    {...register('allowGuests')}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="allowGuests" className="font-medium text-gray-700">
                    Allow participants to bring guests
                  </label>
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="maxGuestsPerParticipant" className="block text-sm font-medium text-gray-700">
                Max Guests per Participant
              </label>
              <input
                type="number"
                id="maxGuestsPerParticipant"
                {...register('maxGuestsPerParticipant', {
                  setValueAs: (v) => (v === '' ? 0 : parseInt(v, 10)),
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              {errors.maxGuestsPerParticipant && <p className="mt-2 text-sm text-red-600">{errors.maxGuestsPerParticipant.message}</p>}
            </div>
          </div>

          <div className="pt-5 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Event')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
