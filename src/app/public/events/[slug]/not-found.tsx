import React from 'react';
import { SearchX } from 'lucide-react';
import RegistrationClosed from '@/components/public/RegistrationClosed';

/**
 * Pantalla mostrada cuando el evento público no existe: el slug está mal escrito,
 * el evento fue eliminado, o dejó de ser público/activo (o la base no responde).
 * Next la renderiza cuando page.tsx llama a notFound(). Como no hay evento que
 * mostrar, es un aviso genérico branded (icono + contacto), no el 404 crudo de
 * Next. Responsive por reutilizar RegistrationClosed.
 */
export default function EventNotFound() {
  return (
    <RegistrationClosed
      event={{}}
      icon={SearchX}
      title="Evento no encontrado"
      message={
        <>
          El enlace no es válido o el evento ya no está disponible.{' '}
          <br className="hidden sm:block" />
          Revisa la dirección e inténtalo de nuevo.
        </>
      }
    />
  );
}
