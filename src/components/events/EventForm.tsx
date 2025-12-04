'use client';

import React from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useEventStore from '@/store/eventStore';
import { createEventSchema, updateEventSchema } from '@/utils/validators/eventSchemas';
import { errorHandler } from '@/utils/errors';
import toast from 'react-hot-toast';

import { useRouter } from 'next/navigation';

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
  id: z.guid().optional(),
});

type EventFormInputs = z.infer<typeof eventFormValidationSchema>;

interface EventFormProps {
  event?: Event;
  onClose?: () => void;
}

const EventForm: React.FC<EventFormProps> = ({ event, onClose }) => {
  const router = useRouter();
  const { createEvent, updateEvent } = useEventStore();
  const isEditMode = !!event;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventFormInputs>({
    resolver: zodResolver(eventFormValidationSchema) as any,
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

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const onSubmit: SubmitHandler<EventFormInputs> = async (data) => {
    try {
      if (isEditMode && event) {
        // Use updateEventSchema for submission
        const submissionData = updateEventSchema.parse(data);
        await updateEvent(event.id, submissionData);
        toast.success('Event updated successfully');
      } else {
        // Use createEventSchema for submission
        const submissionData = createEventSchema.parse(data);
        await createEvent(submissionData);
        toast.success('Event created successfully');
        reset();
      }
      handleClose();
    } catch (e) {
      const error = errorHandler(e);
      toast.error(`Error: ${error.message}`);
      console.error('Error submitting event form:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Editar Evento' : 'Crear Nuevo Evento'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isEditMode ? 'Actualiza la información del evento.' : 'Completa los detalles para registrar un nuevo evento.'}
            </p>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
              
              {/* Name */}
              <div className="sm:col-span-2">
                <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre del Evento
                </label>
                <input
                  type="text"
                  id="name"
                  placeholder="Ej. Conferencia Anual 2025"
                  {...register('name')}
                  className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                />
                {errors.name && <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 rounded-full bg-red-500"></span>
                  {errors.name.message}
                </p>}
              </div>

              {/* Description */}
              <div className="sm:col-span-2">
                <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">
                  Descripción
                </label>
                <textarea
                  id="description"
                  rows={3}
                  placeholder="Describe brevemente el propósito del evento..."
                  {...register('description')}
                  className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm resize-none"
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-1">
                  Ubicación
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    id="location"
                    placeholder="Ej. Salón Principal"
                    {...register('location')}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                  />
                </div>
              </div>

              {/* Max Capacity */}
              <div>
                <label htmlFor="maxCapacity" className="block text-sm font-semibold text-gray-700 mb-1">
                  Capacidad Máxima
                </label>
                <div className="relative">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <input
                    type="number"
                    id="maxCapacity"
                    placeholder="0"
                    {...register('maxCapacity', {
                      setValueAs: (v) => (v === '' || v === null ? null : parseInt(v, 10)),
                    })}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                  />
                </div>
                {errors.maxCapacity && <p className="mt-2 text-sm text-red-500">{errors.maxCapacity.message}</p>}
              </div>

              {/* Checkbox */}
              <div className="sm:col-span-2 bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="allowGuests"
                      type="checkbox"
                      {...register('allowGuests')}
                      className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                    />
                  </div>
                  <div className="ml-3">
                    <label htmlFor="allowGuests" className="font-medium text-gray-900 cursor-pointer">
                      Permitir invitados
                    </label>
                    <p className="text-sm text-gray-500">
                      Si se habilita, los participantes podrán registrar acompañantes.
                    </p>
                  </div>
                </div>
              </div>

              {/* Max Guests */}
              <div className="sm:col-span-2">
                <label htmlFor="maxGuestsPerParticipant" className="block text-sm font-semibold text-gray-700 mb-1">
                  Invitados por Participante
                </label>
                <input
                  type="number"
                  id="maxGuestsPerParticipant"
                  placeholder="0"
                  {...register('maxGuestsPerParticipant', {
                    setValueAs: (v) => (v === '' ? 0 : parseInt(v, 10)),
                  })}
                  className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                />
                {errors.maxGuestsPerParticipant && <p className="mt-2 text-sm text-red-500">{errors.maxGuestsPerParticipant.message}</p>}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-gray-200 bg-white py-2.5 px-5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-200 transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-xl border border-transparent bg-indigo-600 py-2.5 px-5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </span>
              ) : (isEditMode ? 'Guardar Cambios' : 'Crear Evento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventForm;
