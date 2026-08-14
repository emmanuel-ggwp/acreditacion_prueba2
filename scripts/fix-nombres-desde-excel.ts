import 'dotenv/config';
import * as XLSX from 'xlsx';
import { Op, fn, col, where as sqlWhere } from 'sequelize';
import { sequelize } from '../src/lib/sequelize';
import { Participant, Accreditation, Guest } from '../src/models/index';
import { cleanRut, isValidRut, normalizeRut } from '../src/utils/validators/rut';
import { isJunkGuestName } from '../src/utils/guestNames';

/**
 * Repara una carga dañada por el bug del importador ("Nombre invitado" se mapeaba a
 * Nombre y sobrescribía el nombre real del titular — caso "Karen Swaneck Diaz
 * Figueroa Cortes"). Matcheando por RUT normalizado (sin puntos, guion ni espacios):
 *
 *  1. NOMBRES: restaura nombre y apellido desde el Excel. Los ya acreditados o con
 *     marca de premiado quedan protegidos (no se les toca el nombre).
 *  2. INVITADOS: si el Excel trae columna de invitado ("Nombre invitado"), agrega el
 *     invitado SOLO si el titular no tiene ya uno con ese nombre (coincidencia por
 *     nombre, sin distinguir mayúsculas). Descarta valores basura ("Si", "No llevo
 *     acompañante", números, etc.). El nombre completo del invitado queda en
 *     firstName, igual que hace el importador.
 *
 * Idempotente: correr dos veces no duplica nada. No toca ningún otro campo.
 *
 * Uso:
 *   npx tsx scripts/fix-nombres-desde-excel.ts <archivo.xlsx> <eventId>           (solo muestra)
 *   npx tsx scripts/fix-nombres-desde-excel.ts <archivo.xlsx> <eventId> --apply   (aplica)
 */

const normalizedRutCol = fn(
  'UPPER',
  fn('REPLACE', fn('REPLACE', fn('REPLACE', col('document_number'), '.', ''), '-', ''), ' ', '')
);

// Busca la columna del Excel por nombre, sin importar mayúsculas/espacios.
const findKey = (keys: string[], re: RegExp) => keys.find((k) => re.test(k.toLowerCase().trim()));
const clean = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ');

// El filtro de valores basura ("Si", "No llevo acompañante"...) es el mismo que
// usa el importador web: src/utils/guestNames.ts.

const run = async () => {
  const [file, eventId, applyFlag] = process.argv.slice(2);
  if (!file || !eventId) {
    console.error('Uso: npx tsx scripts/fix-nombres-desde-excel.ts <archivo.xlsx> <eventId> [--apply]');
    process.exit(1);
  }
  const apply = applyFlag === '--apply';

  const wb = XLSX.readFile(file);
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  if (!rows.length) { console.error('El archivo está vacío.'); process.exit(1); }

  const keys = Object.keys(rows[0]);
  // "nombre" pero NO "nombre invitado"; "apellido"; "rut" pero NO "rut invitado".
  const kNombre = findKey(keys, /^nombre(?!.*(invitad|acompa))/);
  const kApellido = findKey(keys, /^apellido/);
  const kRut = findKey(keys, /^rut(?!.*(invitad|acompa))|^documento(?!.*(invitad|acompa))/);
  // Columnas del invitado: "Nombre invitado" y "documento Invitado" (si existen).
  const kGuestName = findKey(keys, /(nombre.*(invitad|acompa))|((invitad|acompa).*nombre)/);
  const kGuestDoc = findKey(keys, /((documento|rut|dni).*(invitad|acompa))|((invitad|acompa).*(documento|rut|dni))/);
  if (!kNombre || !kRut) {
    console.error(`No encontré las columnas de nombre y RUT. Encabezados: ${keys.join(' | ')}`);
    process.exit(1);
  }
  console.log(`Columnas: nombre="${kNombre}" apellido="${kApellido || '(no hay)'}" rut="${kRut}" invitado="${kGuestName || '(no hay)'}" doc. invitado="${kGuestDoc || '(no hay)'}"`);
  console.log(apply ? 'MODO APLICAR: se guardarán los cambios.\n' : 'MODO SIMULACIÓN: no se guarda nada (agrega --apply para aplicar).\n');

  await sequelize.authenticate();

  let corregidos = 0, yaOk = 0, sinMatch = 0, sinRut = 0, protegidos = 0;
  let invAgregados = 0, invYaExisten = 0, invDescartados = 0;
  for (const row of rows) {
    const normRut = cleanRut(String(row[kRut] ?? ''));
    if (normRut.length < 2) { sinRut++; continue; }
    const nombre = clean(row[kNombre]);
    const apellido = kApellido ? clean(row[kApellido]) : '';

    const p: any = await Participant.findOne({
      where: { eventId, [Op.and]: [sqlWhere(normalizedRutCol, normRut)] } as any,
    });
    if (!p) { sinMatch++; continue; }

    // ── 1. Nombres ──────────────────────────────────────────────────────────
    const cambios: string[] = [];
    if (nombre && clean(p.firstName) !== nombre) cambios.push(`nombre: "${p.firstName}" → "${nombre}"`);
    if (apellido && clean(p.lastName) !== apellido) cambios.push(`apellido: "${p.lastName}" → "${apellido}"`);
    if (!cambios.length) {
      yaOk++;
    } else {
      // Protección: los ya acreditados o con marca de premiado no se tocan (su
      // identidad ya se usó en puerta o en la premiación).
      const isProtected = !!p.isAwarded || (await Accreditation.count({ where: { participantId: p.id } })) > 0;
      if (isProtected) {
        console.log(`RUT ${normRut} · PROTEGIDO (acreditado/premiado) — no se toca (${cambios.join(' · ')})`);
        protegidos++;
      } else {
        console.log(`RUT ${normRut} · ${cambios.join(' · ')}`);
        if (apply) {
          await p.update({ ...(nombre ? { firstName: nombre } : {}), ...(apellido ? { lastName: apellido } : {}) });
        }
        corregidos++;
      }
    }

    // ── 2. Invitado (si el Excel trae la columna) ───────────────────────────
    // Se agrega SOLO si el titular no tiene ya un invitado con ese nombre. Los
    // invitados se agregan aunque el titular esté acreditado: son aditivos y no
    // tocan su identidad (su acompañante aún puede llegar a acreditarse).
    if (kGuestName) {
      const gName = clean(row[kGuestName]);
      if (gName && isJunkGuestName(gName)) {
        invDescartados++;
      } else if (gName) {
        const existing = await Guest.findOne({
          where: { participantId: p.id, firstName: { [Op.iLike]: gName } },
        });
        if (existing) {
          invYaExisten++;
        } else {
          const gDocRaw = kGuestDoc ? clean(row[kGuestDoc]) : '';
          const gDoc = gDocRaw ? (isValidRut(gDocRaw) ? normalizeRut(gDocRaw) : gDocRaw) : null;
          console.log(`RUT ${normRut} · invitado ${apply ? 'agregado' : 'a agregar'}: "${gName}"${gDoc ? ` (doc: ${gDoc})` : ''}`);
          if (apply) {
            await Guest.create({
              participantId: p.id,
              firstName: gName,
              documentNumber: gDoc,
              confirmed: false,
              // Reparación de una carga del organizador: no consume cupo (D1.2).
              registrationSource: 'IMPORT',
            } as any);
          }
          invAgregados++;
        }
      }
    }
  }

  console.log(`\nResumen nombres: ${corregidos} ${apply ? 'corregidos' : 'por corregir'} · ${protegidos} protegidos (acreditados/premiados) · ${yaOk} ya correctos · ${sinMatch} sin match en el evento · ${sinRut} filas sin RUT.`);
  if (kGuestName) {
    console.log(`Resumen invitados: ${invAgregados} ${apply ? 'agregados' : 'por agregar'} · ${invYaExisten} ya existían (mismo nombre) · ${invDescartados} descartados (valores tipo "Si"/"No llevo acompañante").`);
  }
  process.exit(0);
};

run().catch((e) => { console.error('Falló el script:', e); process.exit(1); });
