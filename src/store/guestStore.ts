import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { z } from 'zod';
import Guest from '@/models/Guest';
import apiClient from '@/utils/apiClient';
import { createGuestSchema } from '@/utils/validators/participantSchemas';

interface GuestState {
  guests: Guest[];
  loading: boolean;
  error: string | null;
  fetchGuests: (participantId: string) => Promise<void>;
  createGuest: (participantId: string, data: z.infer<typeof createGuestSchema>) => Promise<void>;
   updateGuest: (guestId: string, data: Partial<Guest>) => Promise<void>;
  deleteGuest: (guestId: string, reason?: string) => Promise<void>;
}

const useGuestStore = create<GuestState>()(
  devtools((set) => ({
    guests: [],
    loading: false,
    error: null,

    fetchGuests: async (participantId) => {
      set({ loading: true, error: null });
      try {
        const participant = await apiClient.get<{
            guests: Guest[];
        }>(`/api/participants/${participantId}?includeGuests=true`);
        set({ guests: participant.guests, loading: false });
      } catch (error: any) {
        set({ error: error.message, loading: false });
      }
    },

    createGuest: async (participantId, data) => {
      set({ loading: true, error: null });
      try {
        const validated = createGuestSchema.parse({ ...data, participantId });
        const guest = await apiClient.post<Guest>(`/api/participants/${participantId}/guests`, validated);
        set((state) => ({ guests: [...state.guests, guest], loading: false }));
      } catch (error: any) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    updateGuest: async (guestId, data) => {
      set({ loading: true, error: null });
      try {
        const guest = await apiClient.put<Guest>(`/api/guests/${guestId}`, data);
        set((state) => ({
          guests: state.guests.map((g) => (g.id === guest.id ? guest : g)),
          loading: false,
        }));
      } catch (error: any) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },

    deleteGuest: async (guestId, reason) => {
      set({ loading: true, error: null });
      try {
        const rq = reason ? `?reason=${encodeURIComponent(reason)}` : '';
        await apiClient.delete(`/api/guests/${guestId}${rq}`);
        set((state) => ({ guests: state.guests.filter((g) => g.id !== guestId), loading: false }));
      } catch (error: any) {
        set({ error: error.message, loading: false });
        throw error;
      }
    },
  }))
);

export default useGuestStore;
