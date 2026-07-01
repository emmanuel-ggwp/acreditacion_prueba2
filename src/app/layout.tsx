import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import MainLayout from '@/components/layout/MainLayout';
import AuthProvider from '@/components/auth/AuthProvider';

// Nota: se usa la fuente del sistema (font-sans) en lugar de next/font/google
// porque este entorno no tiene acceso a fonts.gstatic.com (falla la descarga).

export const metadata: Metadata = {
  title: 'AcreditaPro',
  description: 'AcreditaPro — Acreditación y gestión de eventos',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <AuthProvider>
          <MainLayout>
            {children}
          </MainLayout>
          <ToastProvider />
        </AuthProvider>
      </body>
    </html>
  );
}
