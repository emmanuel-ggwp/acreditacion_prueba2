import { ROLES, Role } from './constants';

type User = {
  role: Role;
} | null;

export const PERMISSIONS = {
  MANAGE_EVENTS: [ROLES.ADMIN],
  ACCREDIT: [ROLES.ADMIN, ROLES.ACCREDITATION_STAFF],
  MANAGE_USERS: [ROLES.ADMIN],
  VIEW_REPORTS: [ROLES.ADMIN],
  MANAGE_PARTICIPANTS: [ROLES.ADMIN, ROLES.ACCREDITATION_STAFF],
  MANAGE_AWARDS: [ROLES.ADMIN],
  USE_KIOSK: [ROLES.ADMIN, ROLES.ACCREDITATION_STAFF, ROLES.GUARD],
};

/**
 * Checks if a user's role is included in the list of required roles.
 * @param userRole The role of the current user.
 * @param requiredRoles An array of roles that are allowed to access the resource.
 * @returns True if the user has permission, false otherwise.
 */
export const canAccess = (userRole: Role | undefined, requiredRoles: Role[]): boolean => {
  if (!userRole) {
    return false;
  }
  return requiredRoles.includes(userRole);
};

/**
 * Checks if a user has permission to manage events.
 * @param user The user object.
 * @returns True if the user can manage events.
 */
export const canManageEvent = (user: User): boolean => {
  return canAccess(user?.role, PERMISSIONS.MANAGE_EVENTS);
};

/**
 * Checks if a user has permission to accredit participants.
 * @param user The user object.
 * @returns True if the user can accredit.
 */
export const canAccredit = (user: User): boolean => {
  return canAccess(user?.role, PERMISSIONS.ACCREDIT);
};

/**
 * Checks if a user has permission to manage other users.
 * @param user The user object.
 * @returns True if the user can manage users.
 */
export const canManageUsers = (user: User): boolean => {
  return canAccess(user?.role, PERMISSIONS.MANAGE_USERS);
};
