import * as XLSX from 'xlsx';

// Calcula el dígito verificador (módulo 11) para producir RUT chilenos VÁLIDOS.
const dv = (body: string): string => {
  let sum = 0, mult = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i], 10) * mult;
    mult = mult === 7 ? 2 : mult + 1;
  }
  const r = 11 - (sum % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
};
const fmt = (body: string): string => {
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${withDots}-${dv(body)}`;
};

const people = [
  { body: '15234876', Nombre: 'Carla',    Apellido: 'Rivas',  Correo: 'carla.rivas@correo.cl',    Empresa: 'ACME',    Cargo: 'Coordinadora',  SAP: 'SAP2001', diet: 'Vegetariano' },
  { body: '18221905', Nombre: 'Diego',    Apellido: 'Soto',   Correo: 'diego.soto@correo.cl',     Empresa: 'Globex',  Cargo: 'Analista',      SAP: '',        diet: '' },
  { body: '16842377', Nombre: '',         Apellido: '',       Correo: '',                          Empresa: '',        Cargo: '',              SAP: '',        diet: '' },
  { body: '19077643', Nombre: 'Fernanda', Apellido: 'Lagos',  Correo: 'fernanda.lagos@correo.cl', Empresa: 'Initech', Cargo: 'Jefa de RRHH',  SAP: 'SAP2002', diet: 'Celíaco (sin gluten)' },
  { body: '20345128', Nombre: 'Tomás',    Apellido: 'Vera',   Correo: 'tomas.vera@correo.cl',     Empresa: 'Hooli',   Cargo: 'Ingeniero',     SAP: 'SAP2003', diet: '' },
];

const rows = people.map((p) => ({
  'Nombre': p.Nombre, 'Apellido': p.Apellido, 'Correo': p.Correo, 'RUT': fmt(p.body),
  'Teléfono': '', 'Empresa': p.Empresa, 'Cargo': p.Cargo, 'Código SAP': p.SAP, 'Preferencia alimenticia': p.diet,
}));

const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Precarga');
const out = 'C:/Users/alba.martinez.CLINICAIMET/Desktop/precarga_rut_validos.xlsx';
XLSX.writeFile(wb, out);
console.log('Generado: ' + out);
rows.forEach((r) => console.log('  ' + (r.RUT) + '  ' + (r.Nombre || '(solo RUT)')));
