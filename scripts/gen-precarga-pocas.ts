import * as XLSX from 'xlsx';

// Precarga simple (pocas personas), SIN columnas de invitados.
// Solo el RUT es obligatorio: la fila 3 trae solo el RUT.
const rows = [
  { 'Nombre': 'Carla',    'Apellido': 'Rivas',  'Correo': 'carla.rivas@correo.cl',    'RUT': '16.842.377-9', 'Teléfono': '+56961112233', 'Empresa': 'ACME',    'Cargo': 'Coordinadora', 'Código SAP': 'SAP2001', 'Preferencia alimenticia': 'Vegetariano' },
  { 'Nombre': 'Diego',    'Apellido': 'Soto',   'Correo': 'diego.soto@correo.cl',     'RUT': '18.221.905-4', 'Teléfono': '',             'Empresa': 'Globex',  'Cargo': 'Analista',     'Código SAP': '',        'Preferencia alimenticia': '' },
  { 'Nombre': '',         'Apellido': '',       'Correo': '',                          'RUT': '15.432.118-2', 'Teléfono': '',             'Empresa': '',        'Cargo': '',             'Código SAP': '',        'Preferencia alimenticia': '' },
  { 'Nombre': 'Fernanda', 'Apellido': 'Lagos',  'Correo': 'fernanda.lagos@correo.cl', 'RUT': '19.077.643-1', 'Teléfono': '+56977445566', 'Empresa': 'Initech', 'Cargo': 'Jefa de RRHH', 'Código SAP': 'SAP2002', 'Preferencia alimenticia': 'Celíaco (sin gluten)' },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Precarga');

const out = 'C:/Users/alba.martinez.CLINICAIMET/Desktop/precarga_simple.xlsx';
XLSX.writeFile(wb, out);
console.log('Generado: ' + out + ' (' + rows.length + ' personas, sin columnas de invitados)');
