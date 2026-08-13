'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import useParticipantStore from '@/store/participantStore';
import useEventStore from '@/store/eventStore';
import useAuthStore from '@/store/authStore';
import { PlusCircle, FileDown, FileUp, Edit, Trash2, Award, X, CheckCircle2, Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import Participant from '@/models/Participant';
import ParticipantForm from './ParticipantForm';
import ParticipantImport from './ParticipantImport';
import { showToast } from '@/components/ui/Toast';
import { exportParticipantsToExcel } from '@/utils/exportParticipants';
import DeleteReasonModal from '@/components/ui/DeleteReasonModal';
import { getGuestMode } from '@/utils/formFields';
import { getDietaryOptions } from '@/utils/dietary';

const fmtAccreditedAt = (d?: string | null) => {
  if (!d) return null;
  try {
    return new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return null; }
};

// Tamaño de página de la tabla (la búsqueda y los filtros corren en el servidor).
const PAGE_SIZE = 25;

const ParticipantList = ({ eventId }: { eventId: string }) => {
  const router = useRouter();
  const {
    participants,
    loading,
    error,
    total,
    fetchParticipantsByEvent,
    deleteParticipant,
    bulkDeleteParticipants,
    updateParticipant
  } = useParticipantStore();
  const { currentEvent } = useEventStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState('');
  const [showOnlyAwarded, setShowOnlyAwarded] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | undefined>(undefined);
  const [awarding, setAwarding] = useState<any | null>(null);
  const [awardReasonInput, setAwardReasonInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [savingAward, setSavingAward] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportParticipantsToExcel(eventId, (currentEvent as any)?.name || 'evento');
      showToast.success('Excel generado');
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo exportar');
    } finally {
      setExporting(false);
    }
  };

  const [page, setPage] = useState(1);

  // Filtros que viajan al servidor: la búsqueda cubre TODOS los participantes del
  // evento (por nombre, correo o RUT en cualquier formato), no solo la página cargada.
  const currentFilters = useMemo(() => {
    const f: Record<string, string> = {};
    if (filter.trim()) f.name = filter.trim();
    if (showOnlyAwarded) f.awarded = 'true';
    return f;
  }, [filter, showOnlyAwarded]);

  const reload = useCallback(() => {
    fetchParticipantsByEvent(eventId, page, PAGE_SIZE, currentFilters);
  }, [eventId, page, currentFilters, fetchParticipantsByEvent]);

  // Cambiar la búsqueda o el filtro vuelve a la página 1.
  useEffect(() => { setPage(1); }, [filter, showOnlyAwarded]);

  // Carga de la tabla (con debounce mientras se escribe en el buscador).
  useEffect(() => {
    const t = setTimeout(reload, filter.trim() ? 300 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reload]);

  // El total con filtros activos es el total FILTRADO; para el aforo se recuerda
  // el total sin filtros (el que corresponde a la capacidad del evento).
  const [unfilteredTotal, setUnfilteredTotal] = useState(0);
  useEffect(() => {
    if (!loading && Object.keys(currentFilters).length === 0) setUnfilteredTotal(total);
  }, [total, loading, currentFilters]);

  const isEventFull = useMemo(() => {
    if (!currentEvent?.maxCapacity) return false;
    return unfilteredTotal >= currentEvent.maxCapacity;
  }, [currentEvent, unfilteredTotal]);

  const handleEdit = (participant: Participant) => {
    setSelectedParticipant(participant);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    const p = participants.find((x) => x.id === id) || null;
    setDeleteTarget(p);
  };
  const confirmDelete = async (reason: string) => {
    if (!deleteTarget) return;
    await deleteParticipant(deleteTarget.id, reason);
    setDeleteTarget(null);
    reload();
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedParticipant(undefined);
    reload();
  };

  // La búsqueda y el filtro de premiados ya vienen resueltos del servidor.
  const allSelected = participants.length > 0 && selectedIds.length === participants.length;
  const toggleSelect = (id: string) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : participants.map((p) => p.id));

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`¿Eliminar ${selectedIds.length} participante(s)? Se borran de forma definitiva junto con sus invitados y acreditaciones.`)) return;
    setBulkDeleting(true);
    try {
      const r = await bulkDeleteParticipants(eventId, { ids: selectedIds });
      showToast.success(`Eliminados: ${r.deleted} · Invitados: ${r.guestsDeleted}`);
      setSelectedIds([]);
      reload();
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo eliminar');
    } finally { setBulkDeleting(false); }
  };

  const handleEmptyAll = async () => {
    if (!window.confirm(`⚠️ ¿VACIAR TODOS los participantes de "${(currentEvent as any)?.name || 'este evento'}"?\n\nEsta acción es IRREVERSIBLE y borra participantes, invitados y acreditaciones.`)) return;
    if (!window.confirm('Confirma otra vez: se eliminarán TODOS los participantes del evento.')) return;
    setBulkDeleting(true);
    try {
      const r = await bulkDeleteParticipants(eventId, { all: true });
      showToast.success(`Participantes vaciados: ${r.deleted} (invitados: ${r.guestsDeleted})`);
      setSelectedIds([]);
      reload();
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo vaciar');
    } finally { setBulkDeleting(false); }
  };

  const openAward = (p: any) => { setAwarding(p); setAwardReasonInput(p.awardReason || ''); };

  const saveAward = async (awarded: boolean) => {
    if (!awarding) return;
    setSavingAward(true);
    try {
      await updateParticipant(awarding.id, { isAwarded: awarded, awardReason: awarded ? (awardReasonInput.trim() || null) : null } as any);
      showToast.success(awarded ? 'Participante premiado' : 'Premiación quitada');
      setAwarding(null);
      reload();
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo guardar la premiación');
    } finally {
      setSavingAward(false);
    }
  };

  // Solo en la carga inicial: con una búsqueda activa NO se desmonta la pantalla
  // (haría perder el foco del buscador en cada tecleo sin resultados).
  if (loading && participants.length === 0 && !filter.trim() && !showOnlyAwarded) {
    return <div className="p-4 text-center">Cargando participantes...</div>;
  }
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      {error && !isFormOpen && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          Participantes
        </h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => { setSelectedParticipant(undefined); setIsFormOpen(true); }}
            disabled={isEventFull}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
              isEventFull 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
            title={isEventFull ? 'Capacidad del evento alcanzada' : 'Agregar nuevo participante'}
          >
            <PlusCircle size={18} />
            Nuevo participante
          </button>
          <button
            onClick={() => setIsImportOpen(true)}
            className="border px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
            title="Importar participantes desde Excel/CSV"
          >
            <FileUp size={18} />
            Importar
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
            title="Exportar a Excel (participantes + invitados + fechas)"
          >
            <FileDown size={18} />
            {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {selectedIds.length > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={bulkDeleting}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50"
              title="Eliminar los participantes seleccionados"
            >
              <Trash2 size={18} />
              Eliminar ({selectedIds.length})
            </button>
          )}
          <button
            onClick={handleEmptyAll}
            disabled={bulkDeleting || participants.length === 0}
            className="border border-red-300 text-red-700 px-4 py-2 rounded-lg hover:bg-red-50 flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-40"
            title="Vaciar TODOS los participantes del evento"
          >
            <Trash2 size={18} />
            Vaciar
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Filtra la TABLA en el servidor (todos los participantes del evento, no solo
            la página visible). Acepta nombre, correo o RUT en cualquier formato. */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar en la tabla por nombre, correo o RUT…"
            className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-indigo-500 focus:border-indigo-500"
          />
          {filter && (
            <button
              type="button"
              onClick={() => setFilter('')}
              aria-label="Limpiar búsqueda"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setShowOnlyAwarded((v) => !v)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 whitespace-nowrap ${showOnlyAwarded ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
        >
          <Award size={16} /> {showOnlyAwarded ? 'Mostrando premiados' : 'Solo premiados'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  title="Seleccionar todos"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documento</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora acreditación</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Premiado</th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {participants.length > 0 ? (
              participants.map((participant) => (
                <tr key={participant.id} className={`hover:bg-gray-50 transition-colors ${selectedIds.includes(participant.id) ? 'bg-indigo-50/50' : ''}`}>
                  <td className="px-4 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(participant.id)}
                      onChange={() => toggleSelect(participant.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{`${participant.firstName} ${participant.lastName}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{participant.documentNumber || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(participant as any).registered ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700" title="El participante ya se inscribió (tiene fecha)">
                        <CheckCircle2 size={12} /> Inscrito
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700" title="Precargado: aún no se inscribe. Solo tiene acceso al formulario con su RUT.">
                        <Clock size={12} /> Precargado
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {fmtAccreditedAt((participant as any).accreditedAt) || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {(participant as any).isAwarded ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800" title={(participant as any).awardReason || ''}>
                        <Award size={12} /> Premiado
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => openAward(participant as any)}
                        className={`p-1 rounded hover:bg-amber-50 ${(participant as any).isAwarded ? 'text-amber-600' : 'text-gray-400 hover:text-amber-600'}`}
                        title="Premiación"
                      >
                        <Award size={16} />
                      </button>
                      <button
                        onClick={() => handleEdit(participant as any)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 hover:bg-indigo-50 rounded"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(participant.id)}
                        className="text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                  {filter.trim() || showOnlyAwarded
                    ? <>No se encontraron participantes para esta búsqueda{filter.trim() ? <>: <b>&quot;{filter.trim()}&quot;</b></> : ''}.</>
                    : 'No se encontraron participantes. Agrega uno para comenzar.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación: la tabla muestra PAGE_SIZE filas por página sobre el total filtrado. */}
      {total > PAGE_SIZE && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-4 text-sm text-gray-600">
          <span>
            Mostrando <b>{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}</b> de <b>{total}</b>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
            >
              <ChevronLeft size={15} /> Anterior
            </button>
            <span className="px-1">Página {page} de {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / PAGE_SIZE) || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40"
            >
              Siguiente <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {isFormOpen && (
        <ParticipantForm
          eventId={eventId}
          participant={selectedParticipant}
          onClose={handleCloseForm}
        />
      )}

      {isImportOpen && (
        <ParticipantImport
          eventId={eventId}
          guestMode={getGuestMode((currentEvent as any)?.registrationConfig)}
          dietaryOptions={getDietaryOptions((currentEvent as any)?.registrationConfig).filter((o) => o.value !== 'NONE').map((o) => o.label)}
          onClose={() => setIsImportOpen(false)}
          onImported={reload}
        />
      )}

      {deleteTarget && (
        <DeleteReasonModal
          title="Eliminar participante"
          itemName={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {awarding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="text-lg font-bold flex items-center gap-2"><Award size={18} className="text-amber-600" /> Premiación</h3>
              <button onClick={() => setAwarding(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-5">
              <p className="text-sm text-gray-700 mb-3"><b>{awarding.firstName} {awarding.lastName}</b></p>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
              <textarea value={awardReasonInput} onChange={(e) => setAwardReasonInput(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" placeholder="Ej. Mejor disfraz, sorteo, reconocimiento…" />
            </div>
            <div className="flex justify-between gap-2 px-5 py-4 border-t bg-gray-50">
              {awarding.isAwarded ? (
                <button onClick={() => saveAward(false)} disabled={savingAward} className="px-4 py-2 rounded-lg border border-red-300 text-red-700 text-sm hover:bg-red-50 disabled:opacity-50">Quitar premiación</button>
              ) : <span />}
              <div className="flex gap-2">
                <button onClick={() => setAwarding(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100">Cancelar</button>
                <button onClick={() => saveAward(true)} disabled={savingAward} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-700 disabled:opacity-50">{awarding.isAwarded ? 'Actualizar motivo' : 'Premiar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantList;
