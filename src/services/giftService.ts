/**
 * Servicio de campañas de regalos (GiftService).
 *
 * Gestiona campañas de regalos y sus entidades relacionadas: tipos de regalo,
 * empleados beneficiarios y entregas. Modela cuántos regalos corresponden a cada
 * empleado según la "base" (`basis`) del tipo:
 * - `FAMILY`: 1 por empleado.
 * - `CHILD`: uno por cada carga que sea hijo (`cargasHijos`).
 * - `CARGA`: uno por cada carga (`cargas`).
 *
 * Reglas de negocio clave:
 * - Los borrados de campaña, tipo y empleado usan transacciones y borran en
 *   cascada las `GiftDelivery` asociadas (que no son paranoid y no tenían
 *   `onDelete`) para no dejar entregas colgando.
 * - `setDelivery` valida que empleado y tipo sean de la MISMA campaña y topa la
 *   cantidad entregada al total que corresponde por `basis`.
 */
import { GiftCampaign, GiftType, GiftEmployee, GiftDelivery } from '@/models/index';
import { sequelize } from '@/lib/sequelize';
import { Op } from 'sequelize';

/** Base de cálculo de un tipo de regalo: por familia, por hijo o por carga. */
type Basis = 'FAMILY' | 'CHILD' | 'CARGA';

// Cuántos regalos de un tipo le corresponden a un empleado.
/**
 * Calcula cuántos regalos de un tipo (según su `basis`) le corresponden a un empleado.
 *
 * @param basis - Base del tipo de regalo: `'CHILD'`, `'CARGA'` o `'FAMILY'`.
 * @param emp - Empleado con sus contadores `cargas` y `cargasHijos`.
 * @returns El total de regalos correspondientes: `cargasHijos` para `CHILD`, `cargas` para `CARGA`, y `1` para `FAMILY`.
 */
function totalFor(basis: Basis, emp: { cargas: number; cargasHijos: number }): number {
  if (basis === 'CHILD') return emp.cargasHijos || 0;
  if (basis === 'CARGA') return emp.cargas || 0;
  return 1; // FAMILY
}

/**
 * Encapsula el CRUD y la lógica de negocio de campañas de regalos, tipos, empleados y entregas.
 */
export class GiftService {
  // ---- Campañas ----
  /**
   * Lista todas las campañas de regalos, de la más reciente a la más antigua.
   *
   * @returns Promesa que resuelve al arreglo de campañas (`GiftCampaign[]`) ordenado por `createdAt` descendente.
   */
  async listCampaigns() {
    return GiftCampaign.findAll({ order: [['createdAt', 'DESC']] });
  }
  /**
   * Crea una campaña y le agrega dos tipos de regalo por defecto.
   *
   * Tras crear la campaña, inserta con `bulkCreate` los tipos "Caja familiar"
   * (`FAMILY`) y "Regalo hijo" (`CHILD`), configurables posteriormente.
   *
   * @param name - Nombre de la campaña a crear.
   * @returns Promesa que resuelve a la campaña creada (`GiftCampaign`).
   */
  async createCampaign(name: string) {
    const c = await GiftCampaign.create({ name } as any);
    // Tipos por defecto (configurables luego)
    await GiftType.bulkCreate([
      { campaignId: c.id, name: 'Caja familiar', basis: 'FAMILY', order: 0 } as any,
      { campaignId: c.id, name: 'Regalo hijo', basis: 'CHILD', order: 1 } as any,
    ]);
    return c;
  }
  /**
   * Obtiene una campaña por su identificador.
   *
   * @param id - Identificador (PK) de la campaña.
   * @returns Promesa que resuelve a la campaña (`GiftCampaign`), o `null` si no existe.
   */
  async getCampaign(id: string) {
    return GiftCampaign.findByPk(id);
  }
  /**
   * Actualiza el nombre y/o el estado activo de una campaña.
   *
   * Cada campo se conserva si no viene en `data` (fallback al valor actual).
   *
   * @param id - Identificador (PK) de la campaña a actualizar.
   * @param data - Datos parciales: `name` y/o `isActive`.
   * @returns Promesa que resuelve a la campaña actualizada (`GiftCampaign`).
   * @throws {Error} `'Campaña no encontrada'` si no existe una campaña con ese `id`.
   */
  async updateCampaign(id: string, data: any) {
    const c = await GiftCampaign.findByPk(id);
    if (!c) throw new Error('Campaña no encontrada');
    await c.update({ name: data.name ?? c.name, isActive: data.isActive ?? c.isActive });
    return c;
  }
  /**
   * Elimina una campaña y, en cascada dentro de una transacción, sus tipos, empleados y entregas.
   *
   * Recupera los tipos y empleados de la campaña (incluidos los de borrado lógico,
   * `paranoid: false`) y borra de forma forzada (`force: true`) las `GiftDelivery`
   * asociadas, luego los tipos, los empleados y la campaña. Todo ocurre en una
   * transacción que se revierte (`rollback`) ante cualquier error.
   *
   * @param id - Identificador (PK) de la campaña a eliminar.
   * @returns Promesa que resuelve a `{ ok: true }` si la eliminación en cascada tuvo éxito.
   * @throws {Error} `'Campaña no encontrada'` si no existe una campaña con ese `id`.
   * @throws {Error} Cualquier error de base de datos ocurrido dentro de la transacción, que se relanza tras el `rollback`.
   */
  async deleteCampaign(id: string) {
    const c = await GiftCampaign.findByPk(id);
    if (!c) throw new Error('Campaña no encontrada');
    // Cascada en transacción: sin esto quedaban tipos, empleados y entregas colgando de
    // una campaña "eliminada" (GiftDelivery no es paranoid y no había onDelete).
    const tx = await sequelize.transaction();
    try {
      const [types, employees] = await Promise.all([
        GiftType.findAll({ where: { campaignId: id }, attributes: ['id'], transaction: tx, paranoid: false }),
        GiftEmployee.findAll({ where: { campaignId: id }, attributes: ['id'], transaction: tx, paranoid: false }),
      ]);
      const typeIds = types.map((t: any) => t.id);
      const empIds = employees.map((e: any) => e.id);
      const orConds: any[] = [];
      if (typeIds.length) orConds.push({ giftTypeId: { [Op.in]: typeIds } });
      if (empIds.length) orConds.push({ employeeId: { [Op.in]: empIds } });
      if (orConds.length) await GiftDelivery.destroy({ where: { [Op.or]: orConds }, force: true, transaction: tx });
      await GiftType.destroy({ where: { campaignId: id }, force: true, transaction: tx });
      await GiftEmployee.destroy({ where: { campaignId: id }, force: true, transaction: tx });
      await c.destroy({ force: true, transaction: tx });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    return { ok: true };
  }

  // ---- Tipos de regalo ----
  /**
   * Lista los tipos de regalo de una campaña, ordenados por `order` y luego por antigüedad.
   *
   * @param campaignId - Identificador de la campaña cuyos tipos se listan.
   * @returns Promesa que resuelve al arreglo de tipos (`GiftType[]`) ordenado por `order` ascendente y `createdAt` ascendente.
   */
  async listTypes(campaignId: string) {
    return GiftType.findAll({ where: { campaignId }, order: [['order', 'ASC'], ['createdAt', 'ASC']] });
  }
  /**
   * Crea un tipo de regalo dentro de una campaña.
   *
   * Exige nombre; si `basis` no es uno de `FAMILY`/`CHILD`/`CARGA` se usa `FAMILY`,
   * y `order` se convierte a número (0 por defecto).
   *
   * @param campaignId - Identificador de la campaña a la que pertenece el tipo.
   * @param data - Datos del tipo: `name` (obligatorio), `basis` y `order` (opcionales).
   * @returns Promesa que resuelve al tipo de regalo creado (`GiftType`).
   * @throws {Error} `'El nombre del tipo es obligatorio'` si falta `data.name`.
   */
  async createType(campaignId: string, data: any) {
    if (!data?.name) throw new Error('El nombre del tipo es obligatorio');
    const basis: Basis = ['FAMILY', 'CHILD', 'CARGA'].includes(data.basis) ? data.basis : 'FAMILY';
    return GiftType.create({ campaignId, name: data.name, basis, order: Number(data.order) || 0 } as any);
  }
  /**
   * Actualiza nombre, base y/o orden de un tipo de regalo.
   *
   * Cada campo se conserva si no viene en `data` (fallback al valor actual).
   *
   * @param id - Identificador (PK) del tipo de regalo a actualizar.
   * @param data - Datos parciales: `name`, `basis` y/o `order`.
   * @returns Promesa que resuelve al tipo actualizado (`GiftType`).
   * @throws {Error} `'Tipo de regalo no encontrado'` si no existe un tipo con ese `id`.
   */
  async updateType(id: string, data: any) {
    const t = await GiftType.findByPk(id);
    if (!t) throw new Error('Tipo de regalo no encontrado');
    await t.update({ name: data.name ?? t.name, basis: data.basis ?? t.basis, order: data.order ?? t.order });
    return t;
  }
  /**
   * Elimina un tipo de regalo y, en cascada dentro de una transacción, sus entregas.
   *
   * Borra primero de forma forzada (`force: true`) las `GiftDelivery` de ese tipo
   * y luego el tipo; todo en una transacción que se revierte ante cualquier error.
   *
   * @param id - Identificador (PK) del tipo de regalo a eliminar.
   * @returns Promesa que resuelve a `{ ok: true }` si la eliminación en cascada tuvo éxito.
   * @throws {Error} `'Tipo de regalo no encontrado'` si no existe un tipo con ese `id`.
   * @throws {Error} Cualquier error de base de datos ocurrido dentro de la transacción, que se relanza tras el `rollback`.
   */
  async deleteType(id: string) {
    const t = await GiftType.findByPk(id);
    if (!t) throw new Error('Tipo de regalo no encontrado');
    // Borrar primero sus entregas (no dejar GiftDelivery colgando).
    const tx = await sequelize.transaction();
    try {
      await GiftDelivery.destroy({ where: { giftTypeId: id }, force: true, transaction: tx });
      await t.destroy({ transaction: tx });
      await tx.commit();
    } catch (e) {
      await tx.rollback();
      throw e;
    }
    return { ok: true };
  }

  // ---- Empleados ----
  /**
   * Lista los empleados de una campaña con el estado de sus regalos por tipo.
   *
   * Para cada empleado calcula, por cada tipo de la campaña, el total que le
   * corresponde (`totalFor`), la cantidad entregada y un estado derivado:
   * `'NA'` (total 0), `'DELIVERED'` (entregado ≥ total), `'PARTIAL'` (algo
   * entregado) o `'PENDING'` (nada entregado). La colección cruda `deliveries`
   * se elimina del resultado y se reemplaza por el arreglo `gifts`.
   *
   * @param campaignId - Identificador de la campaña cuyos empleados se listan.
   * @returns Promesa que resuelve al arreglo de empleados (objetos planos) ordenados por `fullName`, cada uno con un campo `gifts` (`{ typeId, name, basis, total, delivered, status }`).
   */
  async listEmployees(campaignId: string) {
    const employees = await GiftEmployee.findAll({
      where: { campaignId },
      include: [{ model: GiftDelivery, as: 'deliveries' }],
      order: [['fullName', 'ASC']],
    });
    const types = await this.listTypes(campaignId);
    return employees.map((e) => {
      const ep: any = e.get({ plain: true });
      const dmap = new Map<string, number>((ep.deliveries || []).map((d: any) => [d.giftTypeId, d.deliveredQty]));
      const gifts = types.map((t) => {
        const total = totalFor(t.basis, ep);
        const delivered = dmap.get(t.id) || 0;
        const status = total === 0 ? 'NA' : delivered >= total ? 'DELIVERED' : delivered > 0 ? 'PARTIAL' : 'PENDING';
        return { typeId: t.id, name: t.name, basis: t.basis, total, delivered, status };
      });
      delete ep.deliveries;
      return { ...ep, gifts };
    });
  }
  /**
   * Crea un empleado beneficiario dentro de una campaña.
   *
   * Exige nombre completo; `cargas` y `cargasHijos` se convierten a número (0 por
   * defecto) y `rut`/`empresa` quedan en `null` si no se indican.
   *
   * @param campaignId - Identificador de la campaña a la que pertenece el empleado.
   * @param data - Datos del empleado: `fullName` (obligatorio), `rut`, `empresa`, `cargas`, `cargasHijos`.
   * @param source - Origen del alta: `'IMPORT'` o `'MANUAL'` (por defecto `'MANUAL'`).
   * @returns Promesa que resuelve al empleado creado (`GiftEmployee`).
   * @throws {Error} `'El nombre del empleado es obligatorio'` si falta `data.fullName`.
   */
  async createEmployee(campaignId: string, data: any, source: 'IMPORT' | 'MANUAL' = 'MANUAL') {
    if (!data?.fullName) throw new Error('El nombre del empleado es obligatorio');
    return GiftEmployee.create({
      campaignId,
      fullName: data.fullName,
      rut: data.rut || null,
      empresa: data.empresa || null,
      cargas: Number(data.cargas) || 0,
      cargasHijos: Number(data.cargasHijos) || 0,
      source,
    } as any);
  }
  /**
   * Actualiza los datos de un empleado de forma parcial.
   *
   * Cada campo se conserva si no viene en `data`; `cargas` y `cargasHijos`, cuando
   * se envían, se convierten a número (0 si no es numérico).
   *
   * @param id - Identificador (PK) del empleado a actualizar.
   * @param data - Datos parciales: `fullName`, `rut`, `empresa`, `cargas`, `cargasHijos`.
   * @returns Promesa que resuelve al empleado actualizado (`GiftEmployee`).
   * @throws {Error} `'Empleado no encontrado'` si no existe un empleado con ese `id`.
   */
  async updateEmployee(id: string, data: any) {
    const e = await GiftEmployee.findByPk(id);
    if (!e) throw new Error('Empleado no encontrado');
    await e.update({
      fullName: data.fullName ?? e.fullName,
      rut: data.rut ?? e.rut,
      empresa: data.empresa ?? e.empresa,
      cargas: data.cargas !== undefined ? Number(data.cargas) || 0 : e.cargas,
      cargasHijos: data.cargasHijos !== undefined ? Number(data.cargasHijos) || 0 : e.cargasHijos,
    });
    return e;
  }
  /**
   * Elimina un empleado y, en cascada dentro de una transacción, sus entregas.
   *
   * Borra primero de forma forzada (`force: true`) las `GiftDelivery` del empleado
   * y luego el empleado; todo en una transacción que se revierte ante cualquier error.
   *
   * @param id - Identificador (PK) del empleado a eliminar.
   * @returns Promesa que resuelve a `{ ok: true }` si la eliminación en cascada tuvo éxito.
   * @throws {Error} `'Empleado no encontrado'` si no existe un empleado con ese `id`.
   * @throws {Error} Cualquier error de base de datos ocurrido dentro de la transacción, que se relanza tras el `rollback`.
   */
  async deleteEmployee(id: string) {
    const e = await GiftEmployee.findByPk(id);
    if (!e) throw new Error('Empleado no encontrado');
    // Borrar primero sus entregas (no dejar GiftDelivery colgando de un empleado oculto).
    const tx = await sequelize.transaction();
    try {
      await GiftDelivery.destroy({ where: { employeeId: id }, force: true, transaction: tx });
      await e.destroy({ transaction: tx });
      await tx.commit();
    } catch (err) {
      await tx.rollback();
      throw err;
    }
    return { ok: true };
  }

  /**
   * Importa (crea o actualiza) empleados de una campaña a partir de filas de datos.
   *
   * Procesa fila a fila: si la fila trae `rut` y ya existe un empleado con ese RUT
   * en la campaña, lo actualiza; en caso contrario crea uno nuevo con `source: 'IMPORT'`.
   * Los errores por fila se acumulan (indexados en base 1) en lugar de abortar todo
   * el proceso; no usa transacción global.
   *
   * @param campaignId - Identificador de la campaña destino de la importación.
   * @param rows - Arreglo de filas; cada una con `fullName` (obligatorio), `rut`, `empresa`, `cargas`, `cargasHijos`.
   * @returns Promesa que resuelve a `{ created, updated, errors }`, donde `errors` es un arreglo de `{ row, error }` (una fila sin `fullName` produce `'Falta el nombre del empleado'`).
   */
  async importEmployees(campaignId: string, rows: any[]) {
    const results = { created: 0, updated: 0, errors: [] as { row: number; error: string }[] };
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i] || {};
      try {
        if (!r.fullName) throw new Error('Falta el nombre del empleado');
        let existing = null as any;
        if (r.rut) existing = await GiftEmployee.findOne({ where: { campaignId, rut: r.rut } });
        if (existing) {
          await existing.update({ fullName: r.fullName, empresa: r.empresa || null, cargas: Number(r.cargas) || 0, cargasHijos: Number(r.cargasHijos) || 0 });
          results.updated++;
        } else {
          await GiftEmployee.create({ campaignId, fullName: r.fullName, rut: r.rut || null, empresa: r.empresa || null, cargas: Number(r.cargas) || 0, cargasHijos: Number(r.cargasHijos) || 0, source: 'IMPORT' } as any);
          results.created++;
        }
      } catch (e: any) {
        results.errors.push({ row: i + 1, error: e.message });
      }
    }
    return results;
  }

  // ---- Entrega ----
  /**
   * Registra (crea o actualiza) la cantidad entregada de un tipo de regalo a un empleado.
   *
   * Valida que empleado y tipo existan y pertenezcan a la MISMA campaña. Topa la
   * cantidad al total que corresponde por `basis`/cargas (`totalFor`), acotándola
   * al rango `[0, total]`. Usa `findOrCreate` sobre `(employeeId, giftTypeId)` y
   * fija `deliveredAt`/`deliveredBy` solo cuando la cantidad final es > 0 (si es 0,
   * ambos quedan en `null`).
   *
   * @param employeeId - Identificador del empleado que recibe el regalo.
   * @param giftTypeId - Identificador del tipo de regalo entregado.
   * @param deliveredQty - Cantidad entregada solicitada (se acota entre 0 y el total correspondiente).
   * @param deliveredBy - Identificador/nombre opcional de quien registra la entrega (solo se guarda si la cantidad final es > 0).
   * @returns Promesa que resuelve a la fila de entrega (`GiftDelivery`) creada o actualizada.
   * @throws {Error} `'Empleado no encontrado'` si el empleado no existe.
   * @throws {Error} `'Tipo de regalo no encontrado'` si el tipo no existe.
   * @throws {Error} `'El empleado y el tipo de regalo no pertenecen a la misma campaña.'` si sus `campaignId` difieren.
   */
  async setDelivery(employeeId: string, giftTypeId: string, deliveredQty: number, deliveredBy?: string) {
    // Validar pertenencia: empleado y tipo deben existir y ser de la MISMA campaña
    // (sin esto, una llamada directa podía cruzar entidades de campañas distintas).
    const [employee, giftType] = await Promise.all([
      GiftEmployee.findByPk(employeeId),
      GiftType.findByPk(giftTypeId),
    ]);
    if (!employee) throw new Error('Empleado no encontrado');
    if (!giftType) throw new Error('Tipo de regalo no encontrado');
    if ((employee as any).campaignId !== (giftType as any).campaignId) {
      throw new Error('El empleado y el tipo de regalo no pertenecen a la misma campaña.');
    }

    // Topar al total que le corresponde (entitlement por basis/cargas): la API no debe
    // permitir registrar más entregas de las debidas (la UI ya lo limitaba, la API no).
    const total = totalFor((giftType as any).basis as Basis, employee as any);
    const qty = Math.min(Math.max(0, Number(deliveredQty) || 0), total);

    const [d] = await GiftDelivery.findOrCreate({
      where: { employeeId, giftTypeId },
      defaults: { employeeId, giftTypeId, deliveredQty: 0 } as any,
    });
    await d.update({ deliveredQty: qty, deliveredAt: qty > 0 ? new Date() : null, deliveredBy: qty > 0 ? (deliveredBy || null) : null });
    return d;
  }

  // ---- Totales ----
  /**
   * Calcula los totales de una campaña: por tipo de regalo y por empresa.
   *
   * Recorre los empleados y sus entregas y agrega, por cada tipo, el total
   * correspondiente y lo entregado; y por cada empresa (los empleados sin empresa
   * se agrupan como `'Sin empresa'`), el número de empleados, cargas, cargas-hijos,
   * total y entregado. El desglose por empresa se ordena alfabéticamente.
   *
   * @param campaignId - Identificador de la campaña a resumir.
   * @returns Promesa que resuelve a `{ totalEmpleados, byType, byEmpresa }`, con `byType` (`{ typeId, name, basis, total, delivered }`) y `byEmpresa` (`{ empresa, empleados, cargas, cargasHijos, total, delivered }`) ordenado por nombre de empresa.
   */
  async summary(campaignId: string) {
    const employees = await GiftEmployee.findAll({ where: { campaignId }, include: [{ model: GiftDelivery, as: 'deliveries' }] });
    const types = await this.listTypes(campaignId);
    const byType = types.map((t) => ({ typeId: t.id, name: t.name, basis: t.basis, total: 0, delivered: 0 }));
    const byEmpresaMap = new Map<string, any>();

    for (const e of employees) {
      const ep: any = e.get({ plain: true });
      const dmap = new Map<string, number>((ep.deliveries || []).map((d: any) => [d.giftTypeId, d.deliveredQty]));
      const empresa = ep.empresa || 'Sin empresa';
      if (!byEmpresaMap.has(empresa)) byEmpresaMap.set(empresa, { empresa, empleados: 0, cargas: 0, cargasHijos: 0, total: 0, delivered: 0 });
      const er = byEmpresaMap.get(empresa);
      er.empleados++; er.cargas += ep.cargas || 0; er.cargasHijos += ep.cargasHijos || 0;
      types.forEach((t, idx) => {
        const total = totalFor(t.basis, ep);
        const delivered = dmap.get(t.id) || 0;
        byType[idx].total += total; byType[idx].delivered += delivered;
        er.total += total; er.delivered += delivered;
      });
    }

    return {
      totalEmpleados: employees.length,
      byType,
      byEmpresa: Array.from(byEmpresaMap.values()).sort((a, b) => String(a.empresa).localeCompare(String(b.empresa))),
    };
  }
}

export const giftService = new GiftService();
