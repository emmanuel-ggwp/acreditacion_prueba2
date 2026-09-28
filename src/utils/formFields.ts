/**
 * Utilidades de visibilidad y obligatoriedad de campos configurables por evento.
 *
 * Resuelve, mezclando la config del evento con los defaults, qué campos se piden en el
 * formulario de inscripción ({@link getFormFields}), cuáles se muestran extra en la
 * acreditación ({@link getAccreditationFields}) y qué campos se piden por cada invitado
 * en modo `named` ({@link getGuestFields}, {@link guestDietaryEnabled}). También expone el
 * modo de invitados del evento ({@link getGuestMode}). Regla transversal: un campo
 * deshabilitado nunca queda como obligatorio.
 */
// Campos opcionales configurables por evento para el formulario de inscripción.
// Nombre, Apellido y Correo siempre se piden (no son configurables).

/** Definición de un campo configurable: `key` interna y `label` visible. */
export interface FieldDef { key: string; label: string }

/** Campos opcionales del formulario de inscripción que el evento puede activar/exigir. */
export const CONFIGURABLE_FIELDS: FieldDef[] = [
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'documentNumber', label: 'RUT / Documento' },
  { key: 'company', label: 'Empresa' },
  { key: 'position', label: 'Cargo' },
  { key: 'numeroSap', label: 'Código SAP' },
  { key: 'dietary', label: 'Preferencia alimenticia' },
];

/** Estado de un campo: `enabled` (se muestra) y `required` (es obligatorio). */
export interface FieldConfig { enabled: boolean; required: boolean }
/** Mapa de configuración de campos, indexado por la `key` del campo. */
export type FormFieldsConfig = Record<string, FieldConfig>;

// Defaults: para no romper eventos existentes, Teléfono y RUT visibles (opcionales).
// Correo: activado y OBLIGATORIO por defecto (comportamiento de siempre); cada evento
// puede hacerlo opcional o quitarlo.
const DEFAULTS: FormFieldsConfig = {
  email: { enabled: true, required: true },
  phone: { enabled: true, required: false },
  documentNumber: { enabled: true, required: false },
  company: { enabled: false, required: false },
  position: { enabled: false, required: false },
  numeroSap: { enabled: false, required: false },
  dietary: { enabled: false, required: false },
};

/**
 * Devuelve la config de campos del evento mezclada con los defaults.
 * @param registrationConfig Config de inscripción del evento; se lee `formFields`.
 * @returns Config resuelta por cada campo configurable. Un campo deshabilitado queda con
 *   `required: false` aunque la config lo marcara obligatorio.
 */
export function getFormFields(registrationConfig: any): FormFieldsConfig {
  const cfg = registrationConfig?.formFields || {};
  const out: FormFieldsConfig = {};
  for (const { key } of CONFIGURABLE_FIELDS) {
    out[key] = {
      enabled: cfg[key]?.enabled ?? DEFAULTS[key].enabled,
      required: (cfg[key]?.enabled ?? DEFAULTS[key].enabled) ? (cfg[key]?.required ?? DEFAULTS[key].required) : false,
    };
  }
  return out;
}

// Campos OPCIONALES del participante que se pueden mostrar en la pantalla de
// ACREDITACIÓN (la puerta). Nombre, RUT, preferencia alimenticia, premiado y la edad
// del invitado se muestran SIEMPRE; esto controla los extra que el organizador elija.
/** Campos EXTRA que el organizador puede mostrar en la pantalla de acreditación. */
export const CONFIGURABLE_ACCREDITATION_FIELDS: FieldDef[] = [
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'company', label: 'Empresa' },
  { key: 'position', label: 'Cargo' },
  { key: 'numeroSap', label: 'Código SAP' },
];

/**
 * Qué campos EXTRA mostrar en la acreditación, por evento
 * (registrationConfig.accreditationFields: { <campo>: boolean }).
 * Default: se muestran los que el evento habilitó en el formulario de inscripción
 * (getFormFields), para que "funcione solo"; el organizador puede ajustarlo.
 *
 * @param registrationConfig Config de inscripción del evento; se lee `accreditationFields`.
 * @returns Mapa `campo -> boolean` para cada campo extra. Si el evento no lo definió,
 *   hereda si estaba habilitado en el formulario de inscripción.
 */
export function getAccreditationFields(registrationConfig: any): Record<string, boolean> {
  const cfg = registrationConfig?.accreditationFields || {};
  const formFields = getFormFields(registrationConfig);
  const out: Record<string, boolean> = {};
  for (const { key } of CONFIGURABLE_ACCREDITATION_FIELDS) {
    out[key] = typeof cfg[key] === 'boolean' ? cfg[key] : !!formFields[key]?.enabled;
  }
  return out;
}

/**
 * ¿Se pide preferencia alimenticia a cada invitado? (solo modo 'named')
 * @param registrationConfig Config de inscripción del evento.
 * @returns `true` solo si el modo de invitados es `named` y `guests.dietary` está activo.
 */
export function guestDietaryEnabled(registrationConfig: any): boolean {
  return getGuestMode(registrationConfig) === 'named' && !!registrationConfig?.guests?.dietary;
}

// Campos configurables por evento para cada INVITADO (modo 'named'). El NOMBRE siempre
// se pide (identifica al invitado); esto controla apellido, RUT y edad.
/** Campos configurables por cada INVITADO en modo 'named' (el nombre siempre se pide). */
export const CONFIGURABLE_GUEST_FIELDS: FieldDef[] = [
  { key: 'lastName', label: 'Apellido' },
  { key: 'documentNumber', label: 'RUT / Documento' },
  { key: 'age', label: 'Edad' },
];

// Defaults para no cambiar el comportamiento actual: apellido visible (opcional),
// RUT y edad apagados.
const GUEST_DEFAULTS: FormFieldsConfig = {
  lastName: { enabled: true, required: false },
  documentNumber: { enabled: false, required: false },
  age: { enabled: false, required: false },
};

/**
 * Config de campos de INVITADO del evento (registrationConfig.guests.formFields) + defaults.
 * @param registrationConfig Config de inscripción del evento; se lee `guests.formFields`.
 * @returns Config resuelta por cada campo de invitado. Un campo deshabilitado queda con
 *   `required: false`.
 */
export function getGuestFields(registrationConfig: any): FormFieldsConfig {
  const cfg = registrationConfig?.guests?.formFields || {};
  const out: FormFieldsConfig = {};
  for (const { key } of CONFIGURABLE_GUEST_FIELDS) {
    out[key] = {
      enabled: cfg[key]?.enabled ?? GUEST_DEFAULTS[key].enabled,
      required: (cfg[key]?.enabled ?? GUEST_DEFAULTS[key].enabled) ? (cfg[key]?.required ?? GUEST_DEFAULTS[key].required) : false,
    };
  }
  return out;
}

/**
 * Modo de declaración de invitados: `named` (nombres), `count` (solo cantidad) o
 * `companion` (acompañante + cargas).
 */
export type GuestMode = 'named' | 'count' | 'companion';

/**
 * Modo de declaración de invitados del evento (default 'named').
 * @param registrationConfig Config de inscripción del evento; se lee `guests.mode`.
 * @returns `'count'` o `'companion'` si están configurados; en cualquier otro caso `'named'`.
 */
export function getGuestMode(registrationConfig: any): GuestMode {
  const m = registrationConfig?.guests?.mode;
  return m === 'count' || m === 'companion' ? m : 'named';
}
