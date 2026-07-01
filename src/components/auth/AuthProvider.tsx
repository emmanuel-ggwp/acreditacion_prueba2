'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import useAuthStore from '@/store/authStore';
import { decodeAccessToken } from '@/lib/jwt';
import { Role } from '@/utils/constants';

const publicRoutes = ['/login', '/register'];

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, accessToken, loading, checkAuth, setUser, logout, refreshAuthToken } = useAuthStore();
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
          // Access token vencido: intentar refrescar; solo cerrar sesión si el refresh falla.
          refreshAuthToken().catch(() => logout());
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
  }, [accessToken, user, setUser, logout, isMounted, refreshAuthToken]);

  // Red de seguridad: si la verificación de sesión se cuelga (p. ej. el dev server
  // recompilando o un refresh que no responde), no quedarse pegado en "Autenticando…".
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        useAuthStore.getState().logout();
      }
    }, 10000);
    return () => clearTimeout(t);
  }, [loading]);

  useEffect(() => {
    if (!loading && isMounted) {
      const isPublicRoute = publicRoutes.includes(pathname);
      const isPublicLanding = pathname?.startsWith('/public');

      // Las landings públicas no requieren autenticación: no redirigir.
      if (isPublicLanding) {
        return;
      }

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

  // Las páginas públicas (landing de inscripción) se renderizan sin el guard de auth.
  if (pathname?.startsWith('/public')) {
    return <>{children}</>;
  }

  if (loading || !isMounted) {
    return <div className="flex items-center justify-center h-screen">Autenticando...</div>;
  }

  return <>{children}</>;
};

export default AuthProvider;
