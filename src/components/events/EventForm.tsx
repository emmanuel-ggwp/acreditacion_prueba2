'use client';

import React, { useState, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useEventStore from '@/store/eventStore';
import { createEventSchema, updateEventSchema } from '@/utils/validators/eventSchemas';
import { CONFIGURABLE_FIELDS, getFormFields, CONFIGURABLE_GUEST_FIELDS, getGuestFields, CONFIGURABLE_ACCREDITATION_FIELDS, getAccreditationFields } from '@/utils/formFields';
import { DEFAULT_DIET_LABELS } from '@/utils/dietary';
import DesignControls, { ImageSlot } from './DesignControls';
import { THEME_DEFAULTS, themeDefaultFor, TEMPLATE_PALETTES, TEMPLATE_NAMES } from '@/utils/templatePalettes';
import { errorHandler } from '@/utils/errors';
import toast from 'react-hot-toast';
import { Info } from 'lucide-react';
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
      // Evento nuevo → 2, el mismo defecto del modelo y del esquema. Con 0 aquí, cada
      // evento creado desde la aplicación nacía sin cupo de invitados (R1-01 / D1.1).
      // Un evento existente conserva su valor, incluido el 0 puesto a mano.
      maxGuestsPerParticipant: event?.maxGuestsPerParticipant ?? 2,
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
          primaryColor: '#1e293b',
          secondaryColor: '#334155',
          buttonColor: '#1e293b',
          titleColor: '#ffffff',
          titleSize: 'lg',
          titleShadow: 'none',
          textColor: '#111827',
          inputColor: '#f8fafc',
          // Vacío = automático: las letras de los inputs se ajustan solas al fondo.
          inputTextColor: '',
          borderColor: '#e2e8f0',
          formBackgroundColor: '#ffffff',
          dietModalColor: '#0b1220',
          dateCardColor: '#000000',
          dateCardOpacity: 0.5,
          // Default = Principal del evento, así el borde de la fecha seleccionada se ve
          // igual que antes hasta que el usuario elija otro color.
          dateSelectedColor: event?.registrationConfig?.theme?.primaryColor || '#1e293b',
          // Fondo al seleccionar: vacío por defecto = no cambia (solo el borde, como antes).
          dateSelectedBgColor: '',
          dateSelectedTextColor: '#ffffff',
          buttonTextColor: '#ffffff',
          datesTitleColor: '#ffffff',
          datesSubtitleColor: '#ffffff',
          galaFormOffset: 0,
          galaCustomFormColors: false,
          overlayColor: '#0f172a',
          overlayOpacity: 0.55,
          titleFont: 'montserrat',
          ...((event?.registrationConfig?.theme) || {}),
        },
        formFields: getFormFields(event?.registrationConfig),
        accreditationFields: getAccreditationFields(event?.registrationConfig),
        guests: {
          ...(event?.registrationConfig?.guests || {}),
          mode: event?.registrationConfig?.guests?.mode || 'named',
          dietary: !!event?.registrationConfig?.guests?.dietary,
          dietaryRequired: !!event?.registrationConfig?.guests?.dietaryRequired,
          termSingular: event?.registrationConfig?.guests?.termSingular || 'Invitado',
          termPlural: event?.registrationConfig?.guests?.termPlural || 'Invitados',
          // Campos por invitado (apellido / RUT / edad): {enabled, required}. El nombre siempre se pide.
          formFields: getGuestFields(event?.registrationConfig),
        },
        dietaryOptions: (event?.registrationConfig?.dietaryOptions && event.registrationConfig.dietaryOptions.length)
          ? event.registrationConfig.dietaryOptions
          : DEFAULT_DIET_LABELS,
        customQuestions: event?.registrationConfig?.customQuestions || [],
        images: {
          ...(event?.registrationConfig?.images || {}),
          heroUrl: event?.registrationConfig?.images?.heroUrl || '',
        },
      },
    },
  });

  const [uploading, setUploading] = useState<{ logo?: boolean; bg?: boolean; hero?: boolean; successD?: boolean; successM?: boolean }>({});
  // Pestaña activa del formulario (para no tener un modal tan largo).
  const [activeTab, setActiveTab] = useState<'general' | 'diseno' | 'registro' | 'formulario'>('general');
  const logoUrl = watch('logoUrl');
  const backgroundImageUrl = watch('backgroundImageUrl');
  const heroUrl = watch('registrationConfig.images.heroUrl' as any);
  const successUrl = watch('registrationConfig.images.successUrl' as any);
  const successUrlMobile = watch('registrationConfig.images.successUrlMobile' as any);
  // Si hay plantilla de correo, el Correo del asistente es imprescindible (para poder
  // enviárselo): se bloquea activado + obligatorio.
  const emailOn = !!watch('emailTemplateId');
  // Plantilla elegida: varias opciones de diseño son EXCLUSIVAS de Gala.
  const selectedTemplate = (watch('publicTemplate') as string) || 'default';
  const isGala = selectedTemplate === 'gala';

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

  // Sube una imagen y la guarda en una ruta de registrationConfig.images.
  const uploadConfigImage = async (path: string, key: 'hero' | 'successD' | 'successM', file?: File) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [key]: true }));
    try {
      const url = await uploadImage(file);
      setValue(path as any, url, { shouldDirty: true });
      toast.success('Imagen subida');
    } catch (e: any) {
      toast.error(e.message || 'Error al subir la imagen');
    } finally {
      setUploading((u) => ({ ...u, [key]: false }));
    }
  };

  // ---- Adaptador para <DesignControls> (controles de diseño compartidos con el editor en vivo) ----
  const designTheme = (watch('registrationConfig.theme' as any) as Record<string, any>) || {};
  const dcSetTheme = (k: string, v: any) => setValue(`registrationConfig.theme.${k}` as any, v, { shouldDirty: true });
  const dcSetFormColor = (k: string, v: any) => {
    setValue(`registrationConfig.theme.${k}` as any, v, { shouldDirty: true });
    if (isGala && !watch('registrationConfig.theme.galaCustomFormColors' as any)) {
      setValue('registrationConfig.theme.galaCustomFormColors' as any, true, { shouldDirty: true });
    }
  };
  const dcDefaultFor = (k: string) => themeDefaultFor(selectedTemplate, k);
  const dcResetTheme = () => {
    if (!window.confirm('¿Restaurar todo el diseño (colores y tipografía) a los valores por defecto de la plantilla? Las imágenes no se tocan.')) return;
    setValue('registrationConfig.theme' as any, { ...THEME_DEFAULTS, ...(TEMPLATE_PALETTES[selectedTemplate] || {}) }, { shouldDirty: true });
  };
  const IMG_FIELD: Record<ImageSlot, string> = {
    logo: 'logoUrl', bg: 'backgroundImageUrl',
    hero: 'registrationConfig.images.heroUrl', successD: 'registrationConfig.images.successUrl', successM: 'registrationConfig.images.successUrlMobile',
  };
  const dcImages: Record<ImageSlot, string> = { logo: logoUrl || '', bg: backgroundImageUrl || '', hero: heroUrl || '', successD: successUrl || '', successM: successUrlMobile || '' };
  const dcOnImage = (slot: ImageSlot, file?: File) => {
    if (slot === 'logo') return handleImageUpload('logoUrl', file);
    if (slot === 'bg') return handleImageUpload('backgroundImageUrl', file);
    return uploadConfigImage(IMG_FIELD[slot], slot as 'hero' | 'successD' | 'successM', file);
  };
  const dcOnClearImage = (slot: ImageSlot) => setValue(IMG_FIELD[slot] as any, '', { shouldDirty: true });

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  // Si la validación falla, saltar a la pestaña que contiene el primer campo con error.
  const FIELD_TAB: Record<string, 'general' | 'diseno' | 'registro' | 'formulario'> = {
    name: 'general', description: 'general', location: 'general', maxCapacity: 'general',
    allowGuests: 'general', maxGuestsPerParticipant: 'general',
    logoUrl: 'diseno', backgroundImageUrl: 'diseno',
    publicSlug: 'registro', publicTemplate: 'registro', isPublic: 'registro',
    registrationOpen: 'registro', allowMultipleSchedules: 'registro',
    emailTemplateId: 'formulario', registrationConfig: 'formulario',
  };
  const onInvalid = (errs: any) => {
    const order: Array<'general' | 'diseno' | 'registro' | 'formulario'> = ['general', 'diseno', 'registro', 'formulario'];
    const tabsWithError = new Set(Object.keys(errs || {}).map((k) => FIELD_TAB[k] || 'general'));
    const target = order.find((t) => tabsWithError.has(t));
    if (target) setActiveTab(target);
  };

  const onSubmit: SubmitHandler<EventFormInputs> = async (data) => {
    try {
      (data as any).emailTemplateId = data.emailTemplateId || null;
      // Si se envía correo de confirmación, el correo del asistente es imprescindible:
      // se fuerza activado y obligatorio (no se puede desmarcar en la interfaz).
      if ((data as any).emailTemplateId) {
        const rc: any = (data as any).registrationConfig || ((data as any).registrationConfig = {});
        rc.formFields = { ...(rc.formFields || {}), email: { enabled: true, required: true } };
      }
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
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex justify-center items-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[95vh] sm:max-h-[90vh] transform transition-all animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-white px-5 py-4 sm:px-8 sm:py-6 border-b border-gray-100 flex justify-between items-center gap-3 flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
              {isEditMode ? 'Editar Evento' : 'Crear Nuevo Evento'}
            </h2>
            <p className="text-sm text-gray-500 mt-1 hidden sm:block">
              {isEditMode ? 'Actualiza la información del evento.' : 'Completa los detalles para registrar un nuevo evento.'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100 flex-shrink-0"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit as any, onInvalid)} className="flex flex-col flex-1 overflow-hidden">
          {/* Pestañas: dividen el formulario para que no sea un scroll enorme. */}
          <div className="px-4 sm:px-8 pt-4 flex gap-1 flex-shrink-0 border-b border-gray-100 overflow-x-auto">
            {([['general', 'General'], ['diseno', 'Diseño'], ['registro', 'Registro'], ['formulario', 'Formulario']] as const).map(([id, lbl]) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap rounded-t-lg -mb-px border-b-2 transition ${activeTab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1">
            <div className={activeTab === 'general' ? 'grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8' : 'hidden'}>

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
                    min={0}
                    placeholder="Ilimitada"
                    {...register('maxCapacity', {
                      setValueAs: (v) => (v === '' || v === null ? null : parseInt(v, 10)),
                    })}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">Déjalo vacío (o en 0) para <b>capacidad ilimitada</b>.</p>
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
                  placeholder="2"
                  {...register('maxGuestsPerParticipant', {
                    // Campo vacío = «no declarado» = el defecto del modelo (2), no 0.
                    // Para «sin invitados» se escribe 0 o se desmarca "Permitir invitados".
                    setValueAs: (v) => (v === '' ? 2 : parseInt(v, 10)),
                  })}
                  className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                />
                {errors.maxGuestsPerParticipant && <p className="mt-2 text-sm text-red-500">{errors.maxGuestsPerParticipant.message}</p>}
              </div>

              {/* Modo de invitados */}
              {watch('allowGuests') && (
                <div className="sm:col-span-2">
                  <label htmlFor="guestMode" className="block text-sm font-semibold text-gray-700 mb-1">
                    Cómo se registran los invitados
                  </label>
                  <select
                    id="guestMode"
                    {...register('registrationConfig.guests.mode' as any)}
                    className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                  >
                    <option value="named">Con nombres — cada invitado con su nombre (y RUT/tipo)</option>
                    <option value="count">Solo número — cuántos invitados lleva (sin nombres)</option>
                    <option value="companion">Acompañante + cargas — si va con acompañante (sí/no) y número de cargas</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    {watch('registrationConfig.guests.mode' as any) === 'count' && 'El asistente solo indica cuántos invitados lleva.'}
                    {watch('registrationConfig.guests.mode' as any) === 'companion' && 'El asistente indica si va con acompañante y cuántas cargas lleva.'}
                    {(watch('registrationConfig.guests.mode' as any) === 'named' || !watch('registrationConfig.guests.mode' as any)) && 'Cada invitado se ingresa con su nombre; se pueden acreditar uno por uno.'}
                  </p>
                </div>
              )}

              {/* Qué datos pedir de cada invitado con nombre (apellido / RUT / edad). */}
              {watch('allowGuests') && watch('registrationConfig.guests.mode' as any) === 'named' && (
                <div className="sm:col-span-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                    Datos de cada invitado
                    <InfoTooltip text="Elige qué pedir de cada invitado con nombre y qué es obligatorio. El Nombre siempre se pide." />
                  </label>
                  <div className="rounded-xl border border-gray-200 divide-y">
                    {CONFIGURABLE_GUEST_FIELDS.map((f) => {
                      const enabled = watch(`registrationConfig.guests.formFields.${f.key}.enabled` as any);
                      return (
                        <div key={f.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                            <input type="checkbox" {...register(`registrationConfig.guests.formFields.${f.key}.enabled` as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            {f.label}
                          </label>
                          {enabled && (
                            <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                              <input type="checkbox" {...register(`registrationConfig.guests.formFields.${f.key}.required` as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                              Obligatorio
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">El <b>Nombre</b> de cada invitado siempre se pide.</p>
                </div>
              )}

              {/* Cómo llamar a los invitados en la landing (solo etiqueta visual). */}
              {watch('allowGuests') && (
                <div className="sm:col-span-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                    ¿Cómo llamarlos en la página pública?
                    <InfoTooltip text="Solo cambia la palabra que ven los asistentes (títulos y botón 'Agregar…'), por ejemplo 'Carga/Cargas' en lugar de 'Invitado/Invitados'. No cambia cómo funciona." />
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input {...register('registrationConfig.guests.termSingular' as any)} placeholder="Singular (ej. Carga)" maxLength={30} className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 sm:text-sm" />
                    <input {...register('registrationConfig.guests.termPlural' as any)} placeholder="Plural (ej. Cargas)" maxLength={30} className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 sm:text-sm" />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">Por defecto: <b>Invitado</b> / <b>Invitados</b>. Ejemplo: <b>Carga</b> / <b>Cargas</b>.</p>
                </div>
              )}
            </div>

            {/* Pestaña: Diseño de la landing */}
            <div className={activeTab === 'diseno' ? '' : 'hidden'}>
                <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
                  Diseño de la landing
                  <InfoTooltip text="Personaliza el aspecto de la página pública de inscripción: logo, imagen de fondo y colores." />
                </h3>
                <p className="text-sm text-gray-600 mb-3">Plantilla seleccionada: <b>{TEMPLATE_NAMES[selectedTemplate] || selectedTemplate}</b> <span className="text-gray-400">(se cambia en la pestaña Registro).</span></p>
                {isGala ? (
                  <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800">
                    ✅ La plantilla <b>Gala</b> usa <b>todas</b> las opciones de abajo, incluidas las marcadas <b>Solo Gala</b> (imagen destacada, imágenes de éxito, color/tamaño/sombra del título y el modal de restricción).
                  </div>
                ) : (
                  <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                    ⚠️ En la plantilla <b>{TEMPLATE_NAMES[selectedTemplate] || selectedTemplate}</b>, las opciones marcadas <b>Solo Gala</b> <b>no tienen efecto</b> (imagen destacada, imágenes de éxito, color/tamaño/sombra del título, modal de restricción). Sí aplican: logo, fondo, colores generales y tipografía.
                  </div>
                )}

                <div className="space-y-5">
                  <DesignControls
                    isGala={isGala}
                    theme={designTheme}
                    setTheme={dcSetTheme}
                    setFormColor={dcSetFormColor}
                    defaultFor={dcDefaultFor}
                    resetTheme={dcResetTheme}
                    images={dcImages}
                    uploading={uploading}
                    onImage={dcOnImage}
                    onClearImage={dcOnClearImage}
                  />
                </div>
              </div>

            {/* Pestaña: Formulario y registro */}
            <div className={activeTab === 'registro' ? '' : 'hidden'}>
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
                </div>
            </div>

            {/* Pestaña: Formulario (campos, opciones, preguntas, correo) */}
            <div className={activeTab === 'formulario' ? '' : 'hidden'}>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Formulario de inscripción</h3>
                <div className="space-y-4">

                  {/* Campos del formulario */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      Campos del formulario
                      <InfoTooltip text="Elige qué campos pedir en la inscripción y cuáles son obligatorios. Nombre, Apellido y Correo siempre se piden." />
                    </label>
                    <div className="rounded-xl border border-gray-200 divide-y">
                      {CONFIGURABLE_FIELDS.map((f) => {
                        const enabled = watch(`registrationConfig.formFields.${f.key}.enabled` as any);
                        // Correo bloqueado (activado + obligatorio) cuando hay plantilla de correo.
                        const locked = f.key === 'email' && emailOn;
                        return (
                          <div key={f.key} className="flex items-center justify-between gap-3 px-3 py-2.5">
                            <label className={`flex items-center gap-2 text-sm text-gray-700 ${locked ? '' : 'cursor-pointer'}`}>
                              {locked ? (
                                <input type="checkbox" checked disabled className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                              ) : (
                                <input type="checkbox" {...register(`registrationConfig.formFields.${f.key}.enabled` as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                              )}
                              {f.label}
                            </label>
                            {(enabled || locked) && (
                              locked ? (
                                <label className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <input type="checkbox" checked disabled className="h-4 w-4 rounded border-gray-300 text-indigo-600" />
                                  Obligatorio
                                </label>
                              ) : (
                                <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                                  <input type="checkbox" {...register(`registrationConfig.formFields.${f.key}.required` as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                  Obligatorio
                                </label>
                              )
                            )}
                          </div>
                        );
                      })}
                      <label className="flex items-center gap-2 text-sm text-gray-700 px-3 py-2.5 cursor-pointer">
                        <input type="checkbox" {...register('registrationConfig.guests.dietary' as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                        Preguntar preferencia alimenticia a cada invitado
                      </label>
                      {watch('registrationConfig.guests.dietary' as any) && (
                        <label className="flex items-center gap-2 text-sm text-gray-700 px-3 py-2.5 pl-9 cursor-pointer">
                          <input type="checkbox" {...register('registrationConfig.guests.dietaryRequired' as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          Obligatoria — cada invitado debe elegir una opción (puede ser «Ninguna»)
                        </label>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Nombre y Apellido siempre se piden.</p>
                    {emailOn && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                        ⚠️ Este evento envía <b>correo de confirmación</b>, así que el <b>Correo</b> queda activado y obligatorio (no se puede desmarcar): sin correo no habría a dónde enviarlo. Si quieres poder desmarcarlo, primero quita la plantilla de correo más abajo.
                      </div>
                    )}
                  </div>

                  {/* Datos a mostrar en la pantalla de ACREDITACIÓN (la puerta) */}
                  <div>
                    <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                      Datos a mostrar en la acreditación
                      <InfoTooltip text="Elige qué datos extra ve el acreditador en la puerta. Siempre se muestran: nombre, RUT, preferencia alimenticia, premiado y la edad del invitado (si se pide)." />
                    </label>
                    <div className="rounded-xl border border-gray-200 divide-y">
                      {CONFIGURABLE_ACCREDITATION_FIELDS.map((f) => (
                        <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700 px-3 py-2.5 cursor-pointer">
                          <input type="checkbox" {...register(`registrationConfig.accreditationFields.${f.key}` as any)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          {f.label}
                        </label>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Siempre se muestran: <b>nombre</b>, <b>RUT</b>, <b>preferencia alimenticia</b>, <b>premiado</b> y la <b>edad</b> del invitado (si el evento la pide).</p>
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

                  {/* Preguntas configurables "Sí/No + lista" (ej. transporte + recorrido) */}
                  {(() => {
                    const path = 'registrationConfig.customQuestions' as any;
                    const questions: any[] = (watch(path) as any[]) || [];
                    const update = (next: any[]) => setValue(path, next, { shouldDirty: true });
                    const patch = (i: number, key: string, value: any) => {
                      const next = questions.map((q, idx) => (idx === i ? { ...q, [key]: value } : q));
                      update(next);
                    };
                    return (
                      <div className="border-t border-gray-100 pt-5">
                        <label className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                          Preguntas del formulario (Sí/No + lista)
                          <InfoTooltip text="Preguntas de tipo Sí/No con una lista desplegable (ej. '¿Necesitas transporte?' → recorrido). El asistente elige Sí/No y, si elige Sí, escoge una opción de la lista. Se guardan por participante y aparecen en la acreditación, la exportación y al editar el participante." />
                        </label>
                        <p className="text-xs text-gray-500 mb-3">Si el asistente elige "No", la lista queda vacía y bloqueada.</p>

                        <div className="space-y-4">
                          {questions.map((q, i) => (
                            <div key={q.key || i} className="rounded-xl border border-gray-200 p-4 bg-gray-50/60">
                              <div className="flex items-start gap-2">
                                <input
                                  value={q.label || ''}
                                  onChange={(e) => patch(i, 'label', e.target.value)}
                                  placeholder="Título de la pregunta (ej. ¿Necesitas transporte?)"
                                  className="flex-1 rounded-lg border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
                                />
                                <button type="button" title="Quitar pregunta" onClick={() => update(questions.filter((_, idx) => idx !== i))} className="px-3 py-2 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg bg-white">✕</button>
                              </div>
                              <input
                                value={q.selectLabel || ''}
                                onChange={(e) => patch(i, 'selectLabel', e.target.value)}
                                placeholder="Etiqueta de la lista (opcional, ej. Recorrido)"
                                className="mt-2 w-full rounded-lg border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
                              />
                              <input
                                value={q.selectHelp || ''}
                                onChange={(e) => patch(i, 'selectHelp', e.target.value)}
                                placeholder="Mensaje aclaratorio (opcional, ej. Selecciona la ruta que necesitas)"
                                className="mt-2 w-full rounded-lg border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
                              />
                              <p className="mt-1 text-xs text-gray-400">El mensaje se muestra al asistente cuando elige "Sí", encima de la lista.</p>
                              <div className="mt-3">
                                <p className="text-xs font-medium text-gray-600 mb-1">Opciones de la lista <span className="font-normal text-gray-400">(déjalas vacías para una pregunta solo Sí/No)</span></p>
                                <div className="space-y-2">
                                  {((q.options as string[]) || []).map((opt: string, oi: number) => (
                                    <div key={oi} className="flex gap-2">
                                      <input
                                        value={opt}
                                        onChange={(e) => { const opts = [...((q.options as string[]) || [])]; opts[oi] = e.target.value; patch(i, 'options', opts); }}
                                        placeholder={`Opción ${oi + 1}`}
                                        className="flex-1 rounded-lg border-gray-200 bg-white px-3 py-2 text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 sm:text-sm"
                                      />
                                      <button type="button" title="Quitar opción" onClick={() => patch(i, 'options', ((q.options as string[]) || []).filter((_, idx) => idx !== oi))} className="px-3 text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg bg-white">✕</button>
                                    </div>
                                  ))}
                                </div>
                                <button type="button" onClick={() => patch(i, 'options', [...((q.options as string[]) || []), ''])} className="mt-2 text-sm font-medium text-indigo-600 hover:text-indigo-700">+ Agregar opción</button>
                              </div>
                              <label className="mt-3 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={!!q.required} onChange={(e) => patch(i, 'required', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                Si elige "Sí", es obligatorio escoger una opción
                              </label>
                              <label className="mt-2 flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input type="checkbox" checked={q.showOnAccreditation !== false} onChange={(e) => patch(i, 'showOnAccreditation', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                Mostrar la respuesta al acreditar
                              </label>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => update([...questions, { key: `q_${Math.random().toString(36).slice(2, 9)}`, label: '', selectLabel: '', options: [''], required: false, active: true, showOnAccreditation: true }])}
                          className="mt-3 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          + Agregar pregunta
                        </button>
                      </div>
                    );
                  })()}

                  {/* Plantilla de correo */}
                  <div>
                    <label htmlFor="emailTemplateId" className="flex items-center text-sm font-semibold text-gray-700 mb-1">
                      Plantilla de correo de confirmación
                      <InfoTooltip text="Correo (EmailJS) que se envía al inscribirse. Crea y gestiona las plantillas en Configuración." />
                    </label>
                    {/* Controlado por el estado del formulario (no por `register`): la lista
                        de plantillas se carga async y, si tardaba, el <select> con register
                        quedaba vacío al montar y se BORRABA la selección al guardar. Así el
                        valor lo manda siempre el estado, aunque las opciones lleguen después. */}
                    {(() => {
                      const val = (watch('emailTemplateId') as string) || '';
                      // Si la plantilla guardada aún no está en la lista, se muestra igual
                      // (no se pierde por un fallo/tardanza de carga).
                      const missing = val && !emailTemplates.some((t) => t.id === val);
                      return (
                        <select
                          id="emailTemplateId"
                          value={val}
                          onChange={(e) => setValue('emailTemplateId' as any, e.target.value, { shouldDirty: true })}
                          className="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200 sm:text-sm"
                        >
                          <option value="">Sin correo de confirmación</option>
                          {emailTemplates.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
                          {missing && <option value={val}>Plantilla seleccionada</option>}
                        </select>
                      );
                    })()}
                  </div>
                </div>
              </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-5 py-4 sm:px-8 sm:py-5 border-t border-gray-100 flex justify-end space-x-3 flex-shrink-0">
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
