'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import useAuthStore from '@/store/authStore';
import { Toaster } from 'react-hot-toast';
import useMobile from 'src/hooks/useMobile';

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // For mobile
  const { user, loading } = useAuthStore();
  const pathname = usePathname();

  const isMobile = useMobile();

  useEffect(() => {
    // Close mobile sidebar on navigation
    setIsSidebarOpen(false);
  }, [pathname]);

  const toggleSidebarCollapse = () => isMobile ? setIsSidebarOpen(!isSidebarOpen) : setIsSidebarCollapsed(!isSidebarCollapsed);
  const toggleSidebarOpen = () => setIsSidebarOpen(!isSidebarOpen);

  // Don't render layout for auth pages or public pages
  if (['/login', '/register'].includes(pathname) || pathname.startsWith('/public')) {
    return <>{children}</>;
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    // In a real app, you might have a redirect here, but since we are in a component,
    // the page itself should handle the redirect logic if the user is not authenticated.
    // This can be done with a HOC or in the page component directly.
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        isCollapsed={isSidebarCollapsed} 
        onToggle={toggleSidebarCollapse}
        isOpen={isSidebarOpen}
      />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header 
          onToggleSidebar={toggleSidebarOpen}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-white p-4 md:p-6">
          {/* Breadcrumbs could go here */}
          {children}
        </main>
      </div>
      <Toaster position="top-right" />
    </div>
  );
};

export default MainLayout;
