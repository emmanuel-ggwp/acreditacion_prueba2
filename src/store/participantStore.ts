import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import Participant from '@/models/Participant';
import { participantSchema } from '@/utils/validators/participantSchemas';
import { participantService } from '@/services/participantService';
import { accreditationService } from '@/services/accreditationService';
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
  createParticipant: (participantData: z.infer<typeof participantSchema>) => Promise<void>;
  updateParticipant: (id: string, participantData: Partial<z.infer<typeof participantSchema>>) => Promise<void>;
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
          const { participants, total } = await participantService.listParticipants(eventId, filters, { page, limit });
          const participantsWithGuestCount = participants.map((p: any) => ({
            ...p.dataValues,
            guestCount: p.dataValues.guestCount,
          }));
          set({ participants: participantsWithGuestCount, total, loading: false });
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      fetchParticipantById: async (id) => {
        set({ loading: true, error: null });
        try {
          const participant = await participantService.getParticipant(id, true, true);
          if (participant) {
            // TODO: The scheduleId is missing here. This needs to be passed from the component.
            const { isAccredited } = await accreditationService.verifyAccreditation('participant', id, '');
            set({ currentParticipant: { ...participant.dataValues, isAccredited }, loading: false });
          } else {
            set({ currentParticipant: null, loading: false });
          }
        } catch (error: any) {
          set({ error: error.message, loading: false });
        }
      },

      createParticipant: async (participantData) => {
        const { user } = useAuthStore.getState();
        if (!user) throw new Error('User not authenticated');
        set({ loading: true, error: null });
        try {
          const newParticipant = await participantService.createParticipant(participantData, user.id);
          // TODO: The scheduleId is missing here. This needs to be passed from the component.
          const { isAccredited } = await accreditationService.verifyAccreditation('participant', newParticipant.id, '');
          const participantWithAccreditation = { ...newParticipant.dataValues, isAccredited, guestCount: 0 };
          set((state) => ({
            participants: [...state.participants, participantWithAccreditation],
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
          const updatedParticipant = await participantService.updateParticipant(id, participantData);
          // TODO: The scheduleId is missing here. This needs to be passed from the component.
          const { isAccredited } = await accreditationService.verifyAccreditation('participant', id, '');
          const participantWithAccreditation = { ...updatedParticipant.dataValues, isAccredited };

          set((state) => ({
            participants: state.participants.map((p) => (p.id === id ? { ...p, ...participantWithAccreditation } : p)),
            currentParticipant: state.currentParticipant?.id === id ? { ...state.currentParticipant, ...participantWithAccreditation } : state.currentParticipant,
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
          await participantService.deleteParticipant(id);
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

