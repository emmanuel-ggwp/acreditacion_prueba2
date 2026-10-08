'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, UploadCloud, Loader2, X as XIcon, Image as ImageIcon, Eye, Monitor, Smartphone, RotateCcw } from 'lucide-react';
import useEventStore from '@/store/eventStore';
import { templates, TemplateType } from '@/components/public/templates';
import { TEMPLATE_PALETTES, TEMPLATE_NAMES } from '@/utils/templatePalettes';
import { TITLE_FONTS, googleFontHref } from '@/utils/fonts';
import { uploadImage } from '@/utils/upload';

/** Valores por defecto del tema (coinciden con EventForm). */
const THEME_DEFAULTS: Record<string, any> = {
  primaryColor: '#1e293b', secondaryColor: '#334155', buttonColor: '#1e293b', buttonTextColor: '#ffffff',
  titleColor: '#ffffff', titleSize: 'lg', titleShadow: 'none',
  textColor: '#111827', inputColor: '#f8fafc', inputTextColor: '', borderColor: '#e2e8f0', formBackgroundColor: '#ffffff',
  dietModalColor: '#0b1220', dateCardColor: '#000000', dateCardOpacity: 0.5,
  dateSelectedColor: '#1e293b', dateSelectedBgColor: '', dateSelectedTextColor: '#ffffff',
  datesTitleColor: '#ffffff', datesSubtitleColor: '#ffffff',
  galaFormOffset: 0, galaCustomFormColors: false,
  overlayColor: '#0f172a', overlayOpacity: 0.55, titleFont: 'montserrat',
};

// ---- Controles reutilizables ----
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

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="border-t border-gray-100 pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
    <h4 className="text-sm font-bold text-gray-900 mb-3">{title}</h4>
    <div className="space-y-3">{children}</div>
  </div>
);

/**
 * Vista previa dentro de un <iframe> para que las media queries respondan al ANCHO del
 * dispositivo (móvil real), no al del contenedor. Portaliza los hijos (la plantilla) al
 * body del iframe y copia los estilos de la app a su <head> (incluye un MutationObserver
 * para los estilos que Next/Tailwind inyecten después en desarrollo).
 */
const FramePreview: React.FC<{ device: 'desktop' | 'mobile'; children: React.ReactNode }> = ({ device, children }) => {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [body, setBody] = useState<HTMLElement | null>(null);

  // Un iframe sin `src` no dispara `load` de forma fiable, así que inicializamos el
  // documento (about:blank, mismo origen) desde un efecto, esperando a que exista su body.
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    let raf = 0;
    let obs: MutationObserver | null = null;
    const init = () => {
      const doc = frame.contentDocument;
      if (!doc || !doc.body) { raf = requestAnimationFrame(init); return; }
      doc.head.innerHTML = '';
      const meta = doc.createElement('meta');
      meta.setAttribute('name', 'viewport');
      meta.setAttribute('content', 'width=device-width, initial-scale=1');
      doc.head.appendChild(meta);
      const copyNode = (node: Element) => { try { doc.head.appendChild(node.cloneNode(true)); } catch { /* noop */ } };
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(copyNode);
      doc.documentElement.style.background = '#ffffff';
      doc.body.style.margin = '0';
      // Copia los estilos que Next/Tailwind inyecten después (JIT en desarrollo).
      obs = new MutationObserver((muts) => {
        for (const m of muts) m.addedNodes.forEach((n: any) => {
          if (n.nodeType === 1 && (n.tagName === 'STYLE' || (n.tagName === 'LINK' && n.getAttribute('rel') === 'stylesheet'))) copyNode(n);
        });
      });
      obs.observe(document.head, { childList: true });
      setBody(doc.body);
    };
    init();
    return () => { cancelAnimationFrame(raf); try { obs?.disconnect(); } catch { /* noop */ } };
  }, []);

  const mobile = device === 'mobile';
  return (
    <div className={`flex justify-center h-full ${mobile ? 'py-6 px-3 items-start' : ''}`}>
      <iframe
        ref={frameRef}
        title="Vista previa de la landing"
        className={mobile ? 'flex-shrink-0' : 'w-full'}
        style={{
          width: mobile ? 390 : '100%',
          height: mobile ? 780 : '100%',
          border: mobile ? '1px solid #cbd5e1' : 'none',
          borderRadius: mobile ? 28 : 0,
          boxShadow: mobile ? '0 12px 48px rgba(0,0,0,0.3)' : 'none',
          background: '#fff',
          maxWidth: '100%',
        }}
      />
      {body && createPortal(children, body)}
    </div>
  );
};

export default function EventDesignEditor({ eventId }: { eventId: string }) {
  const router = useRouter();
  const { currentEvent, fetchEventById, EventSchedules, fetchSchedulesForEvent, updateEvent } = useEventStore();

  const [template, setTemplate] = useState<string>('default');
  const [theme, setTheme] = useState<Record<string, any>>({ ...THEME_DEFAULTS });
  const [logoUrl, setLogoUrl] = useState('');
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [heroUrl, setHeroUrl] = useState('');
  const [successUrl, setSuccessUrl] = useState('');
  const [successUrlMobile, setSuccessUrlMobile] = useState('');
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  useEffect(() => { if (eventId) { fetchEventById(eventId); fetchSchedulesForEvent(eventId); } }, [eventId, fetchEventById, fetchSchedulesForEvent]);

  // Cargar el estado desde el evento una sola vez.
  useEffect(() => {
    const e: any = currentEvent;
    if (e && e.id === eventId && !loaded) {
      setTemplate(e.publicTemplate || 'default');
      setTheme({ ...THEME_DEFAULTS, ...(e.registrationConfig?.theme || {}) });
      setLogoUrl(e.logoUrl || '');
      setBackgroundImageUrl(e.backgroundImageUrl || '');
      setHeroUrl(e.registrationConfig?.images?.heroUrl || '');
      setSuccessUrl(e.registrationConfig?.images?.successUrl || '');
      setSuccessUrlMobile(e.registrationConfig?.images?.successUrlMobile || '');
      setLoaded(true);
    }
  }, [currentEvent, eventId, loaded]);

  const setT = (k: string, v: any) => setTheme((p) => ({ ...p, [k]: v }));
  const onPickTemplate = (t: string) => { setTemplate(t); const pal = TEMPLATE_PALETTES[t]; if (pal) setTheme((p) => ({ ...p, ...pal })); };
  const isGala = template === 'gala';
  // En Gala, los colores del FORMULARIO (fondo de inputs, bordes, fondo del formulario y
  // letras de inputs) solo se aplican si está activada "Personalizar colores del formulario".
  // Al editar uno de esos colores se activa SOLO, para que el cambio se vea de inmediato.
  const setFormColor = (k: string, v: any) => setTheme((p) => {
    const next: Record<string, any> = { ...p, [k]: v };
    if (isGala && !p.galaCustomFormColors) next.galaCustomFormColors = true;
    return next;
  });
  // Valor por defecto de un campo del tema para la plantilla actual (paleta de la
  // plantilla si lo define; si no, el default general). Alimenta el "↺ Por defecto".
  const defaultFor = (k: string): string => {
    const pal = TEMPLATE_PALETTES[template] || {};
    const v = (k in pal) ? pal[k] : THEME_DEFAULTS[k];
    return v == null ? '' : String(v);
  };
  // Reset general: devuelve TODOS los colores/tipografía a los valores por defecto de la
  // plantilla actual (no toca las imágenes, que son contenido).
  const resetAll = () => {
    if (!window.confirm('¿Restaurar todo el diseño (colores y tipografía) a los valores por defecto de la plantilla? Las imágenes no se tocan.')) return;
    setTheme({ ...THEME_DEFAULTS, ...(TEMPLATE_PALETTES[template] || {}) });
  };

  const doUpload = async (key: string, setter: (u: string) => void, file?: File) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [key]: true }));
    try { setter(await uploadImage(file)); toast.success('Imagen subida'); }
    catch (e: any) { toast.error(e.message || 'Error al subir la imagen'); }
    finally { setUploading((u) => ({ ...u, [key]: false })); }
  };

  // Fechas para la vista previa: las reales visibles, o 2 de ejemplo si no hay.
  const previewSchedules = useMemo(() => {
    const real = (EventSchedules || []).filter((s: any) => s.visibleInLanding !== false);
    if (real.length) return real.map((s: any) => ({ ...s, full: false }));
    const base = new Date(); base.setDate(base.getDate() + 10); base.setHours(19, 0, 0, 0);
    return [0, 1].map((i) => {
      const st = new Date(base); st.setDate(base.getDate() + i * 7);
      const en = new Date(st); en.setHours(23, 0, 0, 0);
      return { id: `preview-${i}`, scheduleName: `Función ${i + 1}`, startDateTime: st.toISOString(), endDateTime: en.toISOString(), location: 'Salón', blockType: 'SINGLE', registrationOpen: true, visibleInLanding: true, full: false };
    });
  }, [EventSchedules]);

  const previewEvent = useMemo(() => {
    const e: any = currentEvent || {};
    return {
      ...e, publicTemplate: template, logoUrl, backgroundImageUrl, allowGuests: e.allowGuests !== false,
      registrationConfig: { ...(e.registrationConfig || {}), theme, images: { ...(e.registrationConfig?.images || {}), heroUrl, successUrl, successUrlMobile } },
      schedules: previewSchedules,
    };
  }, [currentEvent, template, theme, logoUrl, backgroundImageUrl, heroUrl, successUrl, successUrlMobile, previewSchedules]);

  const TemplateComponent = templates[(template as TemplateType)] || templates.default;
  const slug = (currentEvent as any)?.publicSlug || 'preview';

  const save = async () => {
    setSaving(true);
    try {
      const prevCfg: any = (currentEvent as any)?.registrationConfig || {};
      // Se descarta `fields` (array legacy que ya no se usa — la config real está en
      // `formFields`): algunos eventos antiguos/importados lo tienen malformado y haría
      // fallar la validación del update. EventForm tampoco lo conserva.
      const { fields: _legacyFields, ...restCfg } = prevCfg;
      await updateEvent(eventId, {
        publicTemplate: template,
        logoUrl: logoUrl || null,
        backgroundImageUrl: backgroundImageUrl || null,
        registrationConfig: { ...restCfg, theme, images: { ...(restCfg.images || {}), heroUrl: heroUrl || null, successUrl: successUrl || null, successUrlMobile: successUrlMobile || null } },
      } as any);
      toast.success('Diseño guardado');
    } catch { toast.error('No se pudo guardar el diseño'); }
    finally { setSaving(false); }
  };

  const titleFontObj = TITLE_FONTS.find((f) => f.key === theme.titleFont) || TITLE_FONTS[0];
  const fontHref = titleFontObj ? googleFontHref(titleFontObj) : null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gray-100">
      {fontHref && <link rel="stylesheet" href={fontHref} />}
      {/* Barra superior */}
      <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push(`/events/${eventId}`)} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"><ArrowLeft size={18} /> Volver</button>
          <span className="text-gray-300">|</span>
          <h1 className="text-sm sm:text-base font-semibold text-gray-900 truncate">Editor de diseño {(currentEvent as any)?.name ? `· ${(currentEvent as any).name}` : ''}</h1>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={resetAll} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50" title="Restaurar todos los colores y tipografía a los valores por defecto de la plantilla">
            <RotateCcw size={15} /> <span className="hidden sm:inline">Restaurar por defecto</span>
          </button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Controles */}
        <aside className="w-full lg:w-[380px] lg:flex-shrink-0 overflow-y-auto bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 sm:p-5 max-h-[45vh] lg:max-h-none">
          <Section title="Plantilla">
            <select value={template} onChange={(e) => onPickTemplate(e.target.value)} className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {Object.keys(TEMPLATE_NAMES).map((k) => <option key={k} value={k}>{TEMPLATE_NAMES[k]}</option>)}
            </select>
            <p className="text-xs text-gray-400">Al cambiar de plantilla se cargan sus colores por defecto; ajústalos abajo.</p>
          </Section>

          <Section title="Imágenes">
            <ImageField label="Logo" value={logoUrl} uploading={!!uploading.logo} onSelect={(f) => doUpload('logo', setLogoUrl, f)} onClear={() => setLogoUrl('')} />
            <ImageField label="Imagen de fondo" value={backgroundImageUrl} uploading={!!uploading.bg} onSelect={(f) => doUpload('bg', setBackgroundImageUrl, f)} onClear={() => setBackgroundImageUrl('')} />
            {isGala && <>
              <ImageField label="Imagen destacada (Gala)" value={heroUrl} uploading={!!uploading.hero} onSelect={(f) => doUpload('hero', setHeroUrl, f)} onClear={() => setHeroUrl('')} />
              <ImageField label="Éxito — escritorio (Gala)" value={successUrl} uploading={!!uploading.sd} onSelect={(f) => doUpload('sd', setSuccessUrl, f)} onClear={() => setSuccessUrl('')} />
              <ImageField label="Éxito — celular (Gala)" value={successUrlMobile} uploading={!!uploading.sm} onSelect={(f) => doUpload('sm', setSuccessUrlMobile, f)} onClear={() => setSuccessUrlMobile('')} />
            </>}
          </Section>

          <Section title="Colores">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-3">
              <ColorField label="Principal" value={theme.primaryColor} onChange={(v) => setT('primaryColor', v)} defaultValue={defaultFor('primaryColor')} hint="Acentos del tema: barra/encabezado superior, íconos y detalles." />
              <ColorField label="Secundario" value={theme.secondaryColor} onChange={(v) => setT('secondaryColor', v)} defaultValue={defaultFor('secondaryColor')} hint="Acento complementario (degradados y detalles menores)." />
              <ColorField label="Botones" value={theme.buttonColor} onChange={(v) => setT('buttonColor', v)} defaultValue={defaultFor('buttonColor')} hint="Fondo de los botones (Entrar, Continuar, Registrarse)." />
              <ColorField label="Texto de botones" value={theme.buttonTextColor} onChange={(v) => setT('buttonTextColor', v)} defaultValue={defaultFor('buttonTextColor')} hint="Color de la letra DENTRO de los botones." />
              <ColorField label="Texto" value={theme.textColor} onChange={(v) => setT('textColor', v)} defaultValue={defaultFor('textColor')} hint={isGala ? 'Color del texto/etiquetas del formulario. En Gala las letras de los campos se ajustan con “Letras de inputs”.' : 'Color del texto y las etiquetas del formulario.'} />
              <ColorField label="Inputs (fondo)" value={theme.inputColor} onChange={(v) => setFormColor('inputColor', v)} defaultValue={defaultFor('inputColor')} hint={isGala ? 'Fondo de los campos. En Gala activa “Personalizar colores del formulario” (se activa solo al cambiarlo).' : 'Fondo de los campos donde el asistente escribe.'} />
              <ColorField label="Letras de inputs" value={theme.inputTextColor} onChange={(v) => setFormColor('inputTextColor', v)} hint="Color de lo que se escribe en los campos. Vacío = automático según el fondo." allowEmpty />
              <ColorField label="Bordes" value={theme.borderColor} onChange={(v) => setFormColor('borderColor', v)} defaultValue={defaultFor('borderColor')} hint={isGala ? 'Borde de los campos. En Gala requiere “Personalizar colores del formulario” (se activa solo).' : 'Color del borde de los campos.'} />
              <ColorField label="Fondo formulario" value={theme.formBackgroundColor} onChange={(v) => setFormColor('formBackgroundColor', v)} defaultValue={defaultFor('formBackgroundColor')} hint={isGala ? 'Fondo de la tarjeta del formulario. En Gala requiere “Personalizar colores del formulario” (se activa solo).' : 'Fondo de la tarjeta que contiene el formulario.'} />
            </div>
            {isGala && (
              <label className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer rounded-lg border border-amber-200 bg-amber-50 p-2.5">
                <input type="checkbox" checked={!!theme.galaCustomFormColors} onChange={(e) => setT('galaCustomFormColors', e.target.checked)} className="h-4 w-4 mt-0.5 rounded border-gray-300 text-indigo-600" />
                <span className="text-xs"><b>Personalizar colores del formulario</b> (Gala). Si está apagado, Gala usa su estilo oscuro fijo.</span>
              </label>
            )}
          </Section>

          <Section title="Tipografía y fondo">
            <label className="block text-sm font-medium text-gray-700">Fuente del título</label>
            <select value={theme.titleFont} onChange={(e) => setT('titleFont', e.target.value)} className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {TITLE_FONTS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
            <ColorField label="Capa (velo) sobre el fondo" value={theme.overlayColor} onChange={(v) => setT('overlayColor', v)} defaultValue={defaultFor('overlayColor')} hint="Color de la capa que se pone sobre la imagen de fondo (oscurece/aclara para que se lea el texto)." />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opacidad de la capa: {Math.round((Number(theme.overlayOpacity) || 0) * 100)}%</label>
              <input type="range" min="0" max="1" step="0.05" value={Number(theme.overlayOpacity) || 0} onChange={(e) => setT('overlayOpacity', parseFloat(e.target.value))} className="w-full" />
            </div>
          </Section>

          {isGala && (
            <Section title="Fecha y título (Gala)">
              <ColorField label="Título del evento" value={theme.titleColor} onChange={(v) => setT('titleColor', v)} defaultValue={defaultFor('titleColor')} hint="Color del nombre del evento (el título grande del inicio)." />
              <label className="block text-sm font-medium text-gray-700">Tamaño del título</label>
              <select value={theme.titleSize} onChange={(e) => setT('titleSize', e.target.value)} className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <option value="sm">Pequeño</option><option value="md">Mediano</option><option value="lg">Grande</option><option value="xl">Muy grande</option><option value="xxl">Enorme</option>
              </select>
              <label className="block text-sm font-medium text-gray-700">Sombra del título</label>
              <select value={theme.titleShadow} onChange={(e) => setT('titleShadow', e.target.value)} className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                <option value="none">Sin sombra</option><option value="soft">Suave</option><option value="strong">Fuerte</option>
              </select>
              <ColorField label="Título de la lista de fechas" value={theme.datesTitleColor} onChange={(v) => setT('datesTitleColor', v)} defaultValue={defaultFor('datesTitleColor')} hint="Color del texto “Elige una fecha de asistencia”." />
              <ColorField label="Subtítulo de fechas" value={theme.datesSubtitleColor} onChange={(v) => setT('datesSubtitleColor', v)} defaultValue={defaultFor('datesSubtitleColor')} hint="Color del texto “Selecciona la fecha y lugar…” bajo el título de fechas." />
              <ColorField label="Borde fecha seleccionada" value={theme.dateSelectedColor} onChange={(v) => setT('dateSelectedColor', v)} defaultValue={defaultFor('dateSelectedColor')} hint="Color del BORDE que resalta la tarjeta de fecha al elegirla." />
              <ColorField label="Fondo fecha seleccionada" value={theme.dateSelectedBgColor} onChange={(v) => setT('dateSelectedBgColor', v)} hint="Color de FONDO de la tarjeta de fecha al elegirla. Vacío = no cambia el fondo." allowEmpty />
              <ColorField label="Texto fecha seleccionada" value={theme.dateSelectedTextColor} onChange={(v) => setT('dateSelectedTextColor', v)} defaultValue={defaultFor('dateSelectedTextColor')} hint="Color de las LETRAS de la tarjeta de fecha elegida (útil si el fondo es claro)." />
              <ColorField label="Fondo tarjetas de fecha (sin foto)" value={theme.dateCardColor} onChange={(v) => setT('dateCardColor', v)} defaultValue={defaultFor('dateCardColor')} hint="Fondo de las tarjetas de fecha que NO tienen foto (con su transparencia abajo)." />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transparencia de las tarjetas: {Math.round((Number(theme.dateCardOpacity) || 0) * 100)}%</label>
                <input type="range" min="0" max="1" step="0.05" value={Number(theme.dateCardOpacity) || 0} onChange={(e) => setT('dateCardOpacity', parseFloat(e.target.value))} className="w-full" />
              </div>
              <ColorField label="Modal de restricción" value={theme.dietModalColor} onChange={(v) => setT('dietModalColor', v)} defaultValue={defaultFor('dietModalColor')} hint="Fondo de la ventana para elegir la restricción/preferencia alimentaria." />
            </Section>
          )}
          <div className="h-6" />
        </aside>

        {/* Vista previa en vivo */}
        <main className="flex-1 min-h-0 min-w-0 flex flex-col bg-gray-200">
          <div className="flex items-center justify-between gap-2 bg-gray-800/90 text-white text-xs px-3 py-1.5 flex-shrink-0">
            <span className="flex items-center gap-2 min-w-0"><Eye size={13} className="flex-shrink-0" /> <span className="truncate">Vista previa en vivo — no se envía ninguna inscripción.</span></span>
            <div className="inline-flex rounded-md bg-white/10 p-0.5 flex-shrink-0">
              <button type="button" onClick={() => setDevice('desktop')} title="Escritorio" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${device === 'desktop' ? 'bg-white text-gray-900' : 'text-white/80 hover:text-white'}`}><Monitor size={13} /> Escritorio</button>
              <button type="button" onClick={() => setDevice('mobile')} title="Celular" className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${device === 'mobile' ? 'bg-white text-gray-900' : 'text-white/80 hover:text-white'}`}><Smartphone size={13} /> Celular</button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {!loaded ? (
              <div className="flex items-center justify-center h-64 text-gray-500">Cargando…</div>
            ) : device === 'mobile' ? (
              // Móvil: iframe con viewport propio para que las media queries sean reales.
              <FramePreview device="mobile">
                <TemplateComponent event={previewEvent} slug={slug} preview />
              </FramePreview>
            ) : (
              // Escritorio: render inline (usa el viewport de la ventana = layout de
              // escritorio) y actualiza de forma 100% fiable al editar.
              <TemplateComponent event={previewEvent} slug={slug} preview />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
