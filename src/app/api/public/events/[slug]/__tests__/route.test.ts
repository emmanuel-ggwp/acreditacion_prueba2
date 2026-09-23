import { GET } from '../route';
import { Event } from '@/models/index';

// Ruta PÚBLICA (sin withAuth). Solo consulta el modelo Event (globalmente mockeado en
// jest.setup). Se configuran sus estáticos por test.
const EventMock = Event as any;

const makeRequest = (slug = 'my-slug') =>
  new Request(`http://localhost/api/public/events/${slug}`, { method: 'GET' });

const call = (slug = 'my-slug') =>
  (GET as any)(makeRequest(slug) as any, { params: Promise.resolve({ slug }) });

describe('GET /api/public/events/[slug]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('devuelve el evento público (200)', async () => {
    const event = {
      id: 'ev1',
      name: 'Gala 2026',
      description: 'desc',
      location: 'Santiago',
      registrationConfig: { mode: 'open' },
      allowGuests: true,
      registrationOpen: true,
    };
    EventMock.findOne.mockResolvedValue(event);

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(event);
    // El slug de la ruta se usa en el where.
    expect(EventMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ publicSlug: 'my-slug', isActive: true, isPublic: true }) })
    );
  });

  it('devuelve 404 cuando el evento no existe o no es público', async () => {
    EventMock.findOne.mockResolvedValue(null);

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body).toEqual({ error: 'Event not found or not public' });
  });

  it('devuelve 500 si la consulta falla', async () => {
    EventMock.findOne.mockRejectedValue(new Error('db down'));

    const res = await call();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body).toEqual({ error: 'Internal server error' });
  });
});
