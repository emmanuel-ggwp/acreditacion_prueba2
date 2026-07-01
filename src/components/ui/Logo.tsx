import React from 'react';

/**
 * Marca de AcreditaPro: escudo con check (acreditación verificada) sobre
 * un degradado índigo→púrpura. Autocontenida (incluye el "tile" redondeado).
 */
export const LogoMark: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="AcreditaPro">
    <defs>
      <linearGradient id="acreditaProGrad" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1E3A8A" />
        <stop offset="1" stopColor="#4338CA" />
      </linearGradient>
    </defs>
    <rect width="48" height="48" rx="12" fill="url(#acreditaProGrad)" />
    {/* Escudo */}
    <path
      d="M24 10.5 L35 15 V24.5 C35 31 30 35.5 24 38 C18 35.5 13 31 13 24.5 V15 Z"
      fill="white"
      fillOpacity="0.18"
      stroke="white"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    {/* Check */}
    <path
      d="M19.3 24 l3.4 3.4 L29 19.8"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Colores de la marca de la empresa (guiño visual). */
export const BRAND_COLORS = ['#F4511E', '#1A73E8', '#FBB400', '#1DBF9C'];

/** Cuatro puntos rellenos con los colores de la empresa. */
export const BrandDots: React.FC<{ size?: number; gap?: number; className?: string }> = ({ size = 6, gap = 5, className = '' }) => (
  <div className={`flex items-center ${className}`} style={{ gap }} aria-hidden="true">
    {BRAND_COLORS.map((c) => (
      <span key={c} className="inline-block rounded-full" style={{ backgroundColor: c, width: size, height: size }} />
    ))}
  </div>
);

/** Logo completo: marca + texto "AcreditaPro". */
export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className = '' }) => (
  <div className={`flex items-center gap-2 ${className}`}>
    <LogoMark size={size} className="rounded-lg" />
    <span className="text-lg font-bold bg-gradient-to-r from-blue-900 to-indigo-700 bg-clip-text text-transparent">
      AcreditaPro
    </span>
  </div>
);

export default Logo;
