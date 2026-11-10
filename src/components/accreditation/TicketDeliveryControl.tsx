'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ticket, Loader2 } from 'lucide-react';
import apiClient from '@/utils/apiClient';
import { showToast } from '@/components/ui/Toast';
import { formatDateTimeCL } from '@/utils/formatters';

interface Status {
  maxPerParticipant: number;
  isAccredited: boolean;
  delivery: { quantity: number; deliveredAt: string; deliveredBy: string | null } | null;
}

export default function TicketDeliveryControl({ participantId, scheduleId, accredited, refreshKey }: {
  participantId: string; scheduleId: string; accredited: boolean; refreshKey?: number;
}) {
  const [status, setStatus] = useState<Status | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const sending = useRef(false);
  const sequence = useRef(0);
  const endpoint = `/api/participants/${participantId}/tickets?scheduleId=${encodeURIComponent(scheduleId)}`;
  const reload = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const next = await apiClient.get<Status>(endpoint);
      if (request !== sequence.current) return;
      setStatus(next);
      setError('');
    } catch (e: any) {
      if (request === sequence.current) setError(e.message || 'No se pudo consultar la entrega de tickets.');
    }
  }, [endpoint]);

  useEffect(() => {
    setStatus(null);
    setError('');
    setQuantity(1);
    void reload();
    return () => { sequence.current++; };
  }, [reload, accredited, refreshKey]);

  const deliver = async () => {
    if (sending.current || !status || !accredited || !status.isAccredited || status.delivery) return;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > status.maxPerParticipant) {
      showToast.error(`Ingresa entre 1 y ${status.maxPerParticipant} tickets.`);
      return;
    }
    if (!window.confirm(`¿Confirmar entrega de ${quantity} ticket(s)? Se registra una sola entrega por participante en todo el evento.`)) return;
    sending.current = true;
    setBusy(true);
    try {
      await apiClient.post(`/api/participants/${participantId}/tickets`, { scheduleId, quantity });
      showToast.success('Entrega de tickets registrada');
    } catch (e: any) {
      showToast.error(e.message || 'No se pudo registrar la entrega.');
    } finally {
      await reload();
      sending.current = false;
      setBusy(false);
    }
  };

  if (!error && (!status || (!status.maxPerParticipant && !status.delivery))) return null;
  return (
    <section className="border-t border-indigo-100 bg-indigo-50/50 p-4 sm:p-6">
      <h3 className="font-semibold text-indigo-900 flex items-center gap-2"><Ticket size={18} /> Entrega de tickets</h3>
      {error ? <p role="alert" className="text-sm text-red-700 mt-2">{error} <button type="button" onClick={() => void reload()} className="underline">Reintentar</button></p>
        : status?.delivery ? <p className="text-sm text-indigo-900 mt-2">Ya recibió <b>{status.delivery.quantity} ticket(s)</b> · {formatDateTimeCL(status.delivery.deliveredAt)}. Entrega registrada para todo el evento.</p>
          : status && <>
            <p className="text-sm text-gray-600 mt-1">Máximo {status.maxPerParticipant} ticket(s) por participante en todo el evento. Una sola entrega.</p>
            {!accredited || !status.isAccredited ? <p className="text-sm text-amber-800 mt-2">Primero acredita al participante.</p>
              : <div className="flex flex-wrap items-end gap-3 mt-3">
                <label className="text-sm text-gray-700">Tickets a entregar
                  <input type="number" min={1} max={status.maxPerParticipant} step={1} value={quantity} disabled={busy} onChange={(e) => setQuantity(Number(e.target.value))} className="block w-28 border border-gray-300 rounded-md px-3 py-2 mt-1" />
                </label>
                <button type="button" onClick={deliver} disabled={busy || !Number.isInteger(quantity) || quantity < 1 || quantity > status.maxPerParticipant} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  {busy ? <Loader2 size={18} className="animate-spin" /> : <Ticket size={18} />} Registrar entrega
                </button>
              </div>}
          </>}
    </section>
  );
}
