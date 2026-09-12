import type { Metadata } from 'next';
import { headers } from 'next/headers';
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Leer una cabecera de la petición fuerza el renderizado DINÁMICO de todas las
  // rutas bajo este layout, y eso es un requisito de la CSP con nonce (SB-03): el
  // nonce lo emite el middleware nuevo en CADA petición, así que una página
  // servida como HTML estático precompilado llevaría scripts SIN el nonce de esta
  // petición y `strict-dynamic` los bloquearía (pantalla en blanco). Con el
  // render por petición, Next inyecta el nonce correcto en sus <script> de
  // arranque/hidratación automáticamente al ver la cabecera Content-Security-Policy
  // que el middleware añade a la petición. El coste es despreciable: estas páginas
  // son cascarones que hidratan y piden datos en el cliente, no HTML pesado de
  // servidor. Sin este render dinámico la etapa 2 rompería producción.
  //
  // No se expone el nonce en el DOM (basta con leer la cabecera para forzar el
  // render dinámico); Next ya lo pone en los <script> que él genera.
  await headers();

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
