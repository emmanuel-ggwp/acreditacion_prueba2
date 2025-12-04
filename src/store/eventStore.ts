import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import apiClient from '@/utils/apiClient';
import Event from '@/models/Event';
import EventSchedule from '@/models/EventSchedule';
import { createEventSchema, updateEventSchema, createScheduleSchema, updateScheduleSchema } from '@/utils/validators/eventSchemas';
import { z } from 'zod';

interface EventState {
  events: Event[];
  schedules: EventSchedule[];
  currentEvent: Event | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  fetchEvents: (page?: number, limit?: number) => Promise<void>;
  fetchSchedulesForEvent: (eventId: string) => Promise<void>;
  fetchEventById: (id: string) => Promise<void>;
  createEvent: (eventData: z.infer<typeof createEventSchema>) => Promise<Event | void>;
  updateEvent: (id: string, eventData: z.infer<typeof updateEventSchema>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  createSchedule: (scheduleData: z.infer<typeof createScheduleSchema>) => Promise<void>;
  updateSchedule: (id: string, eventId: string, scheduleData: z.infer<typeof updateScheduleSchema>) => Promise<void>;
  deleteSchedule: (id: string, eventId: string) => Promise<void>;
  setCurrentEvent: (event: Event | null) => void;
}

const useEventStore = create<EventState>()(
  devtools(
    (set) => ({
      events: [],
      schedules: [],
      currentEvent: null,
      loading: false,
      error: null,
      total: 0,
      page: 1,
      limit: 10,

      fetchEvents: async (page = 1, limit = 10) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.get<{ events: Event[]; total: number }>(`/api/events?page=${page}&limit=${limit}`);
          set({ events: response.events, total: response.total, page, limit, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchSchedulesForEvent: async (eventId: string) => {
        set({ loading: true, error: null });
        try {
          const schedules = await apiClient.get<EventSchedule[]>(`/api/events/${eventId}/schedules`);
          set({ schedules, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchEventById: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const event = await apiClient.get<Event>(`/api/events/${id}`);
          set({ currentEvent: event, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      createEvent: async (eventData) => {
        set({ loading: true, error: null });
        try {
          const newEvent = await apiClient.post<Event>('/api/events', eventData);
          set((state) => ({ events: [...state.events, newEvent], loading: false }));
          return newEvent;
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateEvent: async (id, eventData) => {
        set({ loading: true, error: null });
        try {
          const updatedEvent = await apiClient.put<Event>(`/api/events/${id}`, eventData);
          set((state) => ({
            events: state.events.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)),
            currentEvent: state.currentEvent?.id === updatedEvent.id ? updatedEvent : state.currentEvent,
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteEvent: async (id: string) => {
        set({ loading: true, error: null });
        try {
          await apiClient.delete(`/api/events/${id}`);
          set((state) => ({
            events: state.events.filter((e) => e.id !== id),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      createSchedule: async (scheduleData) => {
        set({ loading: true, error: null });
        try {
          const newSchedule = await apiClient.post<EventSchedule>(`/api/events/${scheduleData.eventId}/schedules`, scheduleData);
          set((state) => ({ schedules: [...state.schedules, newSchedule], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateSchedule: async (id, eventId, scheduleData) => {
        set({ loading: true, error: null });
        try {
          const updatedSchedule = await apiClient.put<EventSchedule>(`/api/events/${eventId}/schedules/${id}`, scheduleData);
          set((state) => ({
            schedules: state.schedules.map((s) => (s.id === updatedSchedule.id ? updatedSchedule : s)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteSchedule: async (id, eventId) => {
        set({ loading: true, error: null });
        try {
          await apiClient.delete(`/api/events/${eventId}/schedules/${id}`);
          set((state) => ({
            schedules: state.schedules.filter((s) => s.id !== id),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      setCurrentEvent: (event) => {
        set({ currentEvent: event });
      },
    })
  )
);

export default useEventStore;
