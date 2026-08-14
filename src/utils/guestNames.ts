/**
 * Valores que los asistentes escriben en el campo de invitado del formulario web
 * y que NO son nombres de personas: respuestas tipo sí/no ("Si", "No llevo
 * acompañante", "Sin acompañante"), marcadores ("N/A", "-", ".") o números.
 * El importador los descarta para no crear invitados basura (caso Mantos 13-08:
 * la columna "Nombre invitado" traía 15 de estos entre 255 nombres reales).
 */
export const isJunkGuestName = (v: string): boolean => {
  const s = String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
  if (!s) return true;
  if (/^(s[ií]|no|x|-+|\.+|n\/?a|na|ninguno|ninguna|no aplica|sin invitado|sin acompañante)$/.test(s)) return true;
  if (/^no\s/.test(s) && /llevo|llevar|tengo|aplica|asist|acompa|invitad|ir[áa]/.test(s)) return true;
  if (/^\d+$/.test(s)) return true;
  return false;
};
