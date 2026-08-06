// Correo de contacto que se muestra en las landings públicas
// (footers, mensajes de error, "ya estás inscrito", etc.).
//
// La variable existía en la plantilla de entorno pero no la leía nadie (F6-10), y el
// valor estaba escrito a fuego aquí. Se conserva como respaldo para no cambiar el
// comportamiento de quien despliegue sin definirla.
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_MODIFY_CONTACT_EMAIL || 'confirmaciones@grupolocastillo.com';
