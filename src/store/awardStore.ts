import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import Award from '@/models/Award';
import ParticipantAward from '@/models/ParticipantAward';
import apiClient from '@/utils/apiClient';
import { createAwardSchema, updateAwardSchema } from '@/utils/validators/awardSchemas';
import { z } from 'zod';
import useAuthStore from './authStore';

type AwardWithStock = Award & { availableStock: number };

interface AwardState {
  awards: AwardWithStock[];
  participantAwards: ParticipantAward[];
  loading: boolean;
  error: string | null;
  fetchAwardsByEvent: (eventId: string) => Promise<void>;
  createAward: (awardData: z.infer<typeof createAwardSchema>) => Promise<void>;
  updateAward: (awardId: string, awardData: z.infer<typeof updateAwardSchema>) => Promise<void>;
  deleteAward: (awardId: string, reason?: string) => Promise<void>;
  assignAward: (awardId: string, participantId: string, notes?: string) => Promise<void>;
  fetchAwardsForParticipant: (participantId: string) => Promise<void>;
  deliverAward: (participantAwardId: string) => Promise<void>;
  cancelAwardAssignment: (participantAwardId: string) => Promise<void>;
}

const useAwardStore = create<AwardState>()(
  devtools(
    (set, get) => ({
      awards: [],
      participantAwards: [],
      loading: false,
      error: null,

      fetchAwardsByEvent: async (eventId) => {
        set({ loading: true, error: null });
        try {
          const awards = await apiClient.get<AwardWithStock[]>(`/api/events/${eventId}/awards`);
          set({ awards, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      createAward: async (awardData) => {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');
        set({ loading: true, error: null });
        try {
          const newAward = await apiClient.post<AwardWithStock>(`/api/events/${awardData.eventId}/awards`, { ...awardData, userId: user.id });
          set((state) => ({ awards: [...state.awards, newAward], loading: false }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateAward: async (awardId, awardData) => {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');
        set({ loading: true, error: null });
        try {
          const updatedAward = await apiClient.put<AwardWithStock>(`/api/awards/${awardId}`, { ...awardData, userId: user.id });
          set((state) => ({
            awards: state.awards.map((a) => (a.id === awardId ? updatedAward : a)),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteAward: async (awardId, reason) => {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');
        set({ loading: true, error: null });
        try {
          const rq = reason ? `&reason=${encodeURIComponent(reason)}` : '';
          await apiClient.delete(`/api/awards/${awardId}?userId=${user.id}${rq}`);
          set((state) => ({
            awards: state.awards.filter((a) => a.id !== awardId),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      assignAward: async (awardId, participantId, notes) => {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');
        set({ loading: true, error: null });
        try {
          await apiClient.post(`/api/awards/${awardId}/assign`, { participantId, userId: user.id, notes });
          // Optionally refresh stock or participantAwards here if needed
          set({ loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      fetchAwardsForParticipant: async (participantId) => {
        set({ loading: true, error: null });
        try {
          const awards = await apiClient.get<ParticipantAward[]>(`/api/participants/${participantId}/awards`);
          set({ participantAwards: awards, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      deliverAward: async (participantAwardId) => {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');
        set({ loading: true, error: null });
        try {
          const updated = await apiClient.post<ParticipantAward>(`/api/participant-awards/${participantAwardId}/deliver`, { userId: user.id });
          set((state) => ({
            participantAwards: state.participantAwards.map(pa => pa.id === participantAwardId ? updated : pa),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      cancelAwardAssignment: async (participantAwardId) => {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');
        set({ loading: true, error: null });
        try {
          await apiClient.post(`/api/participant-awards/${participantAwardId}/cancel`, { userId: user.id });
          set((state) => ({
            participantAwards: state.participantAwards.filter(pa => pa.id !== participantAwardId),
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },
    })
  )
);

export default useAwardStore;
