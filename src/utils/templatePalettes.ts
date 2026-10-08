/**
 * Paletas por defecto de cada plantilla de la landing pública y sus nombres legibles.
 *
 * Al elegir una plantilla en el editor/formulario de evento se cargan estos colores (y
 * luego el organizador los ajusta). `titleColor`/`dateSelectedColor` se incluyen en TODAS
 * para que, al cambiar DESDE Gala a otra, se restablezcan (y no quede el título blanco).
 *
 * Fuente única compartida por EventForm (pestaña Diseño) y EventDesignEditor (editor en vivo).
 */
export const TEMPLATE_PALETTES: Record<string, Record<string, string | number>> = {
  default: {
    primaryColor: '#1e293b', secondaryColor: '#334155', buttonColor: '#1e293b',
    titleColor: '#111827', dateSelectedColor: '#1e293b',
    textColor: '#111827', inputColor: '#f8fafc', borderColor: '#e2e8f0',
    formBackgroundColor: '#ffffff', overlayColor: '#0f172a', overlayOpacity: 0.55, titleFont: 'montserrat',
  },
  modern: {
    primaryColor: '#7c93b3', secondaryColor: '#475569', buttonColor: '#334155',
    titleColor: '#0f172a', dateSelectedColor: '#334155',
    textColor: '#0f172a', inputColor: '#f1f5f9', borderColor: '#cbd5e1',
    formBackgroundColor: '#ffffff', overlayColor: '#0f172a', overlayOpacity: 0.6, titleFont: 'poppins',
  },
  minimal: {
    primaryColor: '#111827', secondaryColor: '#6b7280', buttonColor: '#111827',
    titleColor: '#111827', dateSelectedColor: '#111827',
    textColor: '#111827', inputColor: '#ffffff', borderColor: '#e5e7eb',
    formBackgroundColor: '#ffffff', overlayColor: '#ffffff', overlayOpacity: 0.8, titleFont: 'inter',
  },
  gala: {
    primaryColor: '#008a98', secondaryColor: '#00b4c8', buttonColor: '#008a98', dateSelectedColor: '#008a98',
    textColor: '#ffffff', titleColor: '#ffffff', inputColor: '#0b1220', borderColor: '#334155',
    formBackgroundColor: '#0b1220', overlayColor: '#000000', overlayOpacity: 0.55, titleFont: 'playfair',
  },
};

/** Nombre legible de cada plantilla. */
export const TEMPLATE_NAMES: Record<string, string> = {
  default: 'Por Defecto', modern: 'Moderno', minimal: 'Minimalista', gala: 'Gala',
};
