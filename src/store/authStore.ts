import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';
import apiClient from '@/utils/apiClient';
import { API_ENDPOINTS } from '@/utils/constants';
import { loginSchema } from '@/utils/validators/authSchemas';
import { z } from 'zod';
import { decodeAccessToken } from '@/lib/jwt';
import { FrontendUser } from '../types';

interface AuthState {
  user: FrontendUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (credentials: z.infer<typeof loginSchema>) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuthToken: () => Promise<void>;
  setUser: (user: FrontendUser | null) => void;
  checkAuth: () => void;
}

interface AuthResponse {
  success: boolean;
  data: {
    user: FrontendUser;
    accessToken: string;
    refreshToken: string;
  };
}

interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
  };
}

const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        login: async (credentials) => {
          set({ loading: true, error: null });
          try {
            const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.LOGIN, credentials);
            const { user, accessToken, refreshToken } = response.data;
            set({ user, accessToken, refreshToken, isAuthenticated: true, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        logout: async () => {
          set({ loading: true });
          try {
            const refreshToken = get().refreshToken;
            if (refreshToken) {
              await apiClient.post(API_ENDPOINTS.LOGOUT, { refreshToken });
            }
          } catch (error: any) {
            console.error("Logout failed", error);
          } finally {
            set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, loading: false });
          }
        },

        refreshAuthToken: async () => {
          const currentRefreshToken = get().refreshToken;
          if (!currentRefreshToken) return;

          set({ loading: true });
          try {
            const response = await apiClient.post<RefreshResponse>(API_ENDPOINTS.REFRESH_TOKEN, { refreshToken: currentRefreshToken });
            const { accessToken } = response.data;
            set({ accessToken, loading: false });
          } catch (error: any) {
            set({ error: 'Session expired. Please log in again.', loading: false });
            get().logout();
          }
        },

        setUser: (user) => {
          set({ user });
        },

        checkAuth: () => {
          const accessToken = get().accessToken;
          if (accessToken) {
            const decoded = decodeAccessToken(accessToken);
            if (decoded) {
              set({ isAuthenticated: true });
              // Optionally fetch user profile here
            } else {
              get().logout();
            }
          }
        },
      }),
      {
        name: 'auth-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ accessToken: state.accessToken, refreshToken: state.refreshToken, user: state.user }),
      }
    )
  )
);

// Auto-refresh token logic
let interval: NodeJS.Timeout;
useAuthStore.subscribe((state) => {
  const { accessToken } = state;
  if (interval) {
    clearInterval(interval);
  }
  if (accessToken) {
    const decoded = decodeAccessToken(accessToken);
    if (decoded && decoded.exp) {
      const expiresIn = decoded.exp * 1000 - Date.now();
      const refreshThreshold = expiresIn - 60 * 1000; // 1 minute before expiry
      if (refreshThreshold > 0) {
        interval = setInterval(() => {
          useAuthStore.getState().refreshAuthToken();
        }, refreshThreshold);
      }
    }
  }
});

export default useAuthStore;
