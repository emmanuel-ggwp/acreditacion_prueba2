'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createScheduleSchema } from '@/utils/validators/eventSchemas';
import EventSchedule from '@/models/EventSchedule';

type ScheduleFormInputs = z.infer<typeof createScheduleSchema>;

interface ScheduleFormProps {
  eventId: string;
  schedule?: EventSchedule | null;
  onClose: () => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({ eventId, schedule, onClose }) => {
  const isEditMode = !!schedule;
  // TODO: Integrate with a schedule store
  const loading = false;

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
          maxCapacity: schedule.maxCapacity || undefined,
        }
      : { eventId },
  });

  const onSubmit = (data: ScheduleFormInputs) => {
    console.log('Submitting schedule data:', data);
    // TODO: Call createSchedule or updateSchedule from store
    onClose();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4 bg-gray-50 rounded-lg border space-y-4">
      <h4 className="font-medium">{isEditMode ? 'Edit Schedule' : 'Create New Schedule'}</h4>
      
      <input type="hidden" {...register('eventId')} />

      <div>
        <label htmlFor="scheduleName" className="block text-sm font-medium text-gray-700">Schedule Name</label>
        <input
          type="text"
          id="scheduleName"
          {...register('scheduleName')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        />
        {errors.scheduleName && <p className="mt-1 text-sm text-red-500">{errors.scheduleName.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDateTime" className="block text-sm font-medium text-gray-700">Start Time</label>
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
              />
            )}
          />
          {errors.startDateTime && <p className="mt-1 text-sm text-red-500">{errors.startDateTime.message}</p>}
        </div>
        <div>
          <label htmlFor="endDateTime" className="block text-sm font-medium text-gray-700">End Time</label>
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
              />
            )}
          />
          {errors.endDateTime && <p className="mt-1 text-sm text-red-500">{errors.endDateTime.message}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700">Max Capacity (optional)</label>
        <input
          type="number"
          id="maxCapacity"
          {...register('maxCapacity', { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
        />
      </div>

      <div className="flex justify-end space-x-3">
        <button type="button" onClick={onClose} className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          {loading ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Schedule')}
        </button>
      </div>
    </form>
  );
};

export default ScheduleForm;
