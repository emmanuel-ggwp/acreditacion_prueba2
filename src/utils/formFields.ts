// Campos opcionales configurables por evento para el formulario de inscripción.
// Nombre, Apellido y Correo siempre se piden (no son configurables).

export interface FieldDef { key: string; label: string }

export const CONFIGURABLE_FIELDS: FieldDef[] = [
  { key: 'email', label: 'Correo' },
  { key: 'phone', label: 'Teléfono' },
  { key: 'documentNumber', label: 'RUT / Documento' },
  { key: 'company', label: 'Empresa' },
  { key: 'position', label: 'Cargo' },
  { key: 'numeroSap', label: 'Código SAP' },
  { key: 'dietary', label: 'Preferencia alimenticia' },
];

export interface FieldConfig { enabled: boolean; required: boolean }
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

/** Devuelve la config de campos del evento mezclada con los defaults. */
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

/** ¿Se pide preferencia alimenticia a cada invitado? (solo modo 'named') */
export function guestDietaryEnabled(registrationConfig: any): boolean {
  return getGuestMode(registrationConfig) === 'named' && !!registrationConfig?.guests?.dietary;
}

// Campos configurables por evento para cada INVITADO (modo 'named'). El NOMBRE siempre
// se pide (identifica al invitado); esto controla apellido, RUT y edad.
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

/** Config de campos de INVITADO del evento (registrationConfig.guests.formFields) + defaults. */
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

export type GuestMode = 'named' | 'count' | 'companion';

/** Modo de declaración de invitados del evento (default 'named'). */
export function getGuestMode(registrationConfig: any): GuestMode {
  const m = registrationConfig?.guests?.mode;
  return m === 'count' || m === 'companion' ? m : 'named';
}
