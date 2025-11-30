'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
// import { guestSchema } from '@/utils/validators/guestSchemas'; // Assuming this exists
// import useGuestStore from '@/store/guestStore'; // Assuming this exists

// Placeholder schema
const guestSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  documentNumber: z.string().optional(),
  participantId: z.string(),
});


type GuestFormData = z.infer<typeof guestSchema>;

interface GuestFormProps {
  participantId: string;
  onGuestAdded: () => void;
}

const GuestForm: React.FC<GuestFormProps> = ({ participantId, onGuestAdded }) => {
  // const { createGuest, loading, error } = useGuestStore();
  const loading = false;
  const error = null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestFormData>({
    resolver: zodResolver(guestSchema),
    defaultValues: { participantId },
  });

  const onSubmit = async (data: GuestFormData) => {
    try {
      // await createGuest(data);
      console.log("Creating guest", data);
      onGuestAdded();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-gray-100 p-4 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="guestFirstName" className="block text-sm font-medium text-gray-700">
            First Name
          </label>
          <input
            id="guestFirstName"
            {...register('firstName')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>}
        </div>
        <div>
          <label htmlFor="guestLastName" className="block text-sm font-medium text-gray-700">
            Last Name
          </label>
          <input
            id="guestLastName"
            {...register('lastName')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
          {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>}
        </div>
      </div>
      <div>
        <label htmlFor="guestDocumentNumber" className="block text-sm font-medium text-gray-700">
          Document Number
        </label>
        <input
          id="guestDocumentNumber"
          {...register('documentNumber')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.documentNumber && <p className="mt-1 text-sm text-red-600">{errors.documentNumber.message}</p>}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onGuestAdded} // This will just close the form
          className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 text-sm"
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Guest'}
        </button>
      </div>
    </form>
  );
};

export default GuestForm;
