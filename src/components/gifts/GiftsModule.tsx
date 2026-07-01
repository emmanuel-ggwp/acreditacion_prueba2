'use client';

import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Gift, Plus, Trash2, Pencil, Upload, Download, X, Check, Package } from 'lucide-react';
import apiClient from '@/utils/apiClient';
import { showToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import GiftEmployeeImport from './GiftEmployeeImport';

const BASIS_OPTIONS = [
  { value: 'FAMILY', label: 'Por familia (1 por empleado)' },
  { value: 'CHILD', label: 'Por hijo (= cargas hijos)' },
  { value: 'CARGA', label: 'Por carga (= cargas)' },
];
const basisShort: Record<string, string> = { FAMILY: 'por familia', CHILD: 'por hijo', CARGA: 'por carga' };

const statusClasses: Record<string, string> = {
  DELIVERED: 'border-green-400 bg-green-50 text-green-700',
  PARTIAL: 'border-amber-400 bg-amber-50 text-amber-700',
  PENDING: 'border-gray-300 bg-white text-gray-700',
  NA: 'border-gray-200 bg-gray-50 text-gray-300',
};

const emptyEmp = { id: '', fullName: '', rut: '', empresa: '', cargas: 0, cargasHijos: 0 };

const GiftsModule: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [detail, setDetail] = useState<any>(null); // { campaign, types, summary }
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showImport, setShowImport] = useState(false);
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');

  const [typeForm, setTypeForm] = useState<any>(null); // { id?, name, basis }
  const [empForm, setEmpForm] = useState<any>(null); // { id?, fullName, ... }

  const loadCampaigns = async (selectId?: string) => {
    const cs = await apiClient.get<any[]>('/api/gift-campaigns');
    setCampaigns(cs);
    const target = selectId || (cs.length ? cs[0].id : '');
    if (target) await selectCampaign(target);
    else { setCampaignId(''); setDetail(null); setEmployees([]); }
  };

  const selectCampaign = async (id: string) => {
    setCampaignId(id);
    const [det, emps] = await Promise.all([
      apiClient.get<any>(`/api/gift-campaigns/${id}`),
      apiClient.get<any[]>(`/api/gift-campaigns/${id}/employees`),
    ]);
    setDetail(det); setEmployees(emps);
  };

  const refresh = async () => {
    if (!campaignId) return;
    const [det, emps] = await Promise.all([
      apiClient.get<any>(`/api/gift-campaigns/${campaignId}`),
      apiClient.get<any[]>(`/api/gift-campaigns/${campaignId}/employees`),
    ]);
    setDetail(det); setEmployees(emps);
  };

  const refreshSummary = async () => {
    if (!campaignId) return;
    const det = await apiClient.get<any>(`/api/gift-campaigns/${campaignId}`);
    setDetail(det);
  };

  useEffect(() => {
    loadCampaigns().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Campaña ----
  const createCampaign = async () => {
    const name = newCampaignName.trim();
    if (!name) return;
    try {
      const c = await apiClient.post<any>('/api/gift-campaigns', { name });
      setNewCampaignName(''); setShowNewCampaign(false);
      await loadCampaigns(c.id);
      showToast.success('Campaña creada');
    } catch (e: any) { showToast.error(e.message || 'No se pudo crear'); }
  };
  const deleteCampaign = async () => {
    if (!campaignId || !window.confirm('¿Eliminar esta campaña y todos sus datos?')) return;
    try {
      await apiClient.delete(`/api/gift-campaigns/${campaignId}`);
      setCampaignId('');
      await loadCampaigns();
      showToast.success('Campaña eliminada');
    } catch (e: any) { showToast.error(e.message || 'No se pudo eliminar'); }
  };

  // ---- Tipos ----
  const saveType = async () => {
    if (!typeForm?.name?.trim()) { showToast.error('Nombre del tipo obligatorio'); return; }
    try {
      if (typeForm.id) await apiClient.put(`/api/gift-types/${typeForm.id}`, { name: typeForm.name, basis: typeForm.basis });
      else await apiClient.post(`/api/gift-campaigns/${campaignId}/types`, { name: typeForm.name, basis: typeForm.basis });
      setTypeForm(null);
      await refresh();
    } catch (e: any) { showToast.error(e.message || 'Error'); }
  };
  const deleteType = async (id: string) => {
    if (!window.confirm('¿Eliminar este tipo de regalo? Se borrarán sus entregas.')) return;
    try { await apiClient.delete(`/api/gift-types/${id}`); await refresh(); }
    catch (e: any) { showToast.error(e.message || 'Error'); }
  };

  // ---- Empleados ----
  const saveEmployee = async () => {
    if (!empForm?.fullName?.trim()) { showToast.error('Nombre del empleado obligatorio'); return; }
    const payload = {
      fullName: empForm.fullName, rut: empForm.rut, empresa: empForm.empresa,
      cargas: Number(empForm.cargas) || 0, cargasHijos: Number(empForm.cargasHijos) || 0,
    };
    try {
      if (empForm.id) await apiClient.put(`/api/gift-employees/${empForm.id}`, payload);
      else await apiClient.post(`/api/gift-campaigns/${campaignId}/employees`, payload);
      setEmpForm(null);
      await refresh();
      showToast.success('Guardado');
    } catch (e: any) { showToast.error(e.message || 'Error'); }
  };
  const deleteEmployee = async (id: string) => {
    if (!window.confirm('¿Eliminar este empleado?')) return;
    try { await apiClient.delete(`/api/gift-employees/${id}`); await refresh(); }
    catch (e: any) { showToast.error(e.message || 'Error'); }
  };

  // ---- Entrega ----
  const handleLocalDelivery = (empId: string, typeId: string, value: string) => {
    setEmployees((prev) => prev.map((e) => {
      if (e.id !== empId) return e;
      return {
        ...e,
        gifts: e.gifts.map((g: any) => {
          if (g.typeId !== typeId) return g;
          const delivered = Math.max(0, Math.min(g.total, parseInt(value, 10) || 0));
          const status = g.total === 0 ? 'NA' : delivered >= g.total ? 'DELIVERED' : delivered > 0 ? 'PARTIAL' : 'PENDING';
          return { ...g, delivered, status };
        }),
      };
    }));
  };
  const persistDelivery = async (empId: string, typeId: string, value: string | number) => {
    try {
      await apiClient.post('/api/gift-deliveries', { employeeId: empId, giftTypeId: typeId, deliveredQty: Number(value) || 0 });
      await refreshSummary();
    } catch (e: any) { showToast.error(e.message || 'No se pudo registrar la entrega'); }
  };
  const deliverAll = (empId: string, typeId: string, total: number) => {
    handleLocalDelivery(empId, typeId, String(total));
    persistDelivery(empId, typeId, total);
  };

  // ---- Export ----
  const exportToExcel = () => {
    const types = detail?.types || [];
    const rows = employees.map((e) => {
      const base: any = { Nombre: e.fullName, RUT: e.rut || '', Empresa: e.empresa || '', Cargas: e.cargas, 'Cargas hijos': e.cargasHijos };
      e.gifts.forEach((g: any) => {
        base[`${g.name} (entregado)`] = g.delivered;
        base[`${g.name} (total)`] = g.total;
      });
      return base;
    });
    const empresa = (detail?.summary?.byEmpresa || []).map((x: any) => ({
      Empresa: x.empresa, Empleados: x.empleados, Cargas: x.cargas, 'Cargas hijos': x.cargasHijos,
      'Regalos entregados': x.delivered, 'Regalos totales': x.total,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ 'Sin empleados': '' }]), 'Empleados');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(empresa.length ? empresa : [{ 'Sin datos': '' }]), 'Por empresa');
    void types;
    const safe = (detail?.campaign?.name || 'campaña').replace(/[^a-z0-9áéíóúñ ]/gi, '').trim().replace(/\s+/g, '_') || 'campaña';
    XLSX.writeFile(wb, `regalos_${safe}.xlsx`);
  };

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  const types = detail?.types || [];

  return (
    <div className="space-y-6">
      {/* Encabezado + selector de campaña */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Gift className="text-rose-500" /> Regalos Navidad
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={campaignId}
            onChange={(e) => selectCampaign(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[180px]"
          >
            {campaigns.length === 0 && <option value="">— Sin campañas —</option>}
            {campaigns.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <button onClick={() => setShowNewCampaign(true)} className="bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-1">
            <Plus size={16} /> Nueva
          </button>
          {campaignId && (
            <button onClick={deleteCampaign} title="Eliminar campaña" className="border border-gray-300 text-gray-500 hover:text-red-600 px-2 py-2 rounded-lg">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {!campaignId ? (
        <div className="bg-white border rounded-xl p-12 text-center text-gray-500">
          <Gift className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <p>No hay campañas. Crea una (ej. <b>Navidad 2025</b>) para empezar.</p>
        </div>
      ) : (
        <>
          {/* Tipos de regalo */}
          <div className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Package size={18} /> Tipos de regalo</h2>
              <button onClick={() => setTypeForm({ name: '', basis: 'FAMILY' })} className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center gap-1"><Plus size={14} /> Agregar tipo</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {types.map((t: any) => (
                <span key={t.id} className="inline-flex items-center gap-2 bg-gray-50 border rounded-full pl-3 pr-2 py-1 text-sm">
                  <span className="font-medium">{t.name}</span>
                  <span className="text-xs text-gray-500">({basisShort[t.basis]})</span>
                  <button onClick={() => setTypeForm({ id: t.id, name: t.name, basis: t.basis })} className="text-gray-400 hover:text-indigo-600"><Pencil size={13} /></button>
                  <button onClick={() => deleteType(t.id)} className="text-gray-400 hover:text-red-600"><X size={14} /></button>
                </span>
              ))}
              {types.length === 0 && <span className="text-sm text-gray-400">Sin tipos. Agrega al menos uno.</span>}
            </div>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Totales por tipo</h3>
              <div className="space-y-2">
                <div className="text-sm text-gray-500">Empleados: <b className="text-gray-800">{detail?.summary?.totalEmpleados ?? 0}</b></div>
                {(detail?.summary?.byType || []).map((t: any) => (
                  <div key={t.typeId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{t.name}</span>
                    <span className="font-medium">{t.delivered} / {t.total}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 bg-white border rounded-xl p-4 overflow-x-auto">
              <h3 className="font-semibold text-gray-800 mb-3">Por empresa</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="py-1 pr-2">Empresa</th><th className="py-1 px-2">Empleados</th>
                    <th className="py-1 px-2">Cargas</th><th className="py-1 px-2">Hijos</th><th className="py-1 px-2">Regalos</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail?.summary?.byEmpresa || []).map((e: any) => (
                    <tr key={e.empresa} className="border-b last:border-0">
                      <td className="py-1 pr-2 font-medium">{e.empresa}</td>
                      <td className="py-1 px-2">{e.empleados}</td>
                      <td className="py-1 px-2">{e.cargas}</td>
                      <td className="py-1 px-2">{e.cargasHijos}</td>
                      <td className="py-1 px-2">{e.delivered} / {e.total}</td>
                    </tr>
                  ))}
                  {(detail?.summary?.byEmpresa || []).length === 0 && (
                    <tr><td colSpan={5} className="py-3 text-center text-gray-400">Sin empleados aún.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setShowImport(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm flex items-center gap-2"><Upload size={16} /> Importar Excel</button>
            <button onClick={() => setEmpForm({ ...emptyEmp })} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"><Plus size={16} /> Agregar empleado</button>
            <button onClick={exportToExcel} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"><Download size={16} /> Exportar Excel</button>
          </div>

          {/* Tabla de empleados */}
          <div className="bg-white border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2">Empleado</th>
                  <th className="px-3 py-2">RUT</th>
                  <th className="px-3 py-2">Empresa</th>
                  <th className="px-3 py-2 text-center">Cargas</th>
                  <th className="px-3 py-2 text-center">Hijos</th>
                  {types.map((t: any) => (<th key={t.id} className="px-3 py-2 text-center">{t.name}</th>))}
                  <th className="px-3 py-2 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{e.fullName}{e.source === 'MANUAL' && <span className="ml-1 text-[10px] text-indigo-500">(manual)</span>}</td>
                    <td className="px-3 py-2 text-gray-600">{e.rut || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{e.empresa || '—'}</td>
                    <td className="px-3 py-2 text-center">{e.cargas}</td>
                    <td className="px-3 py-2 text-center">{e.cargasHijos}</td>
                    {e.gifts.map((g: any) => (
                      <td key={g.typeId} className="px-3 py-2 text-center">
                        {g.total === 0 ? (
                          <span className="text-gray-300">—</span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number" min={0} max={g.total} value={g.delivered}
                              onChange={(ev) => handleLocalDelivery(e.id, g.typeId, ev.target.value)}
                              onBlur={(ev) => persistDelivery(e.id, g.typeId, ev.target.value)}
                              className={`w-12 text-center border rounded px-1 py-0.5 text-sm ${statusClasses[g.status]}`}
                            />
                            <span className="text-xs text-gray-400">/{g.total}</span>
                            {g.status !== 'DELIVERED' && (
                              <button onClick={() => deliverAll(e.id, g.typeId, g.total)} title="Entregar todo" className="text-gray-300 hover:text-green-600"><Check size={14} /></button>
                            )}
                          </div>
                        )}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <button onClick={() => setEmpForm({ id: e.id, fullName: e.fullName, rut: e.rut || '', empresa: e.empresa || '', cargas: e.cargas, cargasHijos: e.cargasHijos })} className="text-gray-400 hover:text-indigo-600 mr-2"><Pencil size={15} /></button>
                      <button onClick={() => deleteEmployee(e.id)} className="text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
                {employees.length === 0 && (
                  <tr><td colSpan={6 + types.length} className="px-3 py-8 text-center text-gray-400">Sin empleados. Importa un Excel o agrega manualmente.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Modal: nueva campaña */}
      {showNewCampaign && (
        <Modal title="Nueva campaña" onClose={() => setShowNewCampaign(false)}>
          <input autoFocus value={newCampaignName} onChange={(e) => setNewCampaignName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createCampaign()} placeholder="Ej. Navidad 2025" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <p className="text-xs text-gray-500 mt-2">Se crearán los tipos por defecto: Caja familiar y Regalo hijo (editables).</p>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowNewCampaign(false)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
            <button onClick={createCampaign} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Crear</button>
          </div>
        </Modal>
      )}

      {/* Modal: tipo de regalo */}
      {typeForm && (
        <Modal title={typeForm.id ? 'Editar tipo de regalo' : 'Nuevo tipo de regalo'} onClose={() => setTypeForm(null)}>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input autoFocus value={typeForm.name} onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })} placeholder="Ej. Caja familiar" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-3" />
          <label className="block text-sm font-medium mb-1">¿Cómo se calcula la cantidad?</label>
          <select value={typeForm.basis} onChange={(e) => setTypeForm({ ...typeForm, basis: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
            {BASIS_OPTIONS.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
          </select>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setTypeForm(null)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
            <button onClick={saveType} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Guardar</button>
          </div>
        </Modal>
      )}

      {/* Modal: empleado */}
      {empForm && (
        <Modal title={empForm.id ? 'Editar empleado' : 'Agregar empleado'} onClose={() => setEmpForm(null)}>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre empleado *</label>
              <input autoFocus value={empForm.fullName} onChange={(e) => setEmpForm({ ...empForm, fullName: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">RUT</label>
                <input value={empForm.rut} onChange={(e) => setEmpForm({ ...empForm, rut: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Empresa</label>
                <input value={empForm.empresa} onChange={(e) => setEmpForm({ ...empForm, empresa: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cantidad de cargas</label>
                <input type="number" min={0} value={empForm.cargas} onChange={(e) => setEmpForm({ ...empForm, cargas: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cantidad de cargas hijos</label>
                <input type="number" min={0} value={empForm.cargasHijos} onChange={(e) => setEmpForm({ ...empForm, cargasHijos: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setEmpForm(null)} className="px-4 py-2 border rounded-lg text-sm">Cancelar</button>
            <button onClick={saveEmployee} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Guardar</button>
          </div>
        </Modal>
      )}

      {/* Modal: importar */}
      {showImport && campaignId && (
        <GiftEmployeeImport campaignId={campaignId} onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); refresh(); }} />
      )}
    </div>
  );
};

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
      <div className="flex justify-between items-center px-5 py-3 border-b">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

export default GiftsModule;
