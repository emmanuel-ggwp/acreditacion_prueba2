'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, User, LogOut, Menu, X } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { ROLES } from '@/utils/constants';
import RoleGuard from '../auth/RoleGuard';
import { LogoMark } from '@/components/ui/Logo';

const Header: React.FC<{ onToggleSidebar: () => void; isSidebarOpen: boolean }> = ({ onToggleSidebar, isSidebarOpen }) => {
  const { user, logout } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    // Redirect to login page will be handled by the layout or a protected route component
  };

  return (
    <header className="bg-white shadow-md h-16 flex items-center justify-between px-4 md:px-6 z-30">
      <div className="flex items-center">
        <button onClick={onToggleSidebar} className="text-gray-600 md:hidden mr-4">
          {isSidebarOpen ? <X /> : <Menu />}
        </button>
        <Link href="/dashboard" className="flex items-center" aria-label="AcreditaPro — Inicio">
          <LogoMark size={32} className="rounded-lg" />
        </Link>
      </div>

      <nav className="hidden md:flex items-center space-x-6">
        <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
          <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600">Panel</Link>
        </RoleGuard>
        <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR]}>
          <Link href="/events" className="text-gray-600 hover:text-indigo-600">Eventos</Link>
        </RoleGuard>
        <RoleGuard allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]}>
           <Link href="/users" className="text-gray-600 hover:text-indigo-600">Usuarios</Link>
        </RoleGuard>
      </nav>

      <div className="flex items-center space-x-4">
        <button className="text-gray-600 hover:text-indigo-600 relative">
          <Bell />
          <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        </button>

        <div className="relative">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="flex items-center space-x-2">
            <User className="text-gray-600" />
            <span className="hidden md:block text-sm font-medium text-gray-700">{user?.username}</span>
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                <p className="font-semibold">{user?.username}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
              <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Mi perfil</Link>
              <button onClick={handleLogout} className="w-full text-left flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
