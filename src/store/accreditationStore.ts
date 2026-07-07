import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import apiClient from '@/utils/apiClient';
import Accreditation from '@/models/Accreditation';
import Participant from '@/models/Participant';
import Guest from '@/models/Guest';
import User from '@/models/User';

export type RichAccreditation = Accreditation & {
  Participant?: Participant;
  Guest?: Guest;
  accreditedByUser?: User;
};

interface AccreditationState {
  accreditations: RichAccreditation[];
  lastAccreditation: RichAccreditation | null;
  loading: boolean;
  error: string | null;
  totalAccreditations: number;
  accreditationsToday: number;
  activeSchedules: any[];
  fetchActiveSchedules: () => Promise<void>;
  setScheduleStatus: (scheduleId: string, eventId: string, status: string) => Promise<void>;
  fetchAccreditations: (eventId: string, page: number, limit: number) => Promise<void>;
  accreditParticipant: (participantId: string, eventScheduleId: string, accreditedById: string, notes?: string, guestCount?: number) => Promise<void>;
  accreditGuest: (guestId: string, eventScheduleId: string, accreditedById: string, notes?: string) => Promise<void>;
  verifyAccreditation: (type: 'participant' | 'guest', id: string, scheduleId: string) => Promise<{ isAccredited: boolean, accreditation: RichAccreditation | null }>;
  unaccredit: (type: 'participant' | 'guest', id: string, scheduleId: string) => Promise<void>;
  setGuestCount: (participantId: string, scheduleId: string, guestCount: number) => Promise<void>;
  getLastAccreditation: (eventId: string) => Promise<void>;
  getAccreditationStats: (eventId: string) => Promise<void>;
}

const useAccreditationStore = create<AccreditationState>()(
  devtools(
    (set) => ({
      accreditations: [],
      lastAccreditation: null,
      loading: false,
      error: null,
      totalAccreditations: 0,
      accreditationsToday: 0,
      activeSchedules: [],

      fetchActiveSchedules: async () => {
        try {
          const list = await apiClient.get<any[]>('/api/accreditation/schedules');
          set({ activeSchedules: list });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      setScheduleStatus: async (scheduleId, eventId, status) => {
        try {
          await apiClient.patch(`/api/events/${eventId}/schedules/${scheduleId}`, { status });
          await useAccreditationStore.getState().fetchActiveSchedules();
        } catch (error: any) {
          set({ error: error.message });
          throw error;
        }
      },

      fetchAccreditations: async (eventId, page, limit) => {
        set({ loading: true, error: null });
        try {
          const result = await apiClient.get<{ accreditations: RichAccreditation[]; total: number }>(`/api/accreditations?eventId=${eventId}&page=${page}&limit=${limit}`);
          set({ accreditations: result.accreditations, totalAccreditations: result.total, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      accreditParticipant: async (participantId, eventScheduleId, accreditedById, notes, guestCount) => {
        set({ loading: true, error: null });
        try {
          const newAccreditation = await apiClient.post<RichAccreditation>(`/api/accreditations`, {
            type: 'participant',
            id: participantId,
            scheduleId: eventScheduleId,
            notes,
            guestCount,
          });
          set((state) => ({
            accreditations: [newAccreditation, ...state.accreditations],
            totalAccreditations: state.totalAccreditations + 1,
            accreditationsToday: state.accreditationsToday + 1,
            loading: false,
          }));
          useAccreditationStore.getState().getLastAccreditation((newAccreditation as any).EventSchedule.eventId);
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      accreditGuest: async (guestId, eventScheduleId, accreditedById, notes) => {
        set({ loading: true, error: null });
        try {
          const newAccreditation = await apiClient.post<RichAccreditation>(`/api/accreditations`, {
            type: 'guest',
            id: guestId,
            scheduleId: eventScheduleId,
            notes,
          });
          set((state) => ({
            accreditations: [newAccreditation, ...state.accreditations],
            totalAccreditations: state.totalAccreditations + 1,
            accreditationsToday: state.accreditationsToday + 1,
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      unaccredit: async (type, id, scheduleId) => {
        set({ loading: true, error: null });
        try {
          await apiClient.delete(`/api/accreditations`, { body: { type, id, scheduleId } });
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      setGuestCount: async (participantId, scheduleId, guestCount) => {
        set({ loading: true, error: null });
        try {
          await apiClient.patch(`/api/accreditations`, { type: 'participant', id: participantId, scheduleId, guestCount });
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      verifyAccreditation: async (type, id, scheduleId) => {
        try {
          const result = await apiClient.post<{ isAccredited: boolean; accreditation: RichAccreditation | null }>(`/api/accreditations/verify`, {
            type,
            id,
            scheduleId,
          });
          return {
            isAccredited: result.isAccredited,
            accreditation: result.accreditation,
          };
        } catch (error: any) {
          set({ error: error.message });
          return { isAccredited: false, accreditation: null };
        }
      },

      getLastAccreditation: async (eventId: string) => {
        set({ loading: true, error: null });
        try {
          const result = await apiClient.get<{ accreditations: RichAccreditation[] }>(`/api/accreditations?eventId=${eventId}&page=1&limit=1`);
          const last = result.accreditations.length > 0 ? result.accreditations[0] : null;
          set({ lastAccreditation: last, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      getAccreditationStats: async (eventId: string) => {
        set({ loading: true, error: null });
        try {
          const stats = await apiClient.get<{ totalAccreditations: number; accreditationsToday: number }>(`/api/accreditations/stats?eventId=${eventId}`);
          set({
            totalAccreditations: stats.totalAccreditations,
            accreditationsToday: stats.accreditationsToday,
            loading: false,
          });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },
    })
  )
);

export default useAccreditationStore;
