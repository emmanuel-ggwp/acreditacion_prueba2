'use client';

import React, { useEffect, useState } from 'react';
import apiClient from '@/utils/apiClient';
import { ROLES, ROLE_LABELS, ROLE_DESCRIPTIONS, ASSIGNABLE_ROLES, Role } from '@/utils/constants';
import { showToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import DeleteReasonModal from '@/components/ui/DeleteReasonModal';
import { Plus, Pencil, Trash2, UserCheck, UserX, X } from 'lucide-react';

const roleBadge: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  OPERATOR: 'bg-teal-100 text-teal-700',
  GUARDIA: 'bg-amber-100 text-amber-700',
};
const fmt = (d?: string) => (d ? new Date(d).toLocaleString('es-CL') : '—');

const UserManager: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    apiClient.get<any[]>('/api/users').then(setUsers).catch(() => setUsers([])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openNew = () => setForm({ username: '', email: '', password: '', firstName: '', lastName: '', role: ROLES.GUARD });
  const openEdit = (u: any) => setForm({ id: u.id, username: u.username, email: u.email, password: '', firstName: u.firstName || '', lastName: u.lastName || '', role: u.role });

  const save = async () => {
    setSaving(true);
    try {
      if (!form.id) {
        await apiClient.post('/api/users', form);
        showToast.success('Usuario creado');
      } else {
        const payload: any = { firstName: form.firstName, lastName: form.lastName, role: form.role };
        if (form.password) payload.password = form.password;
        await apiClient.put(`/api/users/${form.id}`, payload);
        showToast.success('Usuario actualizado');
      }
      setForm(null);
      load();
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (u: any) => {
    try {
      await apiClient.put(`/api/users/${u.id}`, { isActive: !u.isActive });
      showToast.success(u.isActive ? 'Usuario desactivado' : 'Usuario activado');
      load();
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo cambiar el estado');
    }
  };

  const confirmDelete = async (reason: string) => {
    try {
      await apiClient.delete(`/api/users/${deleteTarget.id}?reason=${encodeURIComponent(reason)}`);
      showToast.success('Usuario eliminado');
      setDeleteTarget(null);
      load();
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo eliminar');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Usuarios</h1>
        <button onClick={openNew} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2">
          <Plus size={16} /> Nuevo usuario
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
      ) : (
        <div className="bg-white border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2">Usuario</th>
                <th className="px-4 py-2">Correo</th>
                <th className="px-4 py-2">Rol</th>
                <th className="px-4 py-2">Estado</th>
                <th className="px-4 py-2">Última conexión</th>
                <th className="px-4 py-2 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <span className="font-medium">{u.username}</span>
                    {(u.firstName || u.lastName) && <span className="block text-xs text-gray-500">{`${u.firstName || ''} ${u.lastName || ''}`.trim()}</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-600">{u.email}</td>
                  <td className="px-4 py-2"><span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadge[u.role] || 'bg-gray-100 text-gray-600'}`}>{ROLE_LABELS[u.role as Role] || u.role}</span></td>
                  <td className="px-4 py-2">
                    {u.isActive ? <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Activo</span> : <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactivo</span>}
                  </td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">{fmt(u.lastLogin)}</td>
                  <td className="px-4 py-2 text-center whitespace-nowrap">
                    <button onClick={() => openEdit(u)} title="Editar" className="text-gray-400 hover:text-indigo-600 mx-1"><Pencil size={16} /></button>
                    <button onClick={() => toggleActive(u)} title={u.isActive ? 'Desactivar' : 'Activar'} className={`mx-1 ${u.isActive ? 'text-gray-400 hover:text-amber-600' : 'text-gray-400 hover:text-green-600'}`}>{u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}</button>
                    <button onClick={() => setDeleteTarget(u)} title="Eliminar" className="text-gray-400 hover:text-red-600 mx-1"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay usuarios.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center px-5 py-3 border-b">
              <h2 className="text-lg font-semibold">{form.id ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button onClick={() => setForm(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-3">
              {!form.id && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Usuario *</label>
                    <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Correo *</label>
                    <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Nombre</label>
                  <input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Apellido</label>
                  <input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{form.id ? 'Nueva contraseña (opcional)' : 'Contraseña *'}</label>
                <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={form.id ? 'Dejar en blanco para no cambiar' : 'Mínimo 6 caracteres'} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rol</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                  {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">{ROLE_DESCRIPTIONS[form.role as Role]}</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3 border-t">
              <button onClick={() => setForm(null)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <DeleteReasonModal
          title="Eliminar usuario"
          itemName={deleteTarget.username}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default UserManager;
