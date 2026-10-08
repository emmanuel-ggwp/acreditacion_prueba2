'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Loader2, Eye, Monitor, Smartphone } from 'lucide-react';
import useEventStore from '@/store/eventStore';
import { templates, TemplateType } from '@/components/public/templates';
import { TEMPLATE_PALETTES, TEMPLATE_NAMES, THEME_DEFAULTS, themeDefaultFor } from '@/utils/templatePalettes';
import { TITLE_FONTS, googleFontHref } from '@/utils/fonts';
import { uploadImage } from '@/utils/upload';
import DesignControls, { ImageSlot } from './DesignControls';

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
  const defaultFor = (k: string) => themeDefaultFor(template, k);
  // Reset general: devuelve TODOS los colores/tipografía a los valores por defecto de la
  // plantilla actual (no toca las imágenes, que son contenido).
  const resetAll = () => {
    if (!window.confirm('¿Restaurar todo el diseño (colores y tipografía) a los valores por defecto de la plantilla? Las imágenes no se tocan.')) return;
    setTheme({ ...THEME_DEFAULTS, ...(TEMPLATE_PALETTES[template] || {}) });
  };

  // Adaptador de imágenes para DesignControls (slot -> setter/valor/subida).
  const slotSetters: Record<ImageSlot, (u: string) => void> = { logo: setLogoUrl, bg: setBackgroundImageUrl, hero: setHeroUrl, successD: setSuccessUrl, successM: setSuccessUrlMobile };
  const imagesForControls: Record<ImageSlot, string> = { logo: logoUrl, bg: backgroundImageUrl, hero: heroUrl, successD: successUrl, successM: successUrlMobile };
  const doUpload = async (slot: ImageSlot, file?: File) => {
    if (!file) return;
    setUploading((u) => ({ ...u, [slot]: true }));
    try { slotSetters[slot](await uploadImage(file)); toast.success('Imagen subida'); }
    catch (e: any) { toast.error(e.message || 'Error al subir la imagen'); }
    finally { setUploading((u) => ({ ...u, [slot]: false })); }
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
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex-shrink-0">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Guardar
        </button>
      </header>

      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Controles */}
        <aside className="w-full lg:w-[380px] lg:flex-shrink-0 overflow-y-auto bg-white border-b lg:border-b-0 lg:border-r border-gray-200 p-4 sm:p-5 max-h-[45vh] lg:max-h-none">
          <div>
            <h4 className="text-sm font-bold text-gray-900 mb-3">Plantilla</h4>
            <select value={template} onChange={(e) => onPickTemplate(e.target.value)} className="block w-full rounded-lg border-gray-200 bg-gray-50 px-3 py-2 text-sm">
              {Object.keys(TEMPLATE_NAMES).map((k) => <option key={k} value={k}>{TEMPLATE_NAMES[k]}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">Al cambiar de plantilla se cargan sus colores por defecto; ajústalos abajo.</p>
          </div>

          <DesignControls
            isGala={isGala}
            theme={theme}
            setTheme={setT}
            setFormColor={setFormColor}
            defaultFor={defaultFor}
            resetTheme={resetAll}
            images={imagesForControls}
            uploading={uploading}
            onImage={doUpload}
            onClearImage={(slot) => slotSetters[slot]('')}
          />
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
