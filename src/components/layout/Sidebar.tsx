'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Users, BarChart, Shield, Settings, ChevronLeft, LogOut, User, Gift, History, UserCog } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { ROLES, Role } from '@/utils/constants';
import RoleGuard from '../auth/RoleGuard';
import { LogoMark, BrandDots } from '@/components/ui/Logo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  allowedRoles: Role[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Panel', icon: Home, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.GUARD] },
  { href: '/events', label: 'Eventos', icon: Calendar, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR] },
  { href: '/accreditation', label: 'Acreditación', icon: Shield, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.GUARD] },
  { href: '/participants', label: 'Participantes', icon: Users, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR] },
  { href: '/reports', label: 'Reportes', icon: BarChart, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR] },
  { href: '/gifts', label: 'Regalos Navidad', icon: Gift, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.GUARD] },
  { href: '/audit', label: 'Actividad', icon: History, allowedRoles: [ROLES.ADMIN] },
  { href: '/users', label: 'Usuarios', icon: UserCog, allowedRoles: [ROLES.ADMIN] },
  { href: '/settings', label: 'Configuración', icon: Settings, allowedRoles: [ROLES.ADMIN] },
];

const NavLink: React.FC<{ item: NavItem; isCollapsed: boolean }> = ({ item, isCollapsed }) => {
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.href);

  return (
    <RoleGuard allowedRoles={item.allowedRoles}>
      <li>
        <Link
          href={item.href}
          className={`group flex items-center p-2 my-0.5 rounded-lg transition-all duration-300 ${
            isActive 
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20' 
              : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-sm hover:shadow-gray-200/30'
          }`}
        >
          <div className={`relative flex items-center justify-center h-8 w-8 rounded-md ${
            isActive 
              ? 'bg-white/20 backdrop-blur-sm' 
              : 'bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-indigo-50 group-hover:to-purple-50'
          }`}>
            <item.icon className={`h-4 w-4 ${
              isActive ? 'text-white' : 'text-gray-600 group-hover:text-indigo-600'
            }`} />
          </div>
          {!isCollapsed && (
            <span className={`ml-3 text-sm font-medium transition-all duration-300 ${
              isActive ? 'text-white' : 'text-gray-700 group-hover:text-gray-900'
            }`}>
              {item.label}
            </span>
          )}
          {isActive && !isCollapsed && (
            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-white/80 animate-pulse"></div>
          )}
        </Link>
      </li>
    </RoleGuard>
  );
};

const Sidebar: React.FC<{ isCollapsed: boolean; onToggle: () => void; isOpen: boolean }> = ({ isCollapsed, onToggle, isOpen }) => {
  const { user, logout } = useAuthStore();
  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={`fixed inset-0 bg-gradient-to-br from-black/60 to-gray-900/40 backdrop-blur-sm z-30 md:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`} 
        onClick={onToggle}
      ></div>

      <aside
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-white via-white to-gray-50 shadow-xl shadow-gray-900/5 z-40 transition-all duration-500 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 md:transition-all ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Header with gradient */}
        <div onClick={onToggle} className="flex items-center justify-between h-16 px-4 border-b border-gray-200/50 bg-gradient-to-r from-white to-gray-50">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <LogoMark size={32} className="rounded-lg shadow-md shadow-indigo-500/20" />
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-blue-900 to-indigo-700 bg-clip-text text-transparent">
                  AcreditaPro
                </span>
                <p className="text-[10px] text-gray-500 mt-0.5">Acreditación</p>
                <BrandDots size={5} gap={4} className="mt-1" />
              </div>
            </div>
          )}
          {isCollapsed && (
            <LogoMark size={32} className="rounded-lg shadow-md shadow-indigo-500/20 mx-auto" />
          )}
          <button 
            
            className="hidden md:flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-600 hover:text-indigo-600 shadow-sm hover:shadow transition-all duration-300"
          >
            <ChevronLeft className={`h-4 w-4 transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-3 flex-1 overflow-y-auto">
          <div className="mb-4">
            {!isCollapsed && (
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">Navegación</p>
            )}
            <ul className="space-y-0.5">
              {navItems.map((item) => (
                <NavLink key={item.href} item={item} isCollapsed={isCollapsed} />
              ))}
            </ul>
          </div>
        </nav>

        {/* User Profile Section */}
        {user && !isCollapsed && (
          <div className="border-t border-gray-200/50 p-3 bg-gradient-to-t from-gray-50 to-white">
            <div className="flex items-center space-x-2 p-2 rounded-lg bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-all duration-300 cursor-pointer group">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-sm">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-gray-500 truncate">{user.email}</p>
                <div className="flex items-center mt-0.5">
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700">
                    {user.role}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 w-full flex items-center justify-center space-x-1.5 p-2 rounded-lg text-gray-600 hover:text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all duration-300 group"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">Cerrar sesión</span>
            </button>
          </div>
        )}

        {user && isCollapsed && (
          <div className="border-t border-gray-200/50 p-3">
            <div className="flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-sm cursor-pointer">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
