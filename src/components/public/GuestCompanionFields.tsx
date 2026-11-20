'use client';
import React from 'react';
import { adultCompanionEnabled } from '@/utils/adultCompanion';
import { formatDateCL } from '@/utils/formatters';
export function GuestInstructions({ config, dark = false }: { config: any; dark?: boolean }) {
  if (adultCompanionEnabled(config) || (!config?.guests?.title && !config?.guests?.helpText)) return null;
  return <div className={dark ? 'text-white' : 'text-gray-800'}>
    {config.guests.title && <p className="font-semibold">{config.guests.title}</p>}
    {config.guests.helpText && <p className="text-sm whitespace-pre-wrap mt-1">{config.guests.helpText}</p>}
  </div>;
}
export default function GuestCompanionFields({ config, schedules, answers, onChange, lockedIds = [], dark = false }: {
  config: any; schedules: any[]; answers: Record<string, boolean>;
  onChange: (answers: Record<string, boolean>) => void; lockedIds?: string[]; dark?: boolean;
}) {
  if (!adultCompanionEnabled(config)) return null;
  return <div className={dark ? 'space-y-3 text-white mt-4' : 'space-y-3 text-gray-800 border-t pt-4'}>
    {schedules.length === 0 && <p className="text-sm">Elige una fecha para indicar si asistirás con acompañante adulto.</p>}
    {schedules.map(schedule => <fieldset key={schedule.id} className="rounded-lg border border-current/20 p-3" disabled={lockedIds.includes(schedule.id)}>
      <legend className="px-1 font-semibold text-sm">{config.guests.title?.trim() || '¿Asiste con acompañante adulto?'}</legend>
      <p className="text-sm mb-2">{schedule.label || schedule.scheduleName} · {formatDateCL(schedule.startDateTime)}</p>
      {config.guests.helpText && <p className="text-sm whitespace-pre-wrap mb-3">{config.guests.helpText}</p>}
      <div className="flex gap-4">
        {[true, false].map(value => <label key={String(value)} className="inline-flex items-center gap-2 cursor-pointer">
          <input type="radio" name={'adult-companion-' + schedule.id} checked={(answers[schedule.id] === true) === value}
            onChange={() => onChange({ ...answers, [schedule.id]: value })} className="h-4 w-4" />
          {value ? 'Sí' : 'No'}
        </label>)}
      </div>
      {lockedIds.includes(schedule.id) && <p className="text-xs mt-2">Ya inscrito. Para cambiar esta respuesta, contacta al organizador.</p>}
    </fieldset>)}
  </div>;
}
