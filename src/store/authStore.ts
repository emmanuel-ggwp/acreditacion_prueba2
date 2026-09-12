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
    // El refresh token ya NO viaja en el cuerpo: llega en una cookie HttpOnly
    // que el JS no ve (hallazgo #4 / F3-08).
  };
}

const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        user: null,
        accessToken: null,
        isAuthenticated: false,
        loading: false,
        error: null,

        login: async (credentials) => {
          set({ loading: true, error: null });
          try {
            const response = await apiClient.post<AuthResponse>(API_ENDPOINTS.LOGIN, credentials);
            // El refresh token queda en la cookie HttpOnly que fija el servidor; el
            // cliente solo maneja user + access token.
            const { user, accessToken } = response.data;
            set({ user, accessToken, isAuthenticated: true, loading: false });
          } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
          }
        },

        logout: async () => {
          // Solo se llama al servidor si había sesión: evita un POST espurio a
          // /logout tras un login fallido. El servidor lee el refresh token de la
          // cookie (no del cuerpo) para revocarlo y borra la cookie.
          const hadSession = !!(get().user || get().accessToken);
          set({ loading: true });
          try {
            if (hadSession) {
              await apiClient.post(API_ENDPOINTS.LOGOUT, {});
            }
          } catch (error: any) {
            console.error("Logout failed", error);
          } finally {
            set({ user: null, accessToken: null, isAuthenticated: false, loading: false });
          }
        },

        refreshAuthToken: async () => {
          // Sin access token no hay sesión que renovar: evita refrescos espurios
          // (p. ej. tras un login fallido) y corta cualquier recursión.
          const token = get().accessToken;
          if (!token) return;

          set({ loading: true });
          try {
            // Fetch DIRECTO, no apiClient: la cookie HttpOnly del refresh token
            // viaja sola (same-origin) y, sobre todo, un 401 aquí NO debe disparar
            // el reintento-con-refresco de apiClient, que recurriría sobre este
            // mismo endpoint. Se envía el access token (aunque esté por caducar)
            // para que el rate-limit lo cuente en el cubo por-usuario, como antes.
            const res = await fetch(API_ENDPOINTS.REFRESH_TOKEN, {
              method: 'POST',
              credentials: 'same-origin',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: '{}',
            });
            if (!res.ok) throw new Error('Refresh request failed');
            const json = await res.json();
            const accessToken = json?.data?.accessToken;
            if (!accessToken) throw new Error('No access token in refresh response');
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
        // Ya NO se persiste el refresh token: vive en la cookie HttpOnly, fuera del
        // alcance del JS (hallazgo #4 / F3-08). El access token (corto) sigue en
        // localStorage para sobrevivir a la recarga; moverlo a memoria es la mejora
        // siguiente (ver nota en la PR).
        partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
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
