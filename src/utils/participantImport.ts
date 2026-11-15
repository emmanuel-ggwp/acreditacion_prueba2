/** Mapea exclusivamente guest1.firstName, guest2.documentNumber, etc. como invitados. */
export function mapParticipantImportRow(row: Record<string, unknown>, headers: string[], mapping: Record<string, string>): Record<string, any> & { guests: Record<string, string>[] } {
  const participant: Record<string, any> = {};
  const guests: Record<string, Record<string, string>> = {};
  for (const header of headers) {
    const target = mapping[header];
    if (!target || target === 'ignore') continue;
    const value = String(row[header] ?? '').trim();
    if (!value) continue;
    if (/^guest\d+\./.test(target)) {
      const [guest, field] = target.split('.');
      (guests[guest] ||= {})[field] = value;
    } else if (target === 'allowedGuests') {
      participant[target] = parseInt(value, 10) || 0;
    } else {
      participant[target] = value;
    }
  }
  return { ...participant, guests: Object.values(guests).filter(guest => guest.firstName) };
}

/** Vacío significa conservar; cero/No son valores explícitos que sí se importan. */
export function numericGuestImport(data: Record<string, any>, current: Record<string, any> = {}): { guestCount?: number; guestCompanion?: boolean; guestLoads?: number } {
  const supplied = (key: string) => data[key] != null && String(data[key]).trim() !== '';
  const integer = (key: string, label: string) => {
    const raw = String(data[key]).trim();
    const value = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value)) {
      throw new Error(`${label}: debe ser un número entero mayor o igual a cero.`);
    }
    return value;
  };
  const hasLoads = supplied('guestLoads');
  const hasCompanion = supplied('guestCompanion');
  const hasCount = supplied('guestCount');
  if (!hasLoads && !hasCompanion && !hasCount) return {};
  if (hasCount && (hasLoads || hasCompanion)) {
    throw new Error('Usa N° de invitados o acompañante y cargas, no ambos modos en la misma fila.');
  }
  if (hasCount) return { guestCount: integer('guestCount', 'N° de invitados'), guestCompanion: false, guestLoads: 0 };
  let companion = Boolean(current.guestCompanion);
  if (hasCompanion) {
    const raw = String(data.guestCompanion).trim().toLowerCase();
    if (/^(s[ií]|yes|y|true|1|x)$/.test(raw)) companion = true;
    else if (/^(no|n|false|0)$/.test(raw)) companion = false;
    else throw new Error('Acompañante: usa Sí o No; las cantidades van en N° de cargas.');
  }
  const loads = hasLoads ? integer('guestLoads', 'N° de cargas') : Number(current.guestLoads) || 0;
  const count = loads + (companion ? 1 : 0);
  if (!Number.isSafeInteger(count)) throw new Error('La cantidad total de invitados es demasiado grande.');
  return {
    ...(hasLoads ? { guestLoads: loads } : {}),
    ...(hasCompanion ? { guestCompanion: companion } : {}),
    guestCount: count,
  };
}
