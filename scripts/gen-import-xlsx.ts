import * as XLSX from 'xlsx';

// Genera un Excel de prueba para la carga (precarga) de participantes.
// Columnas con los encabezados que el importador detecta automáticamente.
const rows = [
  { 'Nombre': 'Camila',  'Apellido': 'Fuentes',  'Correo': 'camila.fuentes@correo.cl',  'RUT': '15.234.876-4', 'Teléfono': '+56911100001', 'Empresa': 'ACME',            'Cargo': 'Gerente',      'Código SAP': 'SAP1001', 'Cantidad de invitados': 2, 'Invitado 1: Nombre': 'Diego Fuentes', 'Invitado 1: RUT': '20.111.222-3', 'Invitado 1: Tipo': 'CARGA', 'Invitado 2: Nombre': 'Rosa Fuentes', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': 'ACOMPANANTE' },
  { 'Nombre': 'Matías',  'Apellido': 'Contreras', 'Correo': 'matias.contreras@correo.cl','RUT': '16.789.012-5', 'Teléfono': '+56911100002', 'Empresa': 'Globex',          'Cargo': 'Analista',     'Código SAP': 'SAP1002', 'Cantidad de invitados': 0, 'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '', 'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '' },
  { 'Nombre': 'Valentina','Apellido': 'Muñoz',    'Correo': 'valentina.munoz@correo.cl', 'RUT': '17.345.678-9', 'Teléfono': '+56911100003', 'Empresa': 'Initech',         'Cargo': 'Coordinadora', 'Código SAP': 'SAP1003', 'Cantidad de invitados': 1, 'Invitado 1: Nombre': 'Pablo Muñoz', 'Invitado 1: RUT': '21.222.333-4', 'Invitado 1: Tipo': 'ACOMPANANTE', 'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '' },
  { 'Nombre': 'Sebastián','Apellido': 'Reyes',    'Correo': 'sebastian.reyes@correo.cl', 'RUT': '18.456.789-0', 'Teléfono': '+56911100004', 'Empresa': 'Umbrella',        'Cargo': 'Ingeniero',    'Código SAP': 'SAP1004', 'Cantidad de invitados': 0, 'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '', 'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '' },
  { 'Nombre': 'Francisca','Apellido': 'Vega',     'Correo': 'francisca.vega@correo.cl',  'RUT': '19.567.890-1', 'Teléfono': '+56911100005', 'Empresa': 'Soylent',         'Cargo': 'Directora',    'Código SAP': 'SAP1005', 'Cantidad de invitados': 2, 'Invitado 1: Nombre': 'Tomás Vega', 'Invitado 1: RUT': '22.333.444-5', 'Invitado 1: Tipo': 'CARGA', 'Invitado 2: Nombre': 'Ema Vega', 'Invitado 2: RUT': '23.444.555-6', 'Invitado 2: Tipo': 'CARGA' },
  { 'Nombre': 'Ignacio', 'Apellido': 'Salazar',   'Correo': 'ignacio.salazar@correo.cl', 'RUT': '20.678.901-2', 'Teléfono': '+56911100006', 'Empresa': 'Hooli',           'Cargo': 'Consultor',    'Código SAP': 'SAP1006', 'Cantidad de invitados': 0, 'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '', 'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '' },
  { 'Nombre': 'Josefa',  'Apellido': 'Castro',     'Correo': 'josefa.castro@correo.cl',   'RUT': '13.789.456-7', 'Teléfono': '+56911100007', 'Empresa': 'Vehement',        'Cargo': 'Diseñadora',   'Código SAP': 'SAP1007', 'Cantidad de invitados': 1, 'Invitado 1: Nombre': 'Luis Castro', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': 'ACOMPANANTE', 'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '' },
  { 'Nombre': 'Benjamín','Apellido': 'Herrera',    'Correo': 'benjamin.herrera@correo.cl','RUT': '14.890.567-8', 'Teléfono': '+56911100008', 'Empresa': 'Massive Dynamic','Cargo': 'Jefe de Proyecto','Código SAP': 'SAP1008', 'Cantidad de invitados': 0, 'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '', 'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '' },
  { 'Nombre': 'Antonia', 'Apellido': 'Rojas',      'Correo': 'antonia.rojas@correo.cl',   'RUT': '15.901.678-9', 'Teléfono': '+56911100009', 'Empresa': 'Stark Ind.',      'Cargo': 'Analista',     'Código SAP': 'SAP1009', 'Cantidad de invitados': 0, 'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '', 'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '' },
  { 'Nombre': 'Vicente', 'Apellido': 'Aguilar',    'Correo': 'vicente.aguilar@correo.cl', 'RUT': '16.012.789-0', 'Teléfono': '+56911100010', 'Empresa': 'Wayne Ent.',      'Cargo': 'Operaciones',  'Código SAP': 'SAP1010', 'Cantidad de invitados': 1, 'Invitado 1: Nombre': 'Sara Aguilar', 'Invitado 1: RUT': '24.555.666-7', 'Invitado 1: Tipo': 'CARGA', 'Invitado 2: Nombre': '', 'Invitado 2: RUT': '', 'Invitado 2: Tipo': '' },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Participantes');

const out = 'C:/Users/alba.martinez.CLINICAIMET/Desktop/participantes_precarga_prueba.xlsx';
XLSX.writeFile(wb, out);
console.log('Excel generado en: ' + out + ' (' + rows.length + ' participantes)');
