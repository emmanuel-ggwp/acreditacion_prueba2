'use client';

import React, { useState } from 'react';
import { UploadCloud, Loader2, Image as ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { uploadImage } from '@/utils/upload';
import useEventStore from '@/store/eventStore';
import EventSchedule from '@/models/EventSchedule';
import toast from 'react-hot-toast';

const fmt = (d: string) => { try { return new Date(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }); } catch { return ''; } };

const ScheduleImageManager: React.FC<{ eventId: string }> = ({ eventId }) => {
  const { EventSchedules, setScheduleImage } = useEventStore();
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [scope, setScope] = useState<'all' | 'some'>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [applying, setApplying] = useState(false);

  if (!EventSchedules || EventSchedules.length === 0) return null;

  const handleUpload = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      setImg(url);
      toast.success('Imagen lista. Ahora elige a qué fechas aplicarla.');
    } catch (e: any) {
      toast.error(e.message || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const apply = async (clear = false) => {
    if (!clear && !img) { toast.error('Primero sube una imagen.'); return; }
    const targets = scope === 'all' ? (EventSchedules as EventSchedule[]).map((s) => s.id) : selected;
    if (targets.length === 0) { toast.error('Elige al menos una fecha.'); return; }
    setApplying(true);
    try {
      for (const id of targets) {
        await setScheduleImage(id, eventId, clear ? '' : img);
      }
      toast.success(clear ? `Imagen quitada de ${targets.length} fecha(s)` : `Imagen aplicada a ${targets.length} fecha(s)`);
      if (!clear) { setImg(''); setSelected([]); }
    } catch {
      toast.error('No se pudo aplicar la imagen.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-4">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="font-medium text-gray-800 flex items-center gap-2"><ImageIcon size={18} /> Imagen para las fechas</span>
        {open ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          <p className="text-sm text-gray-500">Sube una imagen y aplícala a <b>todas</b> las fechas o solo a las que elijas. (Cada fecha también puede tener su propia imagen al editarla.)</p>

          {/* Subir */}
          <div className="flex items-center gap-3">
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img} alt="Imagen" className="h-16 w-24 object-cover rounded-lg border border-gray-200" />
            ) : (
              <div className="h-16 w-24 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-300"><ImageIcon size={20} /></div>
            )}
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
              {uploading ? 'Subiendo…' : (img ? 'Cambiar imagen' : 'Subir imagen')}
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(e) => handleUpload(e.target.files?.[0])} />
            </label>
          </div>

          {/* Alcance */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={scope === 'all'} onChange={() => setScope('all')} className="text-indigo-600" />
              Todas las fechas ({EventSchedules.length})
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={scope === 'some'} onChange={() => setScope('some')} className="text-indigo-600" />
              Elegir fechas
            </label>
          </div>

          {scope === 'some' && (
            <div className="flex flex-wrap gap-2">
              {(EventSchedules as EventSchedule[]).map((s) => {
                const on = selected.includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggle(s.id)} className={`text-sm px-3 py-1.5 rounded-full border transition ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-300'}`}>
                    {(s as any).label || s.scheduleName} · {fmt(s.startDateTime as any)}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => apply(false)} disabled={applying || !img} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">
              {applying ? 'Aplicando…' : 'Aplicar imagen'}
            </button>
            <button onClick={() => apply(true)} disabled={applying} className="bg-white border border-gray-300 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-50">
              Quitar imagen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleImageManager;
