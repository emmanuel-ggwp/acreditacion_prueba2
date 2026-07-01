export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  OPERATOR: 'OPERATOR',
  GUARD: 'GUARDIA',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// Nombres y descripción de acceso de cada rol (para la pantalla de Usuarios).
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  OPERATOR: 'Operador',
  GUARDIA: 'Acreditador Eventos',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: 'Acceso total (incluye Configuración, Usuarios y Actividad).',
  MANAGER: 'Gestión completa: Panel, Eventos, Participantes, Acreditación, Premios, Reportes, Regalos.',
  OPERATOR: 'Operación: Eventos, Participantes, Acreditación, Premios, Reportes, Regalos.',
  GUARDIA: 'Panel, Acreditación y Regalos.',
};

export const ASSIGNABLE_ROLES: Role[] = [ROLES.ADMIN, ROLES.GUARD];

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
