'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { Role } from '@/utils/constants';
import { canAccess } from '@/utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const loading = useAuthStore((state) => state.loading);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  const userHasRequiredRole = allowedRoles ? canAccess(user?.role, allowedRoles) : true;

  if (loading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!userHasRequiredRole) {
    // Redirect to an unauthorized page or show a message
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center">
        <h1 className="text-4xl font-bold text-red-600">Access Denied</h1>
        <p className="mt-4 text-lg">You do not have permission to view this page.</p>
        <button
          onClick={() => router.push('/')}
          className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Go to Homepage
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
