'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { showToast } from '@/components/ui/Toast';
import { Plus, Trash2, Edit, X, Mail } from 'lucide-react';

interface Tpl {
  id: string;
  name: string;
  templateId: string;
  description?: string | null;
  isActive: boolean;
}

export default function EmailTemplateManager() {
  const [items, setItems] = useState<Tpl[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', templateId: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<Tpl[]>('/api/email-templates');
      setItems(data);
    } catch (e: any) {
      showToast.error(e.message || 'Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm({ name: '', templateId: '', description: '' }); setEditingId(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.templateId.trim()) {
      showToast.error('Nombre y Template ID son obligatorios.');
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await apiClient.put(`/api/email-templates/${editingId}`, form);
        showToast.success('Plantilla actualizada');
      } else {
        await apiClient.post('/api/email-templates', form);
        showToast.success('Plantilla creada');
      }
      resetForm();
      load();
    } catch (e: any) {
      showToast.error(e.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (t: Tpl) => { setEditingId(t.id); setForm({ name: t.name, templateId: t.templateId, description: t.description || '' }); };

  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar esta plantilla de correo?')) return;
    try {
      await apiClient.delete(`/api/email-templates/${id}`);
      showToast.success('Plantilla eliminada');
      load();
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo eliminar');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-5 w-5 text-indigo-600" />
        <h2 className="text-lg font-bold text-gray-900">Plantillas de correo (EmailJS)</h2>
      </div>
      <p className="text-sm text-gray-500 mb-6">Registra tus plantillas de EmailJS (nombre + Template ID). Luego podrás elegir una en cada evento.</p>

      <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 bg-gray-50 p-4 rounded-lg border">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Confirmación Gala" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Template ID (EmailJS)</label>
          <input value={form.templateId} onChange={(e) => setForm((f) => ({ ...f, templateId: e.target.value }))} placeholder="template_xxxxxxx" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción (opcional)</label>
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-3 flex justify-end gap-2">
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100 flex items-center gap-1">
              <X size={16} /> Cancelar
            </button>
          )}
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1">
            <Plus size={16} /> {editingId ? 'Guardar cambios' : 'Agregar plantilla'}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-gray-500 text-sm">Cargando…</p>
      ) : items.length === 0 ? (
        <p className="text-gray-500 text-sm">Aún no hay plantillas. Agrega una arriba.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Template ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-2 text-sm text-gray-600 font-mono">{t.templateId}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{t.description || '-'}</td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => startEdit(t)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded"><Edit size={16} /></button>
                      <button onClick={() => remove(t.id)} className="text-red-600 hover:bg-red-50 p-1 rounded"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
