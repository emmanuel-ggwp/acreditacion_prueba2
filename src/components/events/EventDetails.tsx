'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import useEventStore from '@/store/eventStore';
import { Calendar, Clock, Users, Award, BarChart2, Save, Edit2, X } from 'lucide-react';
import ScheduleList from '@/components/events/ScheduleList';
import { createEventSchema, updateEventSchema } from '@/utils/validators/eventSchemas';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Placeholders for other components
const ParticipantsTab = () => <div>Participants Management</div>;
const AwardsTab = () => <div>Awards Management</div>;
const ReportsTab = () => <div>Event Reports</div>;

interface EventDetailsProps {
  eventId?: string;
}

type Tab = 'info' | 'schedules' | 'participants' | 'awards' | 'reports';
type EventFormData = z.infer<typeof createEventSchema>;

const EventDetails: React.FC<EventDetailsProps> = ({ eventId }) => {
  const router = useRouter();
  const { currentEvent, fetchEventById, createEvent, updateEvent, loading } = useEventStore();
  const [activeTab, setActiveTab] = useState<Tab>('info');
  const [isEditMode, setIsEditMode] = useState(!eventId);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch
  } = useForm<EventFormData>({
    resolver: zodResolver(eventId ? updateEventSchema : createEventSchema),
    defaultValues: {
      name: '',
      description: '',
      location: '',
      maxCapacity: null,
      allowGuests: true,
      maxGuestsPerParticipant: 0,
    }
  });

  const allowGuests = watch('allowGuests');

  useEffect(() => {
    if (eventId) {
      fetchEventById(eventId);
    } else {
      setIsEditMode(true);
    }
  }, [eventId, fetchEventById]);

  useEffect(() => {
    if (eventId && currentEvent) {
      reset({
        name: currentEvent.name,
        description: currentEvent.description || '',
        location: currentEvent.location || '',
        maxCapacity: currentEvent.maxCapacity,
        allowGuests: currentEvent.allowGuests,
        maxGuestsPerParticipant: currentEvent.maxGuestsPerParticipant,
      });
    }
  }, [currentEvent, eventId, reset]);

  const onSubmit = async (data: EventFormData) => {
    try {
      if (eventId) {
        await updateEvent(eventId, data);
        toast.success('Event updated successfully');
        setIsEditMode(false);
      } else {
        const newEvent = await createEvent(data);
        toast.success('Event created successfully');
        if (newEvent?.id) {
            router.push(`/events/${newEvent.id}`);
        }
      }
    } catch (error) {
      toast.error('Error saving event');
      console.error(error);
    }
  };

  if (loading && eventId && !currentEvent) {
    return <div className="text-center p-10">Loading event details...</div>;
  }

  if (eventId && !currentEvent && !loading) {
    return <div className="text-center p-10 text-red-500">Event not found.</div>;
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'info', label: 'Info', icon: Calendar },
    { id: 'schedules', label: 'Schedules', icon: Clock },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'awards', label: 'Awards', icon: Award },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
              <h3 className="text-xl font-semibold text-gray-900">Event Information</h3>
              {eventId && (
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    isEditMode 
                      ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50' 
                      : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  }`}
                >
                  {isEditMode ? <><X size={16} className="mr-2"/> Cancel</> : <><Edit2 size={16} className="mr-2"/> Edit Details</>}
                </button>
              )}
            </div>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  {isEditMode ? (
                    <input
                      {...register('name')}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                      placeholder="Event Name"
                    />
                  ) : (
                    <p className="text-lg text-gray-900 font-medium">{currentEvent?.name}</p>
                  )}
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  {isEditMode ? (
                    <textarea
                      {...register('description')}
                      rows={4}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                      placeholder="Describe your event..."
                    />
                  ) : (
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{currentEvent?.description || <span className="text-gray-400 italic">No description provided</span>}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  {isEditMode ? (
                    <input
                      {...register('location')}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                      placeholder="Event Location"
                    />
                  ) : (
                    <p className="text-gray-900 flex items-center"><span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-2"></span>{currentEvent?.location || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Capacity (optional)</label>
                  {isEditMode ? (
                    <>
                      <input
                        type="number"
                        {...register('maxCapacity', { 
                          setValueAs: (v) => (v === '' || v === null ? null : parseInt(v, 10))
                        })}
                        placeholder="Leave empty for unlimited"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                      />
                      {errors.maxCapacity && <p className="text-red-500 text-xs mt-1">{errors.maxCapacity.message}</p>}
                    </>
                  ) : (
                    <p className="text-gray-900">{currentEvent?.maxCapacity ? `${currentEvent.maxCapacity} attendees` : 'Unlimited capacity'}</p>
                  )}
                </div>

                <div className="flex items-center h-full pt-6">
                   {isEditMode ? (
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          id="allowGuests"
                          {...register('allowGuests')}
                          className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
                        />
                        <label htmlFor="allowGuests" className="ml-3 block text-sm font-medium text-gray-900 cursor-pointer">Allow Guests</label>
                      </div>
                   ) : (
                      <div className="flex items-center px-3 py-1 rounded-full bg-gray-100 w-fit">
                        <span className={`h-2.5 w-2.5 rounded-full mr-2 ${currentEvent?.allowGuests ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-sm font-medium text-gray-700">Guests {currentEvent?.allowGuests ? 'Allowed' : 'Not Allowed'}</span>
                      </div>
                   )}
                </div>

                {(allowGuests || (!isEditMode && currentEvent?.allowGuests)) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Guests per Participant</label>
                    {isEditMode ? (
                      <>
                        <input
                          type="number"
                          {...register('maxGuestsPerParticipant', { 
                            setValueAs: (v) => (v === '' || v === null ? 0 : parseInt(v, 10))
                          })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2.5 border"
                        />
                        {errors.maxGuestsPerParticipant && <p className="text-red-500 text-xs mt-1">{errors.maxGuestsPerParticipant.message}</p>}
                      </>
                    ) : (
                      <p className="text-gray-900">{currentEvent?.maxGuestsPerParticipant}</p>
                    )}
                  </div>
                )}
              </div>

              {isEditMode && (
                <div className="flex justify-end pt-6 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex justify-center items-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-70"
                  >
                    {isSubmitting ? 'Saving...' : <><Save size={18} className="mr-2"/> Save Changes</>}
                  </button>
                </div>
              )}
            </form>
          </div>
        );
      case 'schedules':
        return eventId ? <ScheduleList eventId={eventId} /> : <div className="p-6 text-center text-gray-500">Save the event to manage schedules.</div>;
      case 'participants':
        return eventId ? <ParticipantsTab /> : <div className="p-6 text-center text-gray-500">Save the event to manage participants.</div>;
      case 'awards':
        return eventId ? <AwardsTab /> : <div className="p-6 text-center text-gray-500">Save the event to manage awards.</div>;
      case 'reports':
        return eventId ? <ReportsTab /> : <div className="p-6 text-center text-gray-500">Save the event to view reports.</div>;
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {eventId ? currentEvent?.name : 'New Event'}
        </h1>
        <p className="text-gray-600">
          {eventId ? currentEvent?.location : 'Create a new event'}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="flex border-b border-gray-200 bg-gray-50">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center py-4 px-6 text-sm font-medium transition-all ${
                activeTab === id
                  ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white -mb-px'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} className="mr-2" />
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
