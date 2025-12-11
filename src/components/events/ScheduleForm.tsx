'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createScheduleSchema } from '@/utils/validators/eventSchemas';
import EventSchedule from '@/models/EventSchedule';
import useEventStore from '@/store/eventStore';
import toast from 'react-hot-toast';

type ScheduleFormInputs = z.infer<typeof createScheduleSchema>;

interface ScheduleFormProps {
  eventId: string;
  schedule?: EventSchedule | null;
  onClose: () => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ eventId, schedule, onClose }) => {
  const isEditMode = !!schedule;
  const { loading, createSchedule, updateSchedule } = useEventStore();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ScheduleFormInputs>({
    resolver: zodResolver(createScheduleSchema),
    defaultValues: isEditMode
      ? {
        eventId: schedule.eventId,
        scheduleName: schedule.scheduleName,
        startDateTime: new Date(schedule.startDateTime).toISOString(),
        endDateTime: new Date(schedule.endDateTime).toISOString(),
        location: schedule.location || '',
        maxCapacity: schedule.maxCapacity || 0,
      }
      : { eventId, maxCapacity: 0, location: '' },
  });

  const onSubmit = async (data: ScheduleFormInputs) => {
    console.log('Submitting schedule data:', data);
    try {
      if (isEditMode) {
        // Call update schedule API
        console.log('Updating schedule with ID:', schedule?.id);
        await updateSchedule(schedule?.id!, data.eventId, data);

      } else {
        // Call create schedule API
        console.log('Creating new schedule for event ID:', data.eventId);
        await createSchedule(data);
      }

      toast.success(`Schedule ${isEditMode ? 'updated' : 'created'} successfully`);

      onClose();

    } catch (error) {
      toast.error('Error saving event');
      console.error(error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-6">{isEditMode ? 'Edit Schedule' : 'Create New Schedule'}</h4>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <input type="hidden" {...register('eventId')} />

        <div>
          <label htmlFor="scheduleName" className="block text-sm font-medium text-gray-700 mb-1">Schedule Name</label>
          <input
            type="text"
            id="scheduleName"
            {...register('scheduleName')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="e.g. Morning Session"
          />
          {errors.scheduleName && <p className="mt-1 text-sm text-red-500">{errors.scheduleName.message}</p>}
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
          <input
            type="text"
            id="location"
            {...register('location')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="Specific location for this schedule"
          />
          {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="startDateTime" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
            <Controller
              control={control}
              name="startDateTime"
              render={({ field }) => (
                <DatePicker
                  id="startDateTime"
                  selected={field.value ? new Date(field.value) : null}
                  onChange={(date) => field.onChange(date?.toISOString())}
                  showTimeSelect
                  dateFormat="Pp"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholderText="Select start time"
                />
              )}
            />
            {errors.startDateTime && <p className="mt-1 text-sm text-red-500">{errors.startDateTime.message}</p>}
          </div>
          <div>
            <label htmlFor="endDateTime" className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
            <Controller
              control={control}
              name="endDateTime"
              render={({ field }) => (
                <DatePicker
                  id="endDateTime"
                  selected={field.value ? new Date(field.value) : null}
                  onChange={(date) => field.onChange(date?.toISOString())}
                  showTimeSelect
                  dateFormat="Pp"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                  placeholderText="Select end time"
                />
              )}
            />
            {errors.endDateTime && <p className="mt-1 text-sm text-red-500">{errors.endDateTime.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 mb-1">Max Capacity (Optional)</label>
          <input
            type="number"
            id="maxCapacity"
            {...register('maxCapacity', {
              setValueAs: v => v === '' ? 0 : parseInt(v, 10)
            })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="Leave empty to inherit from event"
          />
          {errors.maxCapacity && <p className="mt-1 text-sm text-red-500">{errors.maxCapacity.message}</p>}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Schedule')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleForm;
