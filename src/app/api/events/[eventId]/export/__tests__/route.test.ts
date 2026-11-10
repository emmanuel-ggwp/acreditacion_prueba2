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

  it('exporta 806 invitados reales aunque los acreditados tengan 804 declarados', async () => {
    (Participant.findAll as jest.Mock).mockResolvedValue([
      rowFrom({ id: 'gustavo', guestCount: 4, guestLoads: 4, Accreditations: [{ id: 'a1', guestCount: 5 }], guests: [] }),
      rowFrom({ id: 'marcela', guestCount: 2, guestLoads: 2, Accreditations: [{ id: 'a2', guestCount: 3 }], guests: [] }),
      rowFrom({ id: 'resto', guestCount: 798, guestLoads: 798, Accreditations: [{ id: 'a3', guestCount: 798 }], guests: [] }),
    ]);
    const res = await (GET as any)(makeRequest(), ctx());
    const body = await res.json();
    expect(body.reduce((total: number, p: any) => total + p.accreditedGuestCount, 0)).toBe(806);
    expect(body.reduce((total: number, p: any) => total + p.guestLoads, 0)).toBe(804);
    expect(Participant.findAll).toHaveBeenCalledWith(expect.objectContaining({
      include: expect.arrayContaining([expect.objectContaining({ attributes: ['id', 'checkInTime', 'guestCount'] })]),
    }));
  });

  it('suma invitados numéricos y con nombre por cada fecha sin usar los declarados', async () => {
    (Participant.findAll as jest.Mock).mockResolvedValue([
      rowFrom({ id: 'p1', guestCount: 10, Accreditations: [{ id: 'a1', guestCount: 2 }, { id: 'a2', guestCount: 3 }], guests: [
        { id: 'g1', Accreditations: [{ id: 'ga1' }, { id: 'ga2' }] },
        { id: 'g2', Accreditations: [] },
      ] }),
      rowFrom({ id: 'p2', guestCount: 12, Accreditations: [], guests: [] }),
    ]);
    const res = await (GET as any)(makeRequest(), ctx());
    const body = await res.json();
    expect(body[0].accreditedGuestCount).toBe(7);
    expect(body[1].accreditedGuestCount).toBe(0);
  });

  it('refleja reemplazos, invitados adicionales y correcciones de asistencia en cada descarga', async () => {
    const participant: any = {
      id: 'p1', firstName: 'Titular', Accreditations: [{ id: 'pa1', guestCount: 0 }],
      guests: [{ id: 'original', firstName: 'Invitada original', Accreditations: [] }],
    };
    (Participant.findAll as jest.Mock).mockImplementation(async () => [rowFrom(participant)]);
    const first = await (await (GET as any)(makeRequest(), ctx())).json();
    expect(first[0].accreditedGuestCount).toBe(0);

    participant.guests.push(
      { id: 'reemplazo', firstName: 'Persona que vino', Accreditations: [{ id: 'ga1', checkInTime: '2026-11-07T15:00:00Z' }] },
      { id: 'adicional', firstName: 'Invitado agregado', Accreditations: [{ id: 'ga2', checkInTime: '2026-11-07T15:05:00Z' }] },
    );
    const second = await (await (GET as any)(makeRequest(), ctx())).json();
    expect(second[0].accreditedGuestCount).toBe(2);
    expect(second[0].guests.map((g: any) => [g.firstName, g.isAccredited])).toEqual([
      ['Invitada original', false], ['Persona que vino', true], ['Invitado agregado', true],
    ]);

    participant.guests[2].Accreditations = [];
    const third = await (await (GET as any)(makeRequest(), ctx())).json();
    expect(third[0].accreditedGuestCount).toBe(1);
    expect(third[0].guests[2].isAccredited).toBe(false);
    expect(third[0].guests[2].accreditedAt).toBeNull();
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
