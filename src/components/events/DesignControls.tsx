'use client';

import React from 'react';
import { UploadCloud, Loader2, X as XIcon, Image as ImageIcon, RotateCcw } from 'lucide-react';
import { TITLE_FONTS } from '@/utils/fonts';

/**
 * Controles de DISEÑO de la landing pública, compartidos por el modal del evento
 * (pestaña "Diseño", con react-hook-form) y el editor en vivo (`EventDesignEditor`, con
 * estado local). Es presentacional: recibe el `theme` + callbacks a través de un adaptador,
 * así hay UNA sola fuente de los controles (colores, imágenes, tipografía, Gala).
 *
 * No incluye el selector de plantilla (cada contenedor lo ubica donde corresponde).
 */
export type ImageSlot = 'logo' | 'bg' | 'hero' | 'successD' | 'successM';

export interface DesignControlsProps {
  isGala: boolean;
  theme: Record<string, any>;
  /** Fija un color/valor del tema. */
  setTheme: (key: string, value: any) => void;
  /** Como setTheme, pero para colores del FORMULARIO (en Gala activa la personalización). */
  setFormColor: (key: string, value: any) => void;
  /** Valor por defecto de un campo del tema para la plantilla actual (para "↺ Por defecto"). */
  defaultFor: (key: string) => string;
  /** Restaura todo el tema a los valores por defecto de la plantilla (el contenedor confirma). */
  resetTheme: () => void;
  images: Record<ImageSlot, string>;
  uploading: Record<string, boolean>;
  onImage: (slot: ImageSlot, file?: File) => void;
  onClearImage: (slot: ImageSlot) => void;
}

// ---- Controles base ----
const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void; hint?: string; allowEmpty?: boolean; defaultValue?: string }>
  = ({ label, value, onChange, hint, allowEmpty, defaultValue }) => {
  const norm = (s?: string) => (s || '').trim().toLowerCase();
  const canReset = !allowEmpty && defaultValue !== undefined && norm(value) !== norm(defaultValue);
  return (
  <div className="flex items-start gap-2.5 text-sm text-gray-600">
    <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} className="h-9 w-10 rounded border border-gray-200 cursor-pointer bg-white p-0.5 flex-shrink-0" />
    <div className="min-w-0 flex-1">
      <span className="block font-medium text-gray-700">{label}</span>
      {hint && <span className="block text-xs text-gray-400 leading-snug mb-1">{hint}</span>}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={allowEmpty ? 'Automático' : '#RRGGBB'} maxLength={7} className="w-24 rounded border border-gray-200 px-2 py-1 text-xs font-mono uppercase outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30" />
        {allowEmpty && <button type="button" onClick={() => onChange('')} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">Automático</button>}
        {canReset && <button type="button" onClick={() => onChange(defaultValue!)} title="Volver al color por defecto de la plantilla" className="text-xs font-medium text-gray-500 hover:text-gray-800">↺ Por defecto</button>}
      </div>
    </div>
  </div>
  );
};

const ImageField: React.FC<{ label: string; value?: string; uploading?: boolean; onSelect: (f?: File) => void; onClear: () => void }>
  = ({ label, value, uploading, onSelect, onClear }) => (
  <div>
    <p className="block text-sm font-semibold text-gray-700 mb-1">{label}</p>
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="h-14 w-14 object-contain rounded-lg border border-gray-200 bg-gray-50" />
          <button type="button" onClick={onClear} className="absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow ring-1 ring-gray-200 text-gray-400 hover:text-red-500"><XIcon size={13} /></button>
        </div>
      ) : (
        <div className="h-14 w-14 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300"><ImageIcon size={20} /></div>
      )}
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
        {uploading ? 'Subiendo…' : 'Subir'}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(e) => onSelect(e.target.files?.[0])} />
      </label>
    </div>
  </div>
);

const Section: React.FC<{ title: string; action?: React.ReactNode; children: React.ReactNode }> = ({ title, action, children }) => (
  <div className="border-t border-gray-100 pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
    <div className="flex items-center justify-between gap-2 mb-3">
      <h4 className="text-sm font-bold text-gray-900">{title}</h4>
      {action}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

export default function DesignControls({ isGala, theme, setTheme, setFormColor, defaultFor, resetTheme, images, uploading, onImage, onClearImage }: DesignControlsProps) {
  return (
    <div>
      <Section title="Imágenes">
        <ImageField label="Logo" value={images.logo} uploading={!!uploading.logo} onSelect={(f) => onImage('logo', f)} onClear={() => onClearImage('logo')} />
        <ImageField label="Imagen de fondo" value={images.bg} uploading={!!uploading.bg} onSelect={(f) => onImage('bg', f)} onClear={() => onClearImage('bg')} />
        {isGala && <>
          <ImageField label="Imagen destacada (Gala)" value={images.hero} uploading={!!uploading.hero} onSelect={(f) => onImage('hero', f)} onClear={() => onClearImage('hero')} />
          <ImageField label="Éxito — escritorio (Gala)" value={images.successD} uploading={!!uploading.successD} onSelect={(f) => onImage('successD', f)} onClear={() => onClearImage('successD')} />
          <ImageField label="Éxito — celular (Gala)" value={images.successM} uploading={!!uploading.successM} onSelect={(f) => onImage('successM', f)} onClear={() => onClearImage('successM')} />
        </>}
      </Section>

      <Section
        title="Colores"
        action={<button type="button" onClick={resetTheme} className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800" title="Restaurar todos los colores y la tipografía a los valores por defecto de la plantilla"><RotateCcw size={13} /> Restaurar por defecto</button>}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-3">
          <ColorField label="Principal" value={theme.primaryColor} onChange={(v) => setTheme('primaryColor', v)} defaultValue={defaultFor('primaryColor')} hint="Acentos del tema: barra/encabezado superior, íconos y detalles." />
          <ColorField label="Secundario" value={theme.secondaryColor} onChange={(v) => setTheme('secondaryColor', v)} defaultValue={defaultFor('secondaryColor')} hint="Acento complementario (degradados y detalles menores)." />
          <ColorField label="Botones" value={theme.buttonColor} onChange={(v) => setTheme('buttonColor', v)} defaultValue={defaultFor('buttonColor')} hint="Fondo de los botones (Entrar, Continuar, Registrarse)." />
          <ColorField label="Texto de botones" value={theme.buttonTextColor} onChange={(v) => setTheme('buttonTextColor', v)} defaultValue={defaultFor('buttonTextColor')} hint="Color de la letra DENTRO de los botones." />
          <ColorField label="Texto" value={theme.textColor} onChange={(v) => setTheme('textColor', v)} defaultValue={defaultFor('textColor')} hint={isGala ? 'Color del texto/etiquetas del formulario. En Gala las letras de los campos se ajustan con “Letras de inputs”.' : 'Color del texto y las etiquetas del formulario.'} />
          <ColorField label="Inputs (fondo)" value={theme.inputColor} onChange={(v) => setFormColor('inputColor', v)} defaultValue={defaultFor('inputColor')} hint={isGala ? 'Fondo de los campos. En Gala activa “Personalizar colores del formulario” (se activa solo al cambiarlo).' : 'Fondo de los campos donde el asistente escribe.'} />
          <ColorField label="Letras de inputs" value={theme.inputTextColor} onChange={(v) => setFormColor('inputTextColor', v)} hint="Color de lo que se escribe en los campos. Vacío = automático según el fondo." allowEmpty />
          <ColorField label="Bordes" value={theme.borderColor} onChange={(v) => setFormColor('borderColor', v)} defaultValue={defaultFor('borderColor')} hint={isGala ? 'Borde de los campos. En Gala requiere “Personalizar colores del formulario” (se activa solo).' : 'Color del borde de los campos.'} />
          <ColorField label="Fondo formulario" value={theme.formBackgroundColor} onChange={(v) => setFormColor('formBackgroundColor', v)} defaultValue={defaultFor('formBackgroundColor')} hint={isGala ? 'Fondo de la tarjeta del formulario. En Gala requiere “Personalizar colores del formulario” (se activa solo).' : 'Fondo de la tarjeta que contiene el formulario.'} />
        </div>
        {isGala && (
          <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer rounded-lg border border-amber-200 bg-amber-50 p-2.5">
            <input type="checkbox" checked={!!theme.galaCustomFormColors} onChange={(e) => setTheme('galaCustomFormColors', e.target.checked)} className="h-4 w-4 mt-0.5 rounded border-gray-300 text-indigo-600" />
            <span className="text-xs"><b>Personalizar colores del formulario</b> (Gala). Si está apagado, Gala usa su estilo oscuro fijo.</span>
          </label>
        )}
      </Section>

      <Section title="Tipografía y fondo">
        <label className="block text-sm font-medium text-gray-700">Fuente del título</label>
        <select value={theme.titleFont || ''} onChange={(e) => setTheme('titleFont', e.target.value)} className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          {TITLE_FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
        </select>
        <ColorField label="Capa (velo) sobre el fondo" value={theme.overlayColor} onChange={(v) => setTheme('overlayColor', v)} defaultValue={defaultFor('overlayColor')} hint="Color de la capa que se pone sobre la imagen de fondo (oscurece/aclara para que se lea el texto)." />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Opacidad de la capa: {Math.round((Number(theme.overlayOpacity) || 0) * 100)}%</label>
          <input type="range" min="0" max="1" step="0.05" value={Number(theme.overlayOpacity) || 0} onChange={(e) => setTheme('overlayOpacity', parseFloat(e.target.value))} className="w-full" />
        </div>
      </Section>

      {isGala && (
        <Section title="Fecha y título (Gala)">
          <ColorField label="Título del evento" value={theme.titleColor} onChange={(v) => setTheme('titleColor', v)} defaultValue={defaultFor('titleColor')} hint="Color del nombre del evento (el título grande del inicio)." />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño del título en móvil</label>
            <p className="text-xs text-gray-400 leading-snug mb-1">Tamaño del título en teléfonos.</p>
            <select value={theme.titleSize || 'lg'} onChange={(e) => setTheme('titleSize', e.target.value)} className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <option value="xs">Muy pequeño</option><option value="sm">Pequeño</option><option value="md">Mediano</option><option value="lg">Grande</option><option value="xl">Muy grande</option><option value="xxl">Enorme</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tamaño del título en PC</label>
            <p className="text-xs text-gray-400 leading-snug mb-1">Tamaño en computador, independiente del móvil. «Automático» = igual que en móvil.</p>
            <select value={theme.titleSizePc || 'auto'} onChange={(e) => setTheme('titleSizePc', e.target.value)} className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              <option value="auto">Automático (igual que móvil)</option><option value="xs">Muy pequeño</option><option value="sm">Pequeño</option><option value="md">Mediano</option><option value="lg">Grande</option><option value="xl">Muy grande</option><option value="xxl">Enorme</option>
            </select>
          </div>
          <label className="block text-sm font-medium text-gray-700">Sombra del título</label>
          <select value={theme.titleShadow || 'none'} onChange={(e) => setTheme('titleShadow', e.target.value)} className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm">
            <option value="none">Sin sombra</option><option value="soft">Suave</option><option value="strong">Fuerte</option>
          </select>
          <ColorField label="Título de la lista de fechas" value={theme.datesTitleColor} onChange={(v) => setTheme('datesTitleColor', v)} defaultValue={defaultFor('datesTitleColor')} hint="Color del texto “Elige una fecha de asistencia”." />
          <ColorField label="Subtítulo de fechas" value={theme.datesSubtitleColor} onChange={(v) => setTheme('datesSubtitleColor', v)} defaultValue={defaultFor('datesSubtitleColor')} hint="Color del texto “Selecciona la fecha y lugar…” bajo el título de fechas." />
          <ColorField label="Borde fecha seleccionada" value={theme.dateSelectedColor} onChange={(v) => setTheme('dateSelectedColor', v)} defaultValue={defaultFor('dateSelectedColor')} hint="Color del BORDE que resalta la tarjeta de fecha al elegirla." />
          <ColorField label="Fondo fecha seleccionada" value={theme.dateSelectedBgColor} onChange={(v) => setTheme('dateSelectedBgColor', v)} hint="Color de FONDO de la tarjeta de fecha al elegirla. Vacío = no cambia el fondo." allowEmpty />
          <ColorField label="Texto fecha seleccionada" value={theme.dateSelectedTextColor} onChange={(v) => setTheme('dateSelectedTextColor', v)} defaultValue={defaultFor('dateSelectedTextColor')} hint="Color de las LETRAS de la tarjeta de fecha elegida (útil si el fondo es claro)." />
          <ColorField label="Fondo tarjetas de fecha (sin foto)" value={theme.dateCardColor} onChange={(v) => setTheme('dateCardColor', v)} defaultValue={defaultFor('dateCardColor')} hint="Fondo de las tarjetas de fecha que NO tienen foto (con su transparencia abajo)." />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Transparencia de las tarjetas: {Math.round((Number(theme.dateCardOpacity) || 0) * 100)}%</label>
            <input type="range" min="0" max="1" step="0.05" value={Number(theme.dateCardOpacity) || 0} onChange={(e) => setTheme('dateCardOpacity', parseFloat(e.target.value))} className="w-full" />
          </div>
          <ColorField label="Modal de restricción" value={theme.dietModalColor} onChange={(v) => setTheme('dietModalColor', v)} defaultValue={defaultFor('dietModalColor')} hint="Fondo de la ventana para elegir la restricción/preferencia alimentaria." />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Posición del formulario (solo escritorio)</label>
            <p className="text-xs text-gray-400 leading-snug mb-1">Sube o baja todo el bloque del formulario en computadora. {(() => { const n = Number(theme.galaFormOffset) || 0; return n === 0 ? 'Posición normal.' : (n < 0 ? `${Math.abs(n)}px más arriba.` : `${n}px más abajo.`); })()}</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 whitespace-nowrap">Arriba</span>
              <input type="range" min="-200" max="300" step="10" value={Number(theme.galaFormOffset) || 0} onChange={(e) => setTheme('galaFormOffset', parseInt(e.target.value, 10))} className="w-full" />
              <span className="text-[11px] text-gray-400 whitespace-nowrap">Abajo</span>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
