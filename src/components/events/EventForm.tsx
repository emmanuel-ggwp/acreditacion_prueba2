'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useEventStore from '@/store/eventStore';
import { createEventSchema, updateEventSchema } from '@/utils/validators/eventSchemas';
import { CONFIGURABLE_FIELDS, getFormFields } from '@/utils/formFields';
import { DEFAULT_DIET_LABELS } from '@/utils/dietary';
import { TITLE_FONTS, googleFontHref } from '@/utils/fonts';
import { errorHandler } from '@/utils/errors';
import toast from 'react-hot-toast';
import { Info, UploadCloud, Image as ImageIcon, X as XIcon, Loader2 } from 'lucide-react';
import { uploadImage } from '@/utils/upload';
import apiClient from '@/utils/apiClient';

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
  isPublic: boolean;
  registrationOpen: boolean;
  allowMultipleSchedules: boolean;
  publicSlug: string | null;
  publicTemplate: string | null;
  logoUrl: string | null;
  backgroundImageUrl: string | null;
  emailTemplateId: string | null;
  registrationConfig: any | null;
}

// Schema for form validation
const eventFormValidationSchema = createEventSchema.extend({
  id: z.guid().optional(),
  //NOTE: These fields are included for avoid errors from react-hook-form
  allowGuests: z.boolean(),
  maxGuestsPerParticipant: z.number().int().min(0),
  isPublic: z.boolean(),
  registrationOpen: z.boolean(),
  allowMultipleSchedules: z.boolean(),
  publicSlug: z.string().optional().nullable(),
  publicTemplate: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  backgroundImageUrl: z.string().optional().nullable(),
  emailTemplateId: z.string().optional().nullable(),
  registrationConfig: z.any().optional().nullable(),
});

type EventFormInputs = z.infer<typeof eventFormValidationSchema>;

interface EventFormProps {
  event?: Event;
  onClose?: () => void;
  onSuccess?: (event: Event) => void;
}

// Small info icon that shows an explanatory tooltip on hover.
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => (
  <span className="group relative inline-flex align-middle ml-1.5">
    <Info className="h-4 w-4 text-gray-400 hover:text-indigo-500 cursor-help" />
    <span
      role="tooltip"
      className="pointer-events-none absolute left-0 bottom-full z-50 mb-2 w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs font-normal normal-case leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100"
    >
      {text}
    </span>
  </span>
);

// Campo de subida de imagen con vista previa.
const ImageUploadField: React.FC<{
  label: string;
  value?: string | null;
  uploading: boolean;
  onSelect: (file?: File) => void;
  onClear: () => void;
}> = ({ label, value, uploading, onSelect, onClear }) => (
  <div>
    <p className="block text-sm font-semibold text-gray-700 mb-1">{label}</p>
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-gray-50" />
          <button type="button" onClick={onClear} className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow ring-1 ring-gray-200 text-gray-400 hover:text-red-500">
            <XIcon size={14} />
          </button>
        </div>
      ) : (
        <div className="h-16 w-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300">
          <ImageIcon size={22} />
        </div>
      )}
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {uploading ? 'Subiendo…' : 'Subir imagen'}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          disabled={uploading}
          onChange={(e) => onSelect(e.target.files?.[0])}
        />
      </label>
    </div>
  </div>
);

// Paleta de colores por defecto de cada plantilla (acorde a su estilo).
// Se cargan al elegir la plantilla; luego el usuario puede ajustarlas.
const TEMPLATE_PALETTES: Record<string, Record<string, string | number>> = {
  // Predeterminada: índigo clásico y neutro.
  default: {
    primaryColor: '#4f46e5', secondaryColor: '#6366f1', buttonColor: '#4f46e5',
    textColor: '#111827', inputColor: '#f9fafb', borderColor: '#e5e7eb',
    formBackgroundColor: '#ffffff', overlayColor: '#000000', overlayOpacity: 0.5, titleFont: 'montserrat',
  },
  // Moderno: azul/violeta vibrante sobre panel oscuro.
  modern: {
    primaryColor: '#3b82f6', secondaryColor: '#8b5cf6', buttonColor: '#6366f1',
    textColor: '#0f172a', inputColor: '#f1f5f9', borderColor: '#cbd5e1',
    formBackgroundColor: '#ffffff', overlayColor: '#0f172a', overlayOpacity: 0.6, titleFont: 'poppins',
  },
  // Minimalista: monocromático, neutro, limpio.
  minimal: {
    primaryColor: '#111827', secondaryColor: '#6b7280', buttonColor: '#111827',
    textColor: '#111827', inputColor: '#ffffff', borderColor: '#e5e7eb',
    formBackgroundColor: '#ffffff', overlayColor: '#ffffff', overlayOpacity: 0.8, titleFont: 'inter',
  },
  // Gala: teal sobre fondo oscuro inmersivo.
  gala: {
    primaryColor: '#008a98', secondaryColor: '#00b4c8', buttonColor: '#008a98',
    textColor: '#ffffff', inputColor: '#0b1220', borderColor: '#334155',
    formBackgroundColor: '#0b1220', overlayColor: '#000000', overlayOpacity: 0.55, titleFont: 'playfair',
  },
};

const EventForm: React.FC<EventFormProps> = ({ event, onClose, onSuccess }) => {
  const router = useRouter();
  const { createEvent, updateEvent } = useEventStore();
  const isEditMode = !!event;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventFormInputs>({
    resolver: zodResolver(eventFormValidationSchema),
    defaultValues: {
      id: event?.id,
      name: event?.name || '',
      description: event?.description || '',
      location: event?.location || '',
      maxCapacity: event?.maxCapacity ?? undefined,
      allowGuests: event?.allowGuests ?? true,
      maxGuestsPerParticipant: event?.maxGuestsPerParticipant ?? 0,
      isPublic: event?.isPublic ?? false,
      registrationOpen: event?.registrationOpen ?? true,
      allowMultipleSchedules: event?.allowMultipleSchedules ?? false,
      publicSlug: event?.publicSlug || '',
      publicTemplate: event?.publicTemplate || 'default',
      logoUrl: event?.logoUrl || '',
      backgroundImageUrl: event?.backgroundImageUrl || '',
      emailTemplateId: event?.emailTemplateId || '',
      registrationConfig: {
        ...(event?.registrationConfig || {}),
        mode: event?.registrationConfig?.mode || 'open',
        theme: {
          primaryColor: '#4f46e5',
          secondaryColor: '#6366f1',
          buttonColor: '#4f46e5',
          textColor: '#111827',
          inputColor: '#f9fafb',
          borderColor: '#e5e7eb',
          formBackgroundColor: '#ffffff',
          overlayOpacity: 0.5,
          titleFont: 'montserrat',
          ...((event?.registrationConfig?.theme) || {}),
        },
        formFields: getFormFields(event?.registrationConfig),
        guests: {
          ...(event?.registrationConfig?.guests || {}),
          dietary: !!event?.registrationConfig?.guests?.dietary,
        },
        dietaryOptions: (event?.registrationConfig?.dietaryOptions && event.registrationConfig.dietaryOptions.length)
          ? event.registrationConfig.dietaryOptions
          : DEFAULT_DIET_LABELS,
      },
    },
  });

  const [uploading, setUploading] = useState<{ logo?: boolean; bg?: boolean }>({});
  const logoUrl = watch('logoUrl');
  const backgroundImageUrl = watch('backgroundImageUrl');

  const [emailTemplates, setEmailTemplates] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    apiClient.get<{ id: string; name: string }[]>('/api/email-templates').then(setEmailTemplates).catch(() => {});
  }, []);

  const handleImageUpload = async (field: 'logoUrl' | 'backgroundImageUrl', file?: File) => {
    if (!file) return;
    const key = field === 'logoUrl' ? 'logo' : 'bg';
    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const url = await uploadImage(file);
      setValue(field, url, { shouldDirty: true });
      toast.success('Imagen subida');
    } catch (e: any) {
      toast.error(e.message || 'Error al subir la imagen');
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const onSubmit: SubmitHandler<EventFormInputs> = async (data) => {
    try {
      (data as any).emailTemplateId = data.emailTemplateId || null;
      let resultEvent;
      if (isEditMode && event) {
        // Use updateEventSchema for submission
        const submissionData = updateEventSchema.parse(data);
        await updateEvent(event.id, submissionData);
        resultEvent = { ...event, ...submissionData } as Event; // Optimistic or fetch fresh? Store updates it.
        toast.success('Event updated successfully');
      } else {
        // Use createEventSchema for submission
        const submissionData = createEventSchema.parse(data);
        const newEvent = await createEvent(submissionData);
        resultEvent = newEvent as Event;
        toast.success('Event created successfully');
        reset();
      }
      
      if (onSuccess && resultEvent) {
        onSuccess(resultEvent);
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
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

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-8 space-y-6 overflow-y-auto flex-1">
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

              {/* Landing Design Section */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-6 mt-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  Diseño de la landing
                  <InfoTooltip text="Personaliza el aspecto de la página pública de inscripción: logo, imagen de fondo y colores. La vista previa completa se aplica hoy en la plantilla 'Por defecto'." />
                </h3>

                <div className="space-y-5">
                  <ImageUploadField
                    label="Logo"
                    value={logoUrl}
                    uploading={!!uploading.logo}
                    onSelect={(f) => handleImageUpload('logoUrl', f)}
                    onClear={() => setValue('logoUrl', '', { shouldDirty: true })}
                  />
                  <ImageUploadField
                    label="Imagen de fondo"
                    value={backgroundImageUrl}
                    uploading={!!uploading.bg}
                    onSelect={(f) => handleImageUpload('backgroundImageUrl', f)}
                    onClear={() => setValue('backgroundImageUrl', '', { shouldDirty: true })}
                  />

                  <div>
                    <p className="block text-sm font-semibold text-gray-700 mb-2">Colores</p>
                    <p className="text-xs text-gray-500 mb-3">Cada color afecta una parte de la página pública de inscripción:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                      {([
                        ['registrationConfig.theme.primaryColor', 'Principal', 'Acentos: barra superior, íconos y detalles.'],
                        ['registrationConfig.theme.secondaryColor', 'Secundario', 'Acento complementario (degradados y detalles).'],
                        ['registrationConfig.theme.buttonColor', 'Botones', 'Color del botón de registro.'],
                        ['registrationConfig.theme.textColor', 'Texto', 'Color del texto y las etiquetas del formulario.'],
                        ['registrationConfig.theme.inputColor', 'Inputs', 'Fondo de los campos donde se escribe.'],
                        ['registrationConfig.theme.borderColor', 'Bordes', 'Color del borde de los campos.'],
                        ['registrationConfig.theme.formBackgroundColor', 'Fondo formulario', 'Fondo de la tarjeta que contiene el formulario.'],
                      ] as const).map(([name, label, desc]) => (
                        <div key={name} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <input type="color" {...register(name as any)} className="h-9 w-10 rounded border border-gray-200 cursor-pointer bg-white p-0.5 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <span className="block font-medium text-gray-700">{label}</span>
                            <span className="block text-xs text-gray-400 leading-snug mb-1">{desc}</span>
                            <input
                              type="text"
                              {...register(name as any)}
                              placeholder="#RRGGBB"
                              maxLength={7}
                              className="w-24 rounded border border-gray-200 px-2 py-1 text-xs font-mono uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tipografía del nombre del evento */}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                      Tipografía del nombre del evento
                      <InfoTooltip text="Fuente del título (nombre del evento) en la página pública. Si no la cambias, cada plantilla usa una fuente acorde a su estilo." />
                    </label>
                    <select
                      {...register('registrationConfig.theme.titleFont' as any)}
                      className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                    >
                      {TITLE_FONTS.map((f) => (<option key={f.key} value={f.key}>{f.label}</option>))}
                    </select>
                    {(() => {
                      const key = watch('registrationConfig.theme.titleFont' as any);
                      const font = TITLE_FONTS.find((f) => f.key === key) || TITLE_FONTS.find((f) => f.key === 'montserrat');
                      const href = font ? googleFontHref(font) : null;
                      return (
                        <>
                          {href && <link rel="stylesheet" href={href} />}
                          <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 overflow-hidden">
                            <span className="text-2xl text-gray-900" style={{ fontFamily: font?.stack || 'inherit' }}>
                              {watch('name') || 'Nombre del evento'}
                            </span>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                      Color de la capa (velo) sobre el fondo
                      <InfoTooltip text="Color de la capa que se pone sobre la imagen de fondo. Combínalo con la opacidad de abajo. Sugerencia: oscuro para plantillas oscuras (Gala/Moderno) y claro para Minimal. Si no lo cambias, cada plantilla usa un valor por defecto adecuado." />
                    </label>
                    <div className="flex items-center gap-2 mb-4">
                      <input type="color" {...register('registrationConfig.theme.overlayColor' as any)} className="h-9 w-10 rounded border border-gray-200 cursor-pointer bg-white p-0.5" />
                      <input type="text" {...register('registrationConfig.theme.overlayColor' as any)} placeholder="#RRGGBB" maxLength={7} className="w-24 rounded border border-gray-200 px-2 py-1 text-xs font-mono uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30" />
                    </div>
                    <label htmlFor="overlayOpacity" className="text-sm font-semibold text-gray-700 mb-1 flex items-center">
                      Opacidad de la capa (velo)
                      <InfoTooltip text="Qué tan visible es la capa de color sobre la imagen de fondo. 0 = capa invisible (se ve la foto), 1 = capa totalmente sólida." />
                    </label>
                    <input
                      id="overlayOpacity"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      {...register('registrationConfig.theme.overlayOpacity', { setValueAs: (v) => (v === '' || v === null || v === undefined ? undefined : parseFloat(v)) })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Public Registration Section */}
              <div className="sm:col-span-2 border-t border-gray-100 pt-6 mt-2">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  Registro Público
                  <InfoTooltip text="Crea una página web pública donde personas externas pueden inscribirse solas, sin entrar al sistema. Si está desactivado, el evento es interno y solo tu equipo inscribe manualmente." />
                </h3>
                
                <div className="space-y-4">
                  {/* Is Public Toggle */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="isPublic"
                          type="checkbox"
                          {...register('isPublic')}
                          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                        />
                      </div>
                      <div className="ml-3">
                        <div className="flex items-center">
                          <label htmlFor="isPublic" className="font-medium text-gray-900 cursor-pointer">
                            Habilitar Registro Público
                          </label>
                          <InfoTooltip text="Activado: se genera una landing pública en /public/events/[slug] para que cualquiera se inscriba. Desactivado: la página pública no existe y solo se inscribe desde el sistema." />
                        </div>
                        <p className="text-sm text-gray-500">
                          Permite que cualquier persona se registre a través de un enlace público.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Registration Open Toggle */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="registrationOpen"
                          type="checkbox"
                          {...register('registrationOpen')}
                          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                        />
                      </div>
                      <div className="ml-3">
                        <div className="flex items-center">
                          <label htmlFor="registrationOpen" className="font-medium text-gray-900 cursor-pointer">
                            Inscripción abierta
                          </label>
                          <InfoTooltip text="Si lo desmarcas, se cierran las inscripciones: el enlace público sigue funcionando pero muestra una pantalla de 'Inscripciones cerradas' y no acepta nuevos registros." />
                        </div>
                        <p className="text-sm text-gray-500">
                          Desmárcalo para cerrar las inscripciones sin desactivar el enlace público.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Multiple Schedules Toggle */}
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start">
                      <div className="flex items-center h-5">
                        <input
                          id="allowMultipleSchedules"
                          type="checkbox"
                          {...register('allowMultipleSchedules')}
                          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-colors cursor-pointer"
                        />
                      </div>
                      <div className="ml-3">
                        <div className="flex items-center">
                          <label htmlFor="allowMultipleSchedules" className="font-medium text-gray-900 cursor-pointer">
                            Permitir inscripción en varias fechas
                          </label>
                          <InfoTooltip text="Si lo marcas, un mismo participante puede inscribirse en más de una fecha de este evento. Si lo dejas desmarcado, al intentar inscribirse de nuevo verá un mensaje de que ya está inscrito (salvo participantes con el permiso individual activado)." />
                        </div>
                        <p className="text-sm text-gray-500">
                          Aplica a todos los participantes del evento. También puedes habilitarlo solo para participantes específicos desde su ficha.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Public Slug */}
                  <div>
                    <label htmlFor="publicSlug" className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                      URL Personalizada (Slug)
                      <InfoTooltip text="Es la parte final del enlace público. Si lo dejas en blanco, se genera automáticamente desde el nombre del evento (ej. conferencia-anual-2025). Si escribes algo, se usa ese texto." />
                    </label>
                    <div className="flex rounded-xl shadow-sm">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-50 text-gray-500 sm:text-sm">
                        /public/events/
                      </span>
                      <input
                        type="text"
                        id="publicSlug"
                        placeholder="mi-evento-2025"
                        {...register('publicSlug')}
                        className="flex-1 block w-full min-w-0 rounded-none rounded-r-xl border-gray-200 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Dejar en blanco para generar automáticamente (si no se proporciona).</p>
                    {errors.publicSlug && <p className="mt-2 text-sm text-red-500">{errors.publicSlug.message}</p>}
                  </div>

                  {/* Template Selector */}
                  <div>
                    <label htmlFor="publicTemplate" className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                      Plantilla de Diseño
                      <InfoTooltip text="Define el diseño visual de la página pública de inscripción (Por defecto, Moderno o Minimalista). Más adelante se podrán usar diseños personalizados." />
                    </label>
                    <select
                      id="publicTemplate"
                      {...register('publicTemplate', {
                        onChange: (e) => {
                          const pal = TEMPLATE_PALETTES[e.target.value];
                          if (pal) Object.entries(pal).forEach(([k, v]) => setValue(`registrationConfig.theme.${k}` as any, v, { shouldDirty: true }));
                        },
                      })}
                      className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                    >
                      <option value="default">Por Defecto (Estándar)</option>
                      <option value="modern">Moderno (Oscuro)</option>
                      <option value="minimal">Minimalista (Limpio)</option>
                      <option value="gala">Gala (estilo Centinela)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Al elegir una plantilla se cargan sus colores por defecto; puedes ajustarlos abajo en "Colores".</p>
                  </div>

                  {/* Modo de inscripción */}
                  <div>
                    <label htmlFor="registrationMode" className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                      Modo de inscripción
                      <InfoTooltip text="Abierto: cualquiera puede inscribirse. Solo RUT precargado: el participante debe estar precargado y se identifica con su RUT (disponible próximamente)." />
                    </label>
                    <select
                      id="registrationMode"
                      {...register('registrationConfig.mode')}
                      className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                    >
                      <option value="open">Abierto a cualquiera</option>
                      <option value="rut">Solo RUT precargado</option>
                    </select>
                  </div>

                  {/* Campos del formulario */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      Campos del formulario
                      <InfoTooltip text="Elige qué campos pedir en la inscripción y cuáles son obligatorios. Nombre, Apellido y Correo siempre se piden." />
                    </label>
                    <div className="rounded-xl border border-gray-200 divide-y">
                      {CONFIGURABLE_FIELDS.map((f) => {
                        const enabled = watch(`registrationConfig.formFields.${f.key}.enabled` as any);
                        return (
                          <div key={f.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                              <input type="checkbox" {...register(`registrationConfig.formFields.${f.key}.enabled` as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                              {f.label}
                            </label>
                            {enabled && (
                              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                                <input type="checkbox" {...register(`registrationConfig.formFields.${f.key}.required` as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                Obligatorio
                              </label>
                            )}
                          </div>
                        );
                      })}
                      <label className="flex items-center gap-2 text-sm text-gray-700 px-3 py-2.5 cursor-pointer">
                        <input type="checkbox" {...register('registrationConfig.guests.dietary' as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        Preguntar preferencia alimenticia a cada invitado
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Nombre, Apellido y Correo siempre se piden.</p>
                  </div>

                  {/* Opciones de preferencia alimenticia (cuando la dieta está activa) */}
                  {(watch('registrationConfig.formFields.dietary.enabled' as any) || watch('registrationConfig.guests.dietary' as any)) && (
                    <div>
                      <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                        Opciones de preferencia alimenticia
                        <InfoTooltip text="Las opciones que verán los asistentes (y el admin) al elegir su preferencia. 'Ninguna' se incluye siempre automáticamente." />
                      </label>
                      <div className="space-y-2">
                        {((watch('registrationConfig.dietaryOptions' as any) as string[]) || []).map((opt: string, i: number) => (
                          <div key={i} className="flex gap-2">
                            <input
                              value={opt}
                              onChange={(e) => {
                                const next = [...((watch('registrationConfig.dietaryOptions' as any) as string[]) || [])];
                                next[i] = e.target.value;
                                setValue('registrationConfig.dietaryOptions' as any, next, { shouldDirty: true });
                              }}
                              placeholder={`Opción ${i + 1}`}
                              className="flex-1 rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
                            />
                            <button
                              type="button"
                              title="Quitar opción"
                              onClick={() => {
                                const next = ((watch('registrationConfig.dietaryOptions' as any) as string[]) || []).filter((_: string, idx: number) => idx !== i);
                                setValue('registrationConfig.dietaryOptions' as any, next, { shouldDirty: true });
                              }}
                              className="px-3 text-gray-400 hover:text-red-600 border border-gray-200 rounded-xl"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => setValue('registrationConfig.dietaryOptions' as any, [...((watch('registrationConfig.dietaryOptions' as any) as string[]) || []), ''], { shouldDirty: true })}
                        className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        + Agregar opción
                      </button>
                    </div>
                  )}

                  {/* Plantilla de correo */}
                  <div>
                    <label htmlFor="emailTemplateId" className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                      Plantilla de correo de confirmación
                      <InfoTooltip text="Correo (EmailJS) que se envía al inscribirse. Crea y gestiona las plantillas en Configuración." />
                    </label>
                    <select
                      id="emailTemplateId"
                      {...register('emailTemplateId')}
                      className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                    >
                      <option value="">Sin correo de confirmación</option>
                      {emailTemplates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-8 py-5 border-t border-gray-100 flex justify-end space-x-3 flex-shrink-0">
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
