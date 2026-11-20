import React from 'react';
import type { PublicRegistrationSummary } from '@/utils/publicRegistrationSummary';
import { formatDateTimeCL } from '@/utils/formatters';
export default function RegisteredSummary({ summary, dark = false }: { summary: PublicRegistrationSummary | null; dark?: boolean }) {
  if (!summary) return <p role="alert" className={dark ? 'text-amber-200 mt-4' : 'text-amber-800 mt-4'}>Tu inscripción existe, pero no se pudo cargar su detalle. Vuelve a consultar o contacta al organizador.</p>;
  return <section aria-label="Resumen de tu inscripción guardada" className={'mt-5 space-y-4 text-left ' + (dark ? 'text-white' : 'text-gray-800')}>
    {summary.participantName && <p className="font-semibold text-lg">{summary.participantName}</p>}
    {summary.answers.length > 0 && <div className="rounded-xl border border-current/20 p-4">
      <h2 className="font-semibold mb-2">Tus respuestas guardadas</h2>
      <dl className="space-y-3">{summary.answers.map((answer,index) => <div key={index}>
        <dt className="text-sm font-medium whitespace-pre-wrap">{answer.label}</dt><dd className="text-sm whitespace-pre-wrap mt-1">{answer.text}</dd>
      </div>)}</dl>
    </div>}
    {summary.dietary && <p className="text-sm">Preferencia alimenticia: {summary.dietary}</p>}
    {summary.dates.map(date => <div key={date.id} className="rounded-xl border border-current/20 p-4 space-y-2">
      <h2 className="font-semibold">{date.name}</h2>
      {date.start && <p className="text-sm">{formatDateTimeCL(date.start)}{date.end ? ' — ' + formatDateTimeCL(date.end) : ''}</p>}
      {date.guests.length > 0 && <div><p className="text-sm font-medium">Cargas e invitados seleccionados:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">{date.guests.map((guest,index) => <li key={index} className="text-sm">{guest.name}{guest.type ? ' (' + guest.type + ')' : ''}</li>)}</ul>
      </div>}
      {date.adultCompanion !== null && <p className="text-sm">Acompañante adulto: <strong>{date.adultCompanion ? 'Sí · 1 adulto' : 'No'}</strong></p>}
      {date.numericLoads !== null && <p className="text-sm">Cargas sin nombre: {date.numericLoads}</p>}
      {date.numericGuests > 0 && date.adultCompanion === null && <p className="text-sm">Invitados sin nombre: {date.numericGuests}</p>}
      {date.totalGuests === 0 && <p className="text-sm">Sin invitados inscritos en esta fecha.</p>}
      <p className="text-sm font-semibold">Total de invitados en esta fecha: {date.totalGuests}</p>
    </div>)}
  </section>;
}
