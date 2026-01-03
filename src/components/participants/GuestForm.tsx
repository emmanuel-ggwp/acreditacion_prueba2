'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createGuestSchema } from '@/utils/validators/participantSchemas';
import useGuestStore from '@/store/guestStore';
import Guest from '@/models/Guest';

type GuestFormData = z.infer<typeof createGuestSchema>;

interface GuestFormProps {
  participantId: string;
  guest?: Guest;
  onSaved: () => void;
  onCancel?: () => void;
}

const GuestForm: React.FC<GuestFormProps> = ({ participantId, guest, onSaved, onCancel }) => {
  const { createGuest, updateGuest, loading, error } = useGuestStore();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GuestFormData>({
    resolver: zodResolver(createGuestSchema),
    defaultValues: {
      participantId,
      firstName: guest?.firstName || '',
      lastName: guest?.lastName || '',
      documentNumber: guest?.documentNumber || '',
    },
  });

  const onSubmit = async (data: GuestFormData) => {
    try {
      if (guest) {
        await updateGuest(guest.id, {
          firstName: data.firstName,
          lastName: data.lastName,
          documentNumber: data.documentNumber,
        });
      } else {
        await createGuest(participantId, data);
        reset({ participantId, firstName: '', lastName: '', documentNumber: '' });
      }
      onSaved();
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
          onClick={onCancel || onSaved}
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
            {loading ? 'Saving...' : guest ? 'Update Guest' : 'Save Guest'}
          </button>
      </div>
    </form>
  );
};

export default GuestForm;
