import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import Participant from '@/models/Participant';
import { participantSchema, createParticipantSchema, updateParticipantSchema } from '@/utils/validators/participantSchemas';
import apiClient from '@/utils/apiClient';
import useAuthStore from './authStore';
import { z } from 'zod';

type ParticipantWithAccreditation = Participant['dataValues'] & {
  accredited?: boolean;
  isAccredited?: boolean;
};

interface ParticipantState {
  participants: ParticipantWithAccreditation[];
  currentParticipant: ParticipantWithAccreditation | null;
  loading: boolean;
  error: string | null;
  total: number;
  fetchParticipantsByEvent: (eventId: string, page?: number, limit?: number, filters?: any) => Promise<void>;
  fetchParticipantById: (id: string) => Promise<void>;
  searchParticipants: (eventId: string, query: string) => Promise<Participant[]>;
  createParticipant: (participantData: z.infer<typeof createParticipantSchema>) => Promise<void>;
  updateParticipant: (id: string, participantData: z.infer<typeof updateParticipantSchema>) => Promise<void>;
  deleteParticipant: (id: string) => Promise<void>;
  setCurrentParticipant: (participant: ParticipantWithAccreditation | null) => void;
}

const useParticipantStore = create<ParticipantState>()(
  devtools(
    (set) => ({
      participants: [],
      currentParticipant: null,
      loading: false,
      error: null,
      total: 0,

      fetchParticipantsByEvent: async (eventId, page = 1, limit = 10, filters = {}) => {
        set({ loading: true, error: null });
        try {
          const queryParams = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            ...filters,
          });
          const response = await apiClient.get<{ participants: any[]; total: number }>(
            `/api/events/${eventId}/participants?${queryParams.toString()}`
          );
          const participantsWithGuestCount = response.participants.map((p: any) => ({
            ...p,
            guestCount: p.guestCount || 0,
          }));
          set({ participants: participantsWithGuestCount, total: response.total, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchParticipantById: async (id) => {
        set({ loading: true, error: null });
        try {
          const participant = await apiClient.get<any>(`/api/participants/${id}`);
          set({ currentParticipant: participant, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      searchParticipants: async (eventId, query) => {
        try {
          const response = await apiClient.get<{ participants: Participant[] }>(`/api/events/${eventId}/participants?search=${query}`);
          return response.participants;
        } catch (error: any) {
          console.error('Error searching participants:', error);
          return [];
        }
      },

      createParticipant: async (participantData) => {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');
        set({ loading: true, error: null });
        try {
          const newParticipant = await apiClient.post<any>(`/api/participants`, { ...participantData, userId: user.id });
          set((state) => ({
            participants: [...state.participants, { ...newParticipant, guestCount: 0 }],
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      updateParticipant: async (id, participantData) => {
        set({ loading: true, error: null });
        try {
          const updatedParticipant = await apiClient.put<any>(`/api/participants/${id}`, participantData);
          set((state) => ({
            participants: state.participants.map((p) => (p.id === id ? { ...p, ...updatedParticipant } : p)),
            currentParticipant: state.currentParticipant?.id === id ? { ...state.currentParticipant, ...updatedParticipant } : state.currentParticipant,
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
          throw error;
        }
      },

      deleteParticipant: async (id) => {
        set({ loading: true, error: null });
        try {
          await apiClient.delete(`/api/participants/${id}`);
          set((state) => ({
            participants: state.participants.filter((p) => p.id !== id),
            total: state.total - 1,
            loading: false,
          }));
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      setCurrentParticipant: (participant) => {
        set({ currentParticipant: participant });
      },
    })
  )
);

export default useParticipantStore;

