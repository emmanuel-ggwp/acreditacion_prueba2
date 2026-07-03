// Tipografías (Google Fonts) para el nombre del evento en las landings.
// Se elige por evento en registrationConfig.theme.titleFont; si no, cada plantilla usa su default.

export interface TitleFont {
  key: string;
  label: string;
  family: string;   // nombre en Google Fonts ('' = tipografía del sistema)
  stack: string;    // font-family CSS
  weights?: string; // pesos a cargar (ej. '600;700;800')
}

export const TITLE_FONTS: TitleFont[] = [
  { key: 'playfair', label: 'Playfair Display — elegante (serif)', family: 'Playfair Display', stack: `'Playfair Display', serif`, weights: '600;700;800' },
  { key: 'cormorant', label: 'Cormorant Garamond — clásica (serif)', family: 'Cormorant Garamond', stack: `'Cormorant Garamond', serif`, weights: '600;700' },
  { key: 'lora', label: 'Lora — serif suave', family: 'Lora', stack: `'Lora', serif`, weights: '600;700' },
  { key: 'poppins', label: 'Poppins — moderna (sans)', family: 'Poppins', stack: `'Poppins', sans-serif`, weights: '600;700;800' },
  { key: 'montserrat', label: 'Montserrat — versátil (sans)', family: 'Montserrat', stack: `'Montserrat', sans-serif`, weights: '600;700;800' },
  { key: 'inter', label: 'Inter — limpia (sans)', family: 'Inter', stack: `'Inter', sans-serif`, weights: '600;700;800' },
  { key: 'raleway', label: 'Raleway — elegante (sans)', family: 'Raleway', stack: `'Raleway', sans-serif`, weights: '600;700;800' },
  { key: 'oswald', label: 'Oswald — condensada', family: 'Oswald', stack: `'Oswald', sans-serif`, weights: '500;600;700' },
  { key: 'bebas', label: 'Bebas Neue — impactante', family: 'Bebas Neue', stack: `'Bebas Neue', sans-serif`, weights: '400' },
  { key: 'system', label: 'Predeterminada del sistema', family: '', stack: 'inherit', weights: '' },
];

// Fuente por defecto de cada plantilla (acorde a su temática).
export const TEMPLATE_DEFAULT_FONT: Record<string, string> = {
  gala: 'playfair',      // elegante, inmersivo
  modern: 'poppins',     // moderno, geométrico
  minimal: 'inter',      // limpio, minimalista
  default: 'montserrat', // versátil, estándar
};

/** Devuelve la fuente elegida del evento, o la default de la plantilla. */
export function getTitleFont(registrationConfig: any, template?: string): TitleFont {
  const key = registrationConfig?.theme?.titleFont;
  const found = key ? TITLE_FONTS.find((f) => f.key === key) : null;
  if (found) return found;
  const defKey = TEMPLATE_DEFAULT_FONT[template || 'default'] || 'montserrat';
  return TITLE_FONTS.find((f) => f.key === defKey) || TITLE_FONTS[0];
}

/** URL de Google Fonts para cargar la fuente (null para la del sistema). */
export function googleFontHref(font: TitleFont): string | null {
  if (!font.family) return null;
  const fam = font.family.replace(/ /g, '+');
  const w = font.weights ? `:wght@${font.weights}` : '';
  return `https://fonts.googleapis.com/css2?family=${fam}${w}&display=swap`;
}
