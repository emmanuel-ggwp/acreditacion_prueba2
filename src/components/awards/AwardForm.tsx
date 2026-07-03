'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useAwardStore from '@/store/awardStore';
import { awardSchema } from '@/utils/validators/awardSchemas';
import Award from '@/models/Award';

type AwardFormData = z.infer<typeof awardSchema>;

interface AwardFormProps {
  eventId: string;
  award?: Award | null;
  onClose: () => void;
}

const AwardForm: React.FC<AwardFormProps> = ({ eventId, award, onClose }) => {
  const { createAward, updateAward, loading, error } = useAwardStore();
  const isEditing = !!award;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AwardFormData>({
    resolver: zodResolver(awardSchema),
    defaultValues: award ? { ...award, eventId } : { eventId, name: '', description: '', quantity: 0 },
  });

  const onSubmit = async (data: AwardFormData) => {
    try {
      if (isEditing && award) {
        await updateAward(award.id, data);
      } else {
        await createAward(data);
      }
      onClose();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-6 my-4 border border-gray-200 rounded-lg bg-gray-50">
      <h3 className="text-xl font-semibold mb-4">{isEditing ? 'Editar Premio' : 'Crear Nuevo Premio'}</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Premio</label>
          <input
            id="name"
            {...register('name')}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>}
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Cantidad (Stock)</label>
          <input
            id="quantity"
            type="number"
            {...register('quantity', { valueAsNumber: true })}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {errors.quantity && <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>}
        </div>
        
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end space-x-3">
          <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Guardando…' : (isEditing ? 'Guardar Cambios' : 'Crear Premio')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AwardForm;
