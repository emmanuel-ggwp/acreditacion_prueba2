// GET (ADMIN/OPERATOR/MANAGER): exporta los participantes del evento con invitados,
// horarios y estado de acreditación. Usa Participant.findAll directamente (mock
// global). Cada fila expone `.get({ plain: true })` como una instancia Sequelize.
jest.mock('@/lib/jwt', () => ({ verifyAccessToken: jest.fn() }));

import { GET } from '../route';
import { Participant } from '@/models/index';
import { verifyAccessToken } from '@/lib/jwt';
import User from '@/models/User';

const makeRequest = () =>
  new Request('http://localhost/api/events/e1/export', {
    method: 'GET',
    headers: { Authorization: 'Bearer x' },
  });

const ctx = (eventId = 'e1') => ({ params: Promise.resolve({ eventId }) });

// Simula una instancia Sequelize: el handler llama a `.get({ plain: true })`.
const rowFrom = (plain: any) => ({ get: () => plain });

describe('/api/events/[eventId]/export route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (verifyAccessToken as jest.Mock).mockReturnValue({ id: 'u1', role: 'ADMIN' });
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'ADMIN' });
  });

  it('aplana participantes y calcula isAccredited/accreditedAt', async () => {
    (Participant.findAll as jest.Mock).mockResolvedValue([
      rowFrom({
        id: 'p1',
        firstName: 'Ana',
        lastName: 'Perez',
        Accreditations: [
          { id: 'ac2', checkInTime: '2026-01-02T10:00:00Z' },
          { id: 'ac1', checkInTime: '2026-01-01T09:00:00Z' },
        ],
        guests: [
          { id: 'g1', firstName: 'Hijo', Accreditations: [{ id: 'gac1', checkInTime: '2026-01-03T08:00:00Z' }] },
          { id: 'g2', firstName: 'Otro', Accreditations: [] },
        ],
      }),
    ]);

    const res = await (GET as any)(makeRequest(), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Participant.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { eventId: 'e1' } })
    );
    expect(body).toHaveLength(1);
    const p = body[0];
    expect(p.isAccredited).toBe(true);
    // La hora de acreditación es la más temprana de sus check-ins.
    expect(p.accreditedAt).toBe('2026-01-01T09:00:00.000Z');
    expect(p.guests[0].isAccredited).toBe(true);
    expect(p.guests[0].accreditedAt).toBe('2026-01-03T08:00:00.000Z');
    expect(p.guests[1].isAccredited).toBe(false);
    expect(p.guests[1].accreditedAt).toBeNull();
  });

  it('marca isAccredited=false cuando no hay acreditaciones', async () => {
    (Participant.findAll as jest.Mock).mockResolvedValue([
      rowFrom({ id: 'p1', firstName: 'Bob', lastName: 'Lee', Accreditations: [], guests: [] }),
    ]);

    const res = await (GET as any)(makeRequest(), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body[0].isAccredited).toBe(false);
    expect(body[0].accreditedAt).toBeNull();
    expect(body[0].guests).toEqual([]);
  });

  it('responde 500 si la consulta lanza', async () => {
    (Participant.findAll as jest.Mock).mockRejectedValue(new Error('db down'));

    const res = await (GET as any)(makeRequest(), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ message: 'db down' });
  });

  it('responde 403 si el rol de la BD no está permitido (GUARDIA)', async () => {
    (User.findByPk as jest.Mock).mockResolvedValue({ id: 'u1', isActive: true, role: 'GUARDIA' });

    const res = await (GET as any)(makeRequest(), ctx('e1'));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body).toEqual({ message: 'Forbidden: Insufficient permissions' });
    expect(Participant.findAll).not.toHaveBeenCalled();
  });
});
