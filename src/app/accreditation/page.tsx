'use client';

import React from 'react';
import AccreditationPanel from '@/components/accreditation/AccreditationPanel';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RoleGuard from '@/components/auth/RoleGuard';
import { ROLES } from '@/utils/constants';

const AccreditationPage = () => {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.GUARD]}>
        <div className="min-h-screen bg-gray-100">
          <AccreditationPanel />
        </div>
      </RoleGuard>
    </ProtectedRoute>
  );
};

export default AccreditationPage;
