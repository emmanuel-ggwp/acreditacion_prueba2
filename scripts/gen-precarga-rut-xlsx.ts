import * as XLSX from 'xlsx';

// Plantilla de PRECARGA por RUT: participantes que se cargan antes de las inscripciones.
// Se importan SIN asignar fecha (opción "dejar como precargados"); luego, en una landing
// en modo RUT, solo estos RUT podrán inscribirse.
const rows = [
  { 'Nombre': 'Camila',   'Apellido': 'Fuentes',   'Correo': 'camila.fuentes@correo.cl',   'RUT': '15.234.876-4', 'Empresa': 'ACME',          'Cargo': 'Gerente',   'Código SAP': 'SAP1001' },
  { 'Nombre': 'Matías',   'Apellido': 'Contreras', 'Correo': 'matias.contreras@correo.cl', 'RUT': '16.789.012-5', 'Empresa': 'Globex',        'Cargo': 'Analista',  'Código SAP': 'SAP1002' },
  { 'Nombre': 'Valentina','Apellido': 'Muñoz',     'Correo': 'valentina.munoz@correo.cl',  'RUT': '17.345.678-9', 'Empresa': 'Initech',       'Cargo': 'Coordinadora', 'Código SAP': 'SAP1003' },
  { 'Nombre': 'Sebastián','Apellido': 'Reyes',     'Correo': 'sebastian.reyes@correo.cl',  'RUT': '18.456.789-0', 'Empresa': 'Umbrella',      'Cargo': 'Ingeniero', 'Código SAP': 'SAP1004' },
  { 'Nombre': 'Francisca','Apellido': 'Vega',      'Correo': 'francisca.vega@correo.cl',   'RUT': '19.567.890-1', 'Empresa': 'Soylent',       'Cargo': 'Directora', 'Código SAP': 'SAP1005' },
  { 'Nombre': 'Ignacio',  'Apellido': 'Salazar',   'Correo': 'ignacio.salazar@correo.cl',  'RUT': '20.678.901-2', 'Empresa': 'Hooli',         'Cargo': 'Consultor', 'Código SAP': 'SAP1006' },
  { 'Nombre': 'Josefa',   'Apellido': 'Castro',    'Correo': 'josefa.castro@correo.cl',    'RUT': '13.789.456-7', 'Empresa': 'Vehement',      'Cargo': 'Diseñadora','Código SAP': 'SAP1007' },
  { 'Nombre': 'Benjamín', 'Apellido': 'Herrera',   'Correo': 'benjamin.herrera@correo.cl', 'RUT': '14.890.567-8', 'Empresa': 'Massive Dyn.',  'Cargo': 'Jefe',      'Código SAP': 'SAP1008' },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Precarga');

const out = 'C:/Users/alba.martinez.CLINICAIMET/Desktop/plantilla_precarga_rut.xlsx';
XLSX.writeFile(wb, out);
console.log('Plantilla generada en: ' + out + ' (' + rows.length + ' participantes)');
