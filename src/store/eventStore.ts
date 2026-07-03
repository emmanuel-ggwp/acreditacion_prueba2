import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import apiClient from '@/utils/apiClient';
import Event from '@/models/Event';
import EventSchedule from '@/models/EventSchedule';
import { createEventSchema, updateEventSchema, createScheduleSchema, updateScheduleSchema } from '@/utils/validators/eventSchemas';
import { z } from 'zod';

export interface FetchEventsParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  includeSchedules?: boolean;
  isActive?: boolean;
  filter?: 'all' | 'accredited' | 'accrediting' | 'upcoming' | 'cancelled';
}

interface EventState {
  events: Event[];
  EventSchedules: EventSchedule[];
  searchedSchedules: EventSchedule[];
  currentEvent: Event | null;
  loading: boolean;
  error: string | null;
  total: number;
  page: number;
  limit: number;
  fetchEvents: (params?: FetchEventsParams) => Promise<void>;
  fetchSchedulesForEvent: (eventId: string) => Promise<void>;
  searchSchedules: (query: string, searchAll?: boolean) => Promise<void>;
  fetchEventById: (id: string, includeSchedules?: boolean) => Promise<void>;
  createEvent: (eventData: z.infer<typeof createEventSchema>) => Promise<Event | void>;
  updateEvent: (id: string, eventData: z.infer<typeof updateEventSchema>) => Promise<void>;
  deleteEvent: (id: string, reason?: string) => Promise<void>;
  createSchedule: (scheduleData: z.infer<typeof createScheduleSchema>) => Promise<void>;
  updateSchedule: (id: string, eventId: string, scheduleData: z.infer<typeof updateScheduleSchema>) => Promise<void>;
  deleteSchedule: (id: string, eventId: string, reason?: string) => Promise<void>;
  setScheduleStatus: (scheduleId: string, eventId: string, status: string) => Promise<void>;
  setScheduleImage: (scheduleId: string, eventId: string, imageUrl: string | null) => Promise<void>;
  setCurrentEvent: (event: Event | null) => void;
}

const useEventStore = create<EventState>()(
  devtools(
    (set) => ({
      events: [],
      EventSchedules: [],
      searchedSchedules: [],
      currentEvent: null,
      loading: false,
      error: null,
      total: 0,
      page: 1,
      limit: 10,

      fetchEvents: async (params = {}) => {
        const { page = 1, limit = 10, includeSchedules = false, search, sortBy, sortOrder, isActive, filter } = params;
        set({ loading: true, error: null });
        try {
          const queryParams = new URLSearchParams();
          queryParams.append('page', page.toString());
          queryParams.append('limit', limit.toString());
          if (includeSchedules) queryParams.append('includeSchedules', 'true');
          if (search) queryParams.append('search', search);
          if (sortBy) queryParams.append('sortBy', sortBy);
          if (sortOrder) queryParams.append('sortOrder', sortOrder);
          if (isActive !== undefined) queryParams.append('isActive', isActive.toString());
          if (filter) queryParams.append('filter', filter);

          const response = await apiClient.get<{ events: Event[]; total: number }>(`/api/events?${queryParams.toString()}`);
          set({ events: response.events, total: response.total, page, limit, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchSchedulesForEvent: async (eventId: string) => {
        set({ loading: true, error: null });
        try {
          const response = await apiClient.get<EventSchedule[]>(`/api/events/${eventId}/schedules`);
          set({ EventSchedules: response, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      searchSchedules: async (query: string, searchAll = false) => {
        set({ loading: true, error: null });
        try {
            let url = `/api/events?mode=schedules`;
            if (query) {
                url += `&name=${encodeURIComponent(query)}`;
            }
            
            if (!searchAll) {
                const today = new Date();
                const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
                const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                
                yesterday.setHours(0,0,0,0);
                tomorrow.setHours(23,59,59,999);
                
                url += `&from=${yesterday.toISOString()}&to=${tomorrow.toISOString()}`;
            }

            const response = await apiClient.get<{ schedules: EventSchedule[] }>(url);
            set({ searchedSchedules: response.schedules, loading: false });
        } catch (error: any) {
            set({ error: error.message, loading: false });
        }
      },

      fetchEventById: async (id: string, includeSchedules = false) => {
        set({ loading: true, error: null });
        try {
          const event = await apiClient.get<Event>(`/api/events/${id}?includeSchedules=${includeSchedules}`);
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

      deleteEvent: async (id: string, reason?: string) => {
        set({ loading: true, error: null });
        try {
          const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
          await apiClient.delete(`/api/events/${id}${qs}`);
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
          set((state) => ({ EventSchedules: [...state.EventSchedules, newSchedule], loading: false }));
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
            EventSchedules: state.EventSchedules.map((s) => (s.id === updatedSchedule.id ? updatedSchedule : s)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteSchedule: async (id, eventId, reason) => {
        set({ loading: true, error: null });
        try {
          const rq = reason ? `?reason=${encodeURIComponent(reason)}` : '';
          await apiClient.delete(`/api/events/${eventId}/schedules/${id}${rq}`);
          set((state) => ({
            EventSchedules: state.EventSchedules.filter((s) => s.id !== id),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      setScheduleStatus: async (scheduleId, eventId, status) => {
        set({ loading: true, error: null });
        try {
          await apiClient.patch(`/api/events/${eventId}/schedules/${scheduleId}`, { status });
          await useEventStore.getState().fetchSchedulesForEvent(eventId);
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      setScheduleImage: async (scheduleId, eventId, imageUrl) => {
        await apiClient.patch(`/api/events/${eventId}/schedules/${scheduleId}`, { imageUrl: imageUrl || '' });
        await useEventStore.getState().fetchSchedulesForEvent(eventId);
      },

      setCurrentEvent: (event) => {
        set({ currentEvent: event });
      },
    })
  )
);

export default useEventStore;
