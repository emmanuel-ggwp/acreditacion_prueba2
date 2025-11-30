export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
  GUARD: 'GUARDIA',
  ACCREDITATION_STAFF: 'ACREDITADOR', // Keeping this for now, but prefer OPERATOR
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/api/auth/login',
  LOGOUT: '/api/auth/logout',
  REGISTER: '/api/auth/register',
  REFRESH_TOKEN: '/api/auth/refresh',
  ME: '/api/users/me',

  // Events
  EVENTS: '/api/events',
  EVENT_BY_ID: (id: string) => `/api/events/${id}`,
  EVENT_STATS: (id: string) => `/api/events/${id}/stats`,

  // Participants
  PARTICIPANTS: (eventId: string) => `/api/events/${eventId}/participants`,
  PARTICIPANT_BY_ID: (eventId: string, participantId: string) => `/api/events/${eventId}/participants/${participantId}`,
  UPLOAD_PARTICIPANTS: (eventId: string) => `/api/events/${eventId}/participants/upload`,

  // Accreditations
  ACCREDITATIONS: (eventId: string) => `/api/events/${eventId}/accreditations`,
  ACCREDIT_PARTICIPANT: '/api/accreditations',
  LAST_ACCREDITATION: (eventId: string) => `/api/events/${eventId}/accreditations/last`,

  // Users
  USERS: '/api/users',
  USER_BY_ID: (id: string) => `/api/users/${id}`,
};

export const DATE_FORMATS = {
  DEFAULT: 'dd/MM/yyyy',
  DATETIME: 'dd/MM/yyyy HH:mm:ss',
  TIME: 'HH:mm:ss',
  ISO: 'yyyy-MM-dd',
};

export const PAGINATION_DEFAULTS = {
  PAGE: 1,
  LIMIT: 10,
  MAX_LIMIT: 100,
};

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  AUTHENTICATION_FAILED: 'Authentication failed. Please log in again.',
  NOT_FOUND: 'The requested resource was not found.',
  CONFLICT: 'A conflict occurred. The resource may already exist.',
  VALIDATION_ERROR: 'Please check the form for errors.',
  SERVER_ERROR: 'An unexpected server error occurred.',
  NETWORK_ERROR: 'A network error occurred. Please check your connection.',
};

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Logged in successfully.',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  CREATE_SUCCESS: (item: string) => `${item} created successfully.`,
  UPDATE_SUCCESS: (item: string) => `${item} updated successfully.`,
  DELETE_SUCCESS: (item: string) => `${item} deleted successfully.`,
};
