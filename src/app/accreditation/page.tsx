'use client';

import React from 'react';
import AccreditationPanel from '@/components/accreditation/AccreditationPanel';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RoleGuard from '@/components/auth/RoleGuard';

const AccreditationPage = () => {
  return (
    <ProtectedRoute>
      <RoleGuard allowedRoles={['ADMIN', 'GUARDIA']}>
        <div className="min-h-screen bg-gray-100">
          <AccreditationPanel />
        </div>
      </RoleGuard>
    </ProtectedRoute>
  );
};

export default AccreditationPage;
