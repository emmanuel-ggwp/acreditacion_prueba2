'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { createScheduleSchema } from '@/utils/validators/eventSchemas';
import EventSchedule from '@/models/EventSchedule';
import useEventStore from '@/store/eventStore';
import toast from 'react-hot-toast';
import { uploadImage } from '@/utils/upload';
import { UploadCloud, X as XIcon, Loader2, Image as ImageIcon } from 'lucide-react';

type ScheduleFormInputs = z.input<typeof createScheduleSchema>;
type ScheduleFormOutput = z.output<typeof createScheduleSchema>;

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
    setValue,
    watch,
    formState: { errors },
  } = useForm<ScheduleFormInputs>({
    resolver: zodResolver(createScheduleSchema) as any,
    defaultValues: isEditMode
      ? {
        eventId: schedule.eventId,
        scheduleName: schedule.scheduleName,
        startDateTime: new Date(schedule.startDateTime).toISOString(),
        endDateTime: new Date(schedule.endDateTime).toISOString(),
        location: schedule.location || '',
        maxCapacity: schedule.maxCapacity || 0,
        blockType: (schedule.blockType as any) || 'SINGLE',
        label: schedule.label || '',
        imageUrl: schedule.imageUrl || '',
      }
      : { eventId, maxCapacity: 0, location: '', blockType: 'SINGLE', label: '', imageUrl: '' },
  });

  const [uploadingImg, setUploadingImg] = useState(false);
  const imageUrl = watch('imageUrl');

  const handleScheduleImage = async (file?: File) => {
    if (!file) return;
    setUploadingImg(true);
    try {
      const url = await uploadImage(file);
      setValue('imageUrl', url, { shouldDirty: true });
      toast.success('Imagen subida');
    } catch (e: any) {
      toast.error(e.message || 'Error al subir la imagen');
    } finally {
      setUploadingImg(false);
    }
  };

  const onSubmit = async (data: ScheduleFormOutput) => {
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

      toast.success(`Horario ${isEditMode ? 'actualizado' : 'creado'} correctamente`);

      onClose();

    } catch (error: any) {
      toast.error(error?.message || 'No se pudo guardar el horario');
      console.error(error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-6">{isEditMode ? 'Editar Horario' : 'Crear Nuevo Horario'}</h4>
      
      <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
        <input type="hidden" {...register('eventId')} />

        <div>
          <label htmlFor="scheduleName" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Horario</label>
          <input
            type="text"
            id="scheduleName"
            {...register('scheduleName')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="ej. Sesión de la mañana"
          />
          {errors.scheduleName && <p className="mt-1 text-sm text-red-500">{errors.scheduleName.message}</p>}
        </div>

        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Ubicación (Opcional)</label>
          <input
            type="text"
            id="location"
            {...register('location')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="Ubicación específica para este horario"
          />
          {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="blockType" className="block text-sm font-medium text-gray-700 mb-1">Tipo de bloque</label>
            <select
              id="blockType"
              {...register('blockType')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border bg-white"
            >
              <option value="SINGLE">Único</option>
              <option value="AM">Mañana (AM)</option>
              <option value="PM">Tarde (PM)</option>
              <option value="FULL_DAY">Día completo</option>
              <option value="CUSTOM">Personalizado</option>
            </select>
          </div>
          <div>
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-1">Etiqueta visible (Opcional)</label>
            <input
              type="text"
              id="label"
              {...register('label')}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder="ej. Mañana, Tarde, Día 1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="startDateTime" className="block text-sm font-medium text-gray-700 mb-1">Hora de Inicio</label>
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
                  placeholderText="Selecciona la hora de inicio"
                />
              )}
            />
            {errors.startDateTime && <p className="mt-1 text-sm text-red-500">{errors.startDateTime.message}</p>}
          </div>
          <div>
            <label htmlFor="endDateTime" className="block text-sm font-medium text-gray-700 mb-1">Hora de Término</label>
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
                  placeholderText="Selecciona la hora de término"
                />
              )}
            />
            {errors.endDateTime && <p className="mt-1 text-sm text-red-500">{errors.endDateTime.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor="maxCapacity" className="block text-sm font-medium text-gray-700 mb-1">Capacidad Máxima (Opcional)</label>
          <input
            type="number"
            id="maxCapacity"
            {...register('maxCapacity', {
              setValueAs: v => v === '' ? 0 : parseInt(v, 10)
            })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="Déjalo vacío para heredar del evento"
          />
          {errors.maxCapacity && <p className="mt-1 text-sm text-red-500">{errors.maxCapacity.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de la fecha (Opcional)</label>
          <div className="flex items-center gap-3">
            {imageUrl ? (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Fecha" className="h-16 w-24 object-cover rounded-lg border border-gray-200" />
                <button type="button" onClick={() => setValue('imageUrl', '', { shouldDirty: true })} className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow ring-1 ring-gray-200 text-gray-400 hover:text-red-500">
                  <XIcon size={14} />
                </button>
              </div>
            ) : (
              <div className="h-16 w-24 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300">
                <ImageIcon size={20} />
              </div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
              {uploadingImg ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {uploadingImg ? 'Subiendo…' : 'Subir imagen'}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploadingImg} onChange={(e) => handleScheduleImage(e.target.files?.[0])} />
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Guardando…' : (isEditMode ? 'Guardar Cambios' : 'Crear Horario')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduleForm;
