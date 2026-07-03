import { GiftCampaign, GiftType, GiftEmployee, GiftDelivery } from '@/models/index';

type Basis = 'FAMILY' | 'CHILD' | 'CARGA';

// Cuántos regalos de un tipo le corresponden a un empleado.
function totalFor(basis: Basis, emp: { cargas: number; cargasHijos: number }): number {
  if (basis === 'CHILD') return emp.cargasHijos || 0;
  if (basis === 'CARGA') return emp.cargas || 0;
  return 1; // FAMILY
}

export class GiftService {
  // ---- Campañas ----
  async listCampaigns() {
    return GiftCampaign.findAll({ order: [['createdAt', 'DESC']] });
  }
  async createCampaign(name: string) {
    const c = await GiftCampaign.create({ name } as any);
    // Tipos por defecto (configurables luego)
    await GiftType.bulkCreate([
      { campaignId: c.id, name: 'Caja familiar', basis: 'FAMILY', order: 0 } as any,
      { campaignId: c.id, name: 'Regalo hijo', basis: 'CHILD', order: 1 } as any,
    ]);
    return c;
  }
  async getCampaign(id: string) {
    return GiftCampaign.findByPk(id);
  }
  async updateCampaign(id: string, data: any) {
    const c = await GiftCampaign.findByPk(id);
    if (!c) throw new Error('Campaña no encontrada');
    await c.update({ name: data.name ?? c.name, isActive: data.isActive ?? c.isActive });
    return c;
  }
  async deleteCampaign(id: string) {
    const c = await GiftCampaign.findByPk(id);
    if (!c) throw new Error('Campaña no encontrada');
    await c.destroy();
    return { ok: true };
  }

  // ---- Tipos de regalo ----
  async listTypes(campaignId: string) {
    return GiftType.findAll({ where: { campaignId }, order: [['order', 'ASC'], ['createdAt', 'ASC']] });
  }
  async createType(campaignId: string, data: any) {
    if (!data?.name) throw new Error('El nombre del tipo es obligatorio');
    const basis: Basis = ['FAMILY', 'CHILD', 'CARGA'].includes(data.basis) ? data.basis : 'FAMILY';
    return GiftType.create({ campaignId, name: data.name, basis, order: Number(data.order) || 0 } as any);
  }
  async updateType(id: string, data: any) {
    const t = await GiftType.findByPk(id);
    if (!t) throw new Error('Tipo de regalo no encontrado');
    await t.update({ name: data.name ?? t.name, basis: data.basis ?? t.basis, order: data.order ?? t.order });
    return t;
  }
  async deleteType(id: string) {
    const t = await GiftType.findByPk(id);
    if (!t) throw new Error('Tipo de regalo no encontrado');
    await t.destroy();
    return { ok: true };
  }

  // ---- Empleados ----
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
  async deleteEmployee(id: string) {
    const e = await GiftEmployee.findByPk(id);
    if (!e) throw new Error('Empleado no encontrado');
    await e.destroy();
    return { ok: true };
  }

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
  async setDelivery(employeeId: string, giftTypeId: string, deliveredQty: number, deliveredBy?: string) {
    const qty = Math.max(0, Number(deliveredQty) || 0);
    const [d] = await GiftDelivery.findOrCreate({
      where: { employeeId, giftTypeId },
      defaults: { employeeId, giftTypeId, deliveredQty: 0 } as any,
    });
    await d.update({ deliveredQty: qty, deliveredAt: qty > 0 ? new Date() : null, deliveredBy: qty > 0 ? (deliveredBy || null) : null });
    return d;
  }

  // ---- Totales ----
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
