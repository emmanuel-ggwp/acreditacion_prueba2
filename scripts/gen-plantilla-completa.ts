import * as XLSX from 'xlsx';

// Plantilla COMPLETA para carga masiva / precarga (modo invitados con nombre).
// Muestra todas las columnas posibles. SOLO el RUT es obligatorio: la 2ª fila trae solo el RUT.
const rows = [
  {
    'Nombre': 'Juan', 'Apellido': 'Pérez', 'Correo': 'juan.perez@correo.cl', 'RUT': '12.345.678-9',
    'Teléfono': '+56912345678', 'Empresa': 'ACME', 'Cargo': 'Gerente', 'Código SAP': 'SAP001',
    'Preferencia alimenticia': 'Vegetariano',
    'Cantidad de invitados': 2,
    'Invitado 1: Nombre': 'Ana Pérez', 'Invitado 1: RUT': '11.111.111-1', 'Invitado 1: Tipo': 'CARGA', 'Invitado 1: Preferencia alimenticia': 'Vegano',
    'Invitado 2: Nombre': 'Luis Soto', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': 'ACOMPANANTE', 'Invitado 2: Preferencia alimenticia': '',
  },
  {
    // Fila mínima válida: SOLO el RUT (todo lo demás vacío).
    'Nombre': '', 'Apellido': '', 'Correo': '', 'RUT': '9.876.543-2',
    'Teléfono': '', 'Empresa': '', 'Cargo': '', 'Código SAP': '',
    'Preferencia alimenticia': '',
    'Cantidad de invitados': '',
    'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '', 'Invitado 1: Preferencia alimenticia': '',
    'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '', 'Invitado 2: Preferencia alimenticia': '',
  },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Participantes');

const out = 'C:/Users/alba.martinez.CLINICAIMET/Desktop/plantilla_completa_solo_rut.xlsx';
XLSX.writeFile(wb, out);
console.log('Plantilla generada en: ' + out);
