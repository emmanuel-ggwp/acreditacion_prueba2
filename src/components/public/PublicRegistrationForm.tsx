'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { publicRegistrationSchema } from '@/utils/validators/participantSchemas';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';
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
}

export default function PublicRegistrationForm({ event, slug }: PublicRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<PublicRegistrationFormData>({
    resolver: zodResolver(publicRegistrationSchema),
    defaultValues: {
      allowedGuests: 0,
      scheduleIds: event.schedules && event.schedules.length > 0 ? [event.schedules[0].id] : []
    }
  });

  const onSubmit = async (data: PublicRegistrationFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/public/events/${slug}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md mx-auto">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
        <p className="text-gray-600 mb-6">
          You have successfully registered for <strong>{event.name}</strong>.
          We have sent a confirmation email to your address.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Register another person
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            First Name *
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
            Last Name *
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
            Email Address *
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

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone Number
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="phone"
              {...register('phone')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.phone && (
              <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="documentNumber" className="block text-sm font-medium text-gray-700">
            Document Number
          </label>
          <div className="mt-1">
            <input
              type="text"
              id="documentNumber"
              {...register('documentNumber')}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.documentNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.documentNumber.message}</p>
            )}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="company" className="block text-sm font-medium text-gray-700">
            Company / Organization
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

        <div className="sm:col-span-2">
          <label htmlFor="position" className="block text-sm font-medium text-gray-700">
            Job Position
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

        <div className="sm:col-span-2">
          <label htmlFor="dietaryPreference" className="block text-sm font-medium text-gray-700">
            Dietary Preference
          </label>
          <div className="mt-1">
            <select
              id="dietaryPreference"
              {...register('dietaryPreference')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="NONE">None</option>
              <option value="VEGETARIAN">Vegetarian</option>
              <option value="VEGAN">Vegan</option>
              <option value="CELIAC">Celiac (Gluten Free)</option>
              <option value="KOSHER">Kosher</option>
              <option value="HALAL">Halal</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </div>

        {watch('dietaryPreference') === 'OTHER' && (
          <div className="sm:col-span-2">
            <label htmlFor="dietaryComments" className="block text-sm font-medium text-gray-700">
              Please specify dietary requirements
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

      {/* Hidden field for scheduleIds - assuming single schedule for now or pre-selected */}
      {/* If multiple schedules are available, we should list them here as checkboxes */}
      {event.schedules && event.schedules.length > 1 && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Schedules *</label>
          <div className="space-y-2">
            {event.schedules.map((schedule) => (
              <div key={schedule.id} className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id={`schedule-${schedule.id}`}
                    type="checkbox"
                    value={schedule.id}
                    {...register('scheduleIds')}
                    className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor={`schedule-${schedule.id}`} className="font-medium text-gray-700">
                    {schedule.scheduleName}
                  </label>
                  <p className="text-gray-500">
                    {new Date(schedule.startDateTime).toLocaleString()} - {new Date(schedule.endDateTime).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            {errors.scheduleIds && (
              <p className="mt-1 text-sm text-red-600">{errors.scheduleIds.message}</p>
            )}
          </div>
        </div>
      )}

      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
              Registering...
            </>
          ) : (
            'Complete Registration'
          )}
        </button>
      </div>
    </form>
  );
}
