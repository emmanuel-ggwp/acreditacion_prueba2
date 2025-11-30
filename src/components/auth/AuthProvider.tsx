'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { decodeAccessToken } from '@/lib/jwt';
import { Role } from '@/utils/constants';

const publicRoutes = ['/login', '/register'];

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, accessToken, loading, checkAuth, setUser, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!isMounted) return;

    if (accessToken) {
      try {
        const decoded = decodeAccessToken(accessToken);
        const currentTime = Date.now() / 1000;

        if (decoded && decoded.exp < currentTime) {
          logout();
        } else if (decoded && !user) {
          // Reconstruct FrontendUser from decoded token
          const userFromToken = {
            id: decoded.id,
            role: decoded.role as Role,
            email: decoded.email,
            username: decoded.username,
          };
          setUser(userFromToken);
        }
      } catch (error) {
        console.error("Invalid token:", error);
        logout();
      }
    }
  }, [accessToken, user, setUser, logout, isMounted]);

  useEffect(() => {
    if (!loading && isMounted) {
      const isPublicRoute = publicRoutes.includes(pathname);

      // Prevent redirect loop: if we have a token but no user, wait for the other effect to restore the user
      if (accessToken && !user) {
        return;
      }

      if (!user && !isPublicRoute) {
        router.push('/login');
      }
      if (user && isPublicRoute) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router, isMounted, accessToken]);

  if (loading || !isMounted) {
    return <div className="flex items-center justify-center h-screen">Authenticating...</div>;
  }

  return <>{children}</>;
};

export default AuthProvider;
