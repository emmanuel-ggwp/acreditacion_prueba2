import React from 'react';
import { LogoMark, BrandDots } from '@/components/ui/Logo';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-2 text-center text-gray-500 text-sm">
          <div className="flex items-center gap-2">
            <LogoMark size={22} className="rounded-md" />
            <span className="font-semibold text-gray-700">AcreditaPro</span>
          </div>
          <BrandDots size={6} gap={5} />
          <p>&copy; {new Date().getFullYear()} AcreditaPro. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
