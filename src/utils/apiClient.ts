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
    retryConfig: RetryConfig = { attempts: 1, delay: 1000 }
  ): Promise<T> {
    const { accessToken, refreshAuthToken, logout } = useAuthStore.getState();
    const { responseType = 'json', ...fetchOptions } = options;

    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.append('Authorization', `Bearer ${accessToken}`);
    }

    // Prepare the body and config for the actual fetch call
    let body: BodyInit | null | undefined;
    if (options.body) {
        if (typeof options.body === 'object' && !(options.body instanceof Blob) && !(options.body instanceof FormData)) {
            headers.append('Content-Type', 'application/json');
            body = JSON.stringify(options.body);
        } else {
            body = options.body as BodyInit;
        }
    }

    const config: RequestInit = {
      ...fetchOptions,
      headers,
      body,
    };

    let attempt = 0;
    while (attempt < retryConfig.attempts) {
      try {
        const response = await fetch(endpoint, config);

        if (response.status === 401) {
          try {
            await refreshAuthToken();
            // After refreshing, we get the new token and retry the request
            const newAccessToken = useAuthStore.getState().accessToken;
            if (newAccessToken) {
              headers.set('Authorization', `Bearer ${newAccessToken}`);
              // This counts as a new "first" attempt with the new token
              return await this.request(endpoint, { ...config, headers });
            } else {
              logout();
              throw new AuthenticationError('Session expired. Please log in again.');
            }
          } catch (error) {
            logout();
            throw new AuthenticationError('Session refresh failed. Please log in again.');
          }
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          switch (response.status) {
            case 404:
              throw new NotFoundError(errorData.message);
            case 422:
              throw new ValidationError(errorData.message, errorData.errors);
            default:
              throw new ServerError(errorData.message || 'An unknown server error occurred');
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
