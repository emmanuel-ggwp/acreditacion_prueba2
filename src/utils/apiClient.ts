import useAuthStore from '@/store/authStore';
import { API_ENDPOINTS } from './constants';
import { AuthenticationError, ServerError, NetworkError, NotFoundError, ValidationError } from './errors';

// This interface is for the apiClient's public methods
interface ApiClientRequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null | object;
  responseType?: 'json' | 'blob' | 'text';
}

interface RetryConfig {
  attempts: number;
  delay: number; // in ms
}

const apiClient = {
  async request<T>(
    endpoint: string,
    options: ApiClientRequestOptions = {},
    retryConfig: RetryConfig = { attempts: 1, delay: 1000 },
    // Interno: marca el reintento posterior a un refresh para NO volver a refrescar
    // (evita la recursión sin fondo del bucle 401 → refresh → 401). (SB-17)
    alreadyRefreshed = false
  ): Promise<T> {
    const { accessToken, refreshAuthToken, logout } = useAuthStore.getState();
    const { responseType = 'json', ...fetchOptions } = options;

    // `set`, no `append` (SB-17): con `append`, el reintento tras un 401 —que ya
    // trae una cabecera Authorization— añadía una SEGUNDA, y el servidor recibía
    // `Bearer a, Bearer b`; `authHeader.split(' ')[1]` devolvía `a,` (token
    // inválido) → 401 de nuevo → refresh → recursión. `set` garantiza una sola.
    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    // Prepare the body and config for the actual fetch call
    let body: BodyInit | null | undefined;
    if (options.body) {
        if (typeof options.body === 'object' && !(options.body instanceof Blob) && !(options.body instanceof FormData)) {
            headers.set('Content-Type', 'application/json');
            body = JSON.stringify(options.body);
        } else {
            body = options.body as BodyInit;
        }
    }

    const config: RequestInit = {
      // same-origin (el valor por defecto de fetch, explícito aquí): envía y acepta
      // la cookie HttpOnly del refresh token en las peticiones a /api/auth/* del
      // mismo origen, sin abrir el envío de credenciales a orígenes cruzados
      // (la app llama siempre a rutas relativas del mismo origen).
      credentials: 'same-origin',
      ...fetchOptions,
      headers,
      body,
    };

    // Un 401 en login/logout NO es "sesión expirada que un refresh arregle": en
    // login significa credenciales inválidas y en logout no hay sesión que
    // renovar. Para esos endpoints se omite el reintento-con-refresco (que
    // enmascaraba el error como "Session expired") y se deja pasar el mensaje real
    // del servidor al usuario. Register SÍ mantiene el refresco: es una llamada
    // autenticada donde un 401 puede ser un access token caducado.
    const skipRefreshRetry =
      endpoint.includes(API_ENDPOINTS.LOGIN) || endpoint.includes(API_ENDPOINTS.LOGOUT);

    let attempt = 0;
    while (attempt < retryConfig.attempts) {
      try {
        const response = await fetch(endpoint, config);

        if (response.status === 401 && !skipRefreshRetry) {
          // Si ya se refrescó una vez y AÚN devuelve 401, el token nuevo no sirve:
          // no se refresca en bucle, se cierra sesión. (SB-17)
          if (alreadyRefreshed) {
            logout();
            throw new AuthenticationError('Session expired. Please log in again.');
          }
          // El refresco va en su propio try: solo un fallo AL REFRESCAR cierra la
          // sesión. El reintento va DESPUÉS, fuera del try, para que un 404/500 del
          // endpoint tras un refresco correcto se propague tal cual y no se
          // enmascare como "sesión caducada".
          let refreshed = false;
          try {
            await refreshAuthToken();
            refreshed = !!useAuthStore.getState().accessToken;
          } catch {
            refreshed = false;
          }
          if (!refreshed) {
            logout();
            throw new AuthenticationError('Session refresh failed. Please log in again.');
          }
          // Reintento UNA sola vez: la llamada recursiva relee el access token nuevo
          // del store y lo pone ella misma (con `set`); el flag corta la recursión.
          return await this.request<T>(endpoint, options, retryConfig, true);
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          // Los handlers devuelven el mensaje en `error`; se prioriza sobre `message`.
          const serverMessage = errorData.error || errorData.message;
          switch (response.status) {
            case 401:
              // Llega aquí el 401 de login/logout (sin reintento de refresco): se
              // surface el mensaje real del servidor —p. ej. "Credenciales
              // inválidas"— en vez de enmascararlo como sesión expirada.
              throw new AuthenticationError(serverMessage || 'Credenciales inválidas');
            case 404:
              throw new NotFoundError(serverMessage);
            case 422:
              throw new ValidationError(serverMessage, errorData.errors);
            default:
              throw new ServerError(serverMessage || 'Ocurrió un error inesperado del servidor');
          }
        }

        // If response is empty
        if (response.status === 204 || response.headers.get('Content-Length') === '0') {
            return {} as T;
        }

        if (responseType === 'blob') {
            return await response.blob() as unknown as T;
        } else if (responseType === 'text') {
            return await response.text() as unknown as T;
        }

        return await response.json() as T;

      } catch (error) {
        if (error instanceof NetworkError || error instanceof ServerError) {
          attempt++;
          if (attempt >= retryConfig.attempts) {
            throw error; // Rethrow after final attempt
          }
          await new Promise(resolve => setTimeout(resolve, retryConfig.delay * attempt));
        } else {
          throw error; // Rethrow other errors immediately
        }
      }
    }
    // This part should be unreachable, but is required for TS to know the function returns a promise
    throw new NetworkError('Request failed after multiple retries.');
  },

  get<T>(endpoint: string, options: ApiClientRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body: object, options: ApiClientRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  },

  put<T>(endpoint: string, body: object, options: ApiClientRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  },

  patch<T>(endpoint: string, body: object, options: ApiClientRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  },

  delete<T>(endpoint: string, options: ApiClientRequestOptions = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

export default apiClient;
