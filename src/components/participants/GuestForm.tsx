'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createGuestSchema } from '@/utils/validators/participantSchemas';
import useGuestStore from '@/store/guestStore';
import Guest from '@/models/Guest';
import { DietOption, getDietaryOptions, isFreeTextDiet, dietaryFull } from '@/utils/dietary';

type GuestFormData = z.infer<typeof createGuestSchema>;

interface GuestFormProps {
  participantId: string;
  guest?: Guest;
  guestDietary?: boolean;
  dietaryOptions?: DietOption[];
  onSaved: () => void;
  onCancel?: () => void;
}

const GuestForm: React.FC<GuestFormProps> = ({ participantId, guest, guestDietary, dietaryOptions, onSaved, onCancel }) => {
  const dietOpts = dietaryOptions && dietaryOptions.length ? dietaryOptions : getDietaryOptions(undefined);
  const { createGuest, updateGuest, loading, error } = useGuestStore();

  // El invitado guarda la alergia/detalle dentro de dietaryPreference (ej.: "Alergia: maní").
  // Al editar, separamos la etiqueta base del detalle para poblar el select y el input.
  const storedPref: string = (guest as any)?.dietaryPreference || 'NONE';
  const encoded = typeof storedPref === 'string' && storedPref.includes(':');
  const basePref = encoded
    ? (storedPref.split(':')[0].toUpperCase().includes('ALERG') ? 'ALERGIA' : 'OTHER')
    : storedPref;
  const [allergyText, setAllergyText] = useState<string>(encoded ? storedPref.split(':').slice(1).join(':').trim() : '');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<GuestFormData>({
    resolver: zodResolver(createGuestSchema),
    defaultValues: {
      participantId,
      firstName: guest?.firstName || '',
      lastName: guest?.lastName || '',
      documentNumber: guest?.documentNumber || '',
      guestType: (guest as any)?.guestType || '',
      dietaryPreference: basePref,
    } as any,
  });

  const resolveDiet = (pref: any) =>
    isFreeTextDiet(pref) && allergyText.trim() ? dietaryFull(pref, allergyText) : (pref || null);

  const onSubmit = async (data: GuestFormData) => {
    try {
      const dietaryPreference = resolveDiet((data as any).dietaryPreference);
      if (guest) {
        await updateGuest(guest.id, {
          firstName: data.firstName,
          lastName: data.lastName,
          documentNumber: data.documentNumber,
          guestType: (data as any).guestType || null,
          dietaryPreference,
        } as any);
      } else {
        await createGuest(participantId, { ...data, dietaryPreference } as any);
        reset({ participantId, firstName: '', lastName: '', documentNumber: '', guestType: '', dietaryPreference: 'NONE' } as any);
        setAllergyText('');
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
            Nombre
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
            Apellido
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
          Número de documento
        </label>
        <input
          id="guestDocumentNumber"
          {...register('documentNumber')}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
        {errors.documentNumber && <p className="mt-1 text-sm text-red-600">{errors.documentNumber.message}</p>}
      </div>
      <div>
        <label htmlFor="guestType" className="block text-sm font-medium text-gray-700">Tipo de invitado</label>
        <select
          id="guestType"
          {...register('guestType' as any)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        >
          <option value="">Sin especificar</option>
          <option value="CARGA">Carga</option>
          <option value="ACOMPANANTE">Acompañante</option>
        </select>
      </div>

      {guestDietary && (
        <div>
          <label htmlFor="guestDiet" className="block text-sm font-medium text-gray-700">Preferencia alimenticia</label>
          <select
            id="guestDiet"
            {...register('dietaryPreference' as any)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            {dietOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {isFreeTextDiet(watch('dietaryPreference' as any)) && (
            <input
              value={allergyText}
              onChange={(e) => setAllergyText(e.target.value)}
              placeholder={String(watch('dietaryPreference' as any)).toUpperCase().includes('ALERG') ? 'Especifica la alergia' : 'Especifica el requerimiento'}
              className="mt-2 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel || onSaved}
          className="bg-gray-200 text-gray-700 px-3 py-1 rounded-lg hover:bg-gray-300 text-sm"
          disabled={loading}
        >
          Cancelar
        </button>
          <button
            type="submit"
            className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
            disabled={loading}
          >
            {loading ? 'Guardando...' : guest ? 'Actualizar invitado' : 'Guardar invitado'}
          </button>
      </div>
    </form>
  );
};

export default GuestForm;
