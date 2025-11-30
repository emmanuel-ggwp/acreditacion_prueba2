'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Calendar, Users, Award, BarChart, Shield, Settings, ChevronLeft } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { ROLES, Role } from '@/utils/constants';
import RoleGuard from '../auth/RoleGuard';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  allowedRoles: Role[];
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER] },
  { href: '/events', label: 'Events', icon: Calendar, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR] },
  { href: '/accreditation', label: 'Accreditation', icon: Shield, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.GUARD] },
  { href: '/participants', label: 'Participants', icon: Users, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR] },
  { href: '/awards', label: 'Awards', icon: Award, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR, ROLES.GUARD] },
  { href: '/reports', label: 'Reports', icon: BarChart, allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.OPERATOR] },
  { href: '/settings', label: 'Settings', icon: Settings, allowedRoles: [ROLES.ADMIN] },
];

const NavLink: React.FC<{ item: NavItem; isCollapsed: boolean }> = ({ item, isCollapsed }) => {
  const pathname = usePathname();
  const isActive = pathname.startsWith(item.href);

  return (
    <RoleGuard allowedRoles={item.allowedRoles}>
      <li>
        <Link
          href={item.href}
          className={`flex items-center p-3 my-1 rounded-lg transition-colors ${
            isActive ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <item.icon className="h-5 w-5" />
          {!isCollapsed && <span className="ml-4 font-medium">{item.label}</span>}
        </Link>
      </li>
    </RoleGuard>
  );
};

const Sidebar: React.FC<{ isCollapsed: boolean; onToggle: () => void; isOpen: boolean }> = ({ isCollapsed, onToggle, isOpen }) => {
  return (
    <>
      {/* Overlay for mobile */}
      <div className={`fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={onToggle}></div>

      <aside
        className={`fixed top-0 left-0 h-full bg-white shadow-lg z-40 transition-transform transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:translate-x-0 md:transition-width duration-300 ${
          isCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b">
          {!isCollapsed && <span className="text-xl font-bold text-indigo-600">Menu</span>}
          <button onClick={onToggle} className="hidden md:block text-gray-600 hover:text-indigo-600">
            <ChevronLeft className={`transform transition-transform ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
        <nav className="p-2">
          <ul>
            {navItems.map((item) => (
              <NavLink key={item.href} item={item} isCollapsed={isCollapsed} />
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
