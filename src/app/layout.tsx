import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import MainLayout from '@/components/layout/MainLayout';
import AuthProvider from '@/components/auth/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Accreditation System',
  description: 'Event Accreditation Management',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
