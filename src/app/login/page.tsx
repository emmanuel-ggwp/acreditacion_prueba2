'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/components/auth/LoginForm';
import useAuthStore from '@/store/authStore';
import { Logo, BrandDots } from '@/components/ui/Logo';

const LoginPage = () => {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/'); // Redirect to dashboard if already logged in
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex min-h-screen flex-1 flex-col justify-center px-6 py-12 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm flex flex-col items-center">
        <Logo size={44} />
        <BrandDots size={7} gap={6} className="mt-3" />
        <h2 className="mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
          Iniciar sesión en tu cuenta
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm p-8 bg-white shadow-lg rounded-lg">
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;
