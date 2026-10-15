import { createAccreditationSchema } from '../accreditationSchemas';
import { createScheduleSchema, updateScheduleSchema } from '../eventSchemas';

// Los esquemas "create" derivan de un objeto base con .omit(). Zod 4 descartaba el
// .refine() del base al hacer .omit() (y desde 4.6 lanza): estas pruebas fijan que la
// regla se aplica igualmente en los esquemas derivados.
const G = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('createScheduleSchema: término posterior al inicio', () => {
  const base = { eventId: G, scheduleName: 'Fecha 1', startDateTime: '2026-10-10T10:00:00Z' };

  it('acepta término posterior al inicio', () => {
    expect(createScheduleSchema.safeParse({ ...base, endDateTime: '2026-10-10T11:00:00Z' }).success).toBe(true);
  });

  it('rechaza término anterior o igual al inicio, en endDateTime', () => {
    for (const endDateTime of ['2026-10-10T09:00:00Z', '2026-10-10T10:00:00Z']) {
      const r = createScheduleSchema.safeParse({ ...base, endDateTime });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].path).toEqual(['endDateTime']);
    }
  });

  it('updateScheduleSchema sigue siendo parcial (la regla se valida en el servicio)', () => {
    expect(updateScheduleSchema.safeParse({ endDateTime: '2026-10-10T09:00:00Z' }).success).toBe(true);
  });
});

describe('createAccreditationSchema: participantId o guestId', () => {
  const base = { participantId: null, guestId: null, eventScheduleId: G, accreditedBy: G, checkInTime: '2026-10-10T10:00:00Z', checkOutTime: null };

  it('rechaza sin participantId ni guestId', () => {
    const r = createAccreditationSchema.safeParse(base);
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/participantId o guestId/);
  });

  it('acepta con participantId o con guestId', () => {
    expect(createAccreditationSchema.safeParse({ ...base, participantId: G }).success).toBe(true);
    expect(createAccreditationSchema.safeParse({ ...base, guestId: G }).success).toBe(true);
  });
});
