import * as XLSX from 'xlsx';

// Planilla que reproduce el "Evento de Prueba" en el formato del importador:
// modo con invitados por nombre + preferencia alimenticia. Lista para carga masiva.
const rows = [
  {
    'Nombre': 'Ana', 'Apellido': 'Torres', 'Correo': 'ana.torres@example.com', 'RUT': '11.111.111-1',
    'Teléfono': '+56911111111', 'Empresa': 'TechCorp', 'Cargo': 'Analista', 'Código SAP': '',
    'Preferencia alimenticia': '',
    'Cantidad de invitados': 0,
    'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '', 'Invitado 1: Preferencia alimenticia': '',
  },
  {
    'Nombre': 'Pedro', 'Apellido': 'Rojas', 'Correo': 'pedro.rojas@example.com', 'RUT': '22.222.222-2',
    'Teléfono': '+56922222222', 'Empresa': 'InnovateLtda', 'Cargo': 'Diseñador', 'Código SAP': '',
    'Preferencia alimenticia': 'Alergia: Maní y mariscos',
    'Cantidad de invitados': 1,
    'Invitado 1: Nombre': 'Rosa Rojas', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': 'ACOMPANANTE', 'Invitado 1: Preferencia alimenticia': 'Vegano',
  },
  {
    'Nombre': 'Sofía', 'Apellido': 'Díaz', 'Correo': 'sofia.diaz@example.com', 'RUT': '33.333.333-3',
    'Teléfono': '+56933333333', 'Empresa': 'GlobalSolutions', 'Cargo': 'Directora', 'Código SAP': '',
    'Preferencia alimenticia': 'Vegetariano',
    'Cantidad de invitados': 0,
    'Invitado 1: Nombre': '', 'Invitado 1: RUT': '', 'Invitado 1: Tipo': '', 'Invitado 1: Preferencia alimenticia': '',
  },
];

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Participantes');

const out = 'C:/Users/alba.martinez.CLINICAIMET/Desktop/planilla_evento_prueba.xlsx';
XLSX.writeFile(wb, out);
console.log('Planilla generada en: ' + out + ' (' + rows.length + ' participantes)');
