'use client';

import React from 'react';
import useAuthStore from '@/store/authStore';
import { Role } from '@/utils/constants';
import { canAccess } from '@/utils/permissions';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: Role[];
  fallback?: React.ReactNode;
}

const RoleGuard: React.FC<RoleGuardProps> = ({ children, allowedRoles, fallback = null }) => {
  const user = useAuthStore((state) => state.user);

  const hasPermission = canAccess(user?.role, allowedRoles);

  return hasPermission ? <>{children}</> : <>{fallback}</>;
};

export default RoleGuard;
