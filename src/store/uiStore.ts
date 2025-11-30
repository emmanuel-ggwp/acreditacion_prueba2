import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type ModalType = 'participant' | 'event' | 'user' | 'confirm';

interface ModalPayload {
  [key: string]: any;
}

interface ModalState {
  type: ModalType | null;
  isOpen: boolean;
  payload: ModalPayload;
}

interface UIState {
  sidebarOpen: boolean;
  modal: ModalState;
  toggleSidebar: () => void;
  openModal: (type: ModalType, payload?: ModalPayload) => void;
  closeModal: () => void;
}

const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      sidebarOpen: true,
      modal: {
        type: null,
        isOpen: false,
        payload: {},
      },
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      openModal: (type, payload = {}) => set({ modal: { type, isOpen: true, payload } }),
      closeModal: () => set({ modal: { type: null, isOpen: false, payload: {} } }),
    })
  )
);

export default useUIStore;
