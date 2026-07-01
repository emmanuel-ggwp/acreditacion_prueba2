// Campos opcionales configurables por evento para el formulario de inscripción.
// Nombre, Apellido y Correo siempre se piden (no son configurables).

export interface FieldDef { key: string; label: string }

export const CONFIGURABLE_FIELDS: FieldDef[] = [
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
const DEFAULTS: FormFieldsConfig = {
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

/** ¿Se pide preferencia alimenticia a cada invitado? */
export function guestDietaryEnabled(registrationConfig: any): boolean {
  return !!registrationConfig?.guests?.dietary;
}
