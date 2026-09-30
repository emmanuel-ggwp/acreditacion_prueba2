import {
  getGuestMode,
  guestDietaryEnabled,
  guestDietaryRequired,
} from '../formFields';

describe('formFields · dieta de invitados', () => {
  describe('guestDietaryEnabled', () => {
    it('es true solo en modo "named" con guests.dietary activo', () => {
      expect(guestDietaryEnabled({ guests: { mode: 'named', dietary: true } })).toBe(true);
    });

    it('es false si la dieta no está activa', () => {
      expect(guestDietaryEnabled({ guests: { mode: 'named', dietary: false } })).toBe(false);
      expect(guestDietaryEnabled({ guests: { mode: 'named' } })).toBe(false);
    });

    it('es false fuera del modo "named" aunque dietary esté activo', () => {
      expect(guestDietaryEnabled({ guests: { mode: 'count', dietary: true } })).toBe(false);
      expect(guestDietaryEnabled({ guests: { mode: 'companion', dietary: true } })).toBe(false);
    });

    it('tolera config vacía o nula', () => {
      expect(guestDietaryEnabled(undefined)).toBe(false);
      expect(guestDietaryEnabled(null)).toBe(false);
      expect(guestDietaryEnabled({})).toBe(false);
    });
  });

  describe('guestDietaryRequired', () => {
    it('es true solo si la dieta está habilitada Y marcada como obligatoria', () => {
      expect(
        guestDietaryRequired({ guests: { mode: 'named', dietary: true, dietaryRequired: true } })
      ).toBe(true);
    });

    it('es false si es obligatoria pero la dieta no está habilitada', () => {
      // dietaryRequired no manda por sí solo: exige dietary=true (y modo named).
      expect(
        guestDietaryRequired({ guests: { mode: 'named', dietary: false, dietaryRequired: true } })
      ).toBe(false);
      expect(
        guestDietaryRequired({ guests: { mode: 'count', dietary: true, dietaryRequired: true } })
      ).toBe(false);
    });

    it('es false si la dieta está habilitada pero no es obligatoria', () => {
      expect(
        guestDietaryRequired({ guests: { mode: 'named', dietary: true, dietaryRequired: false } })
      ).toBe(false);
      expect(guestDietaryRequired({ guests: { mode: 'named', dietary: true } })).toBe(false);
    });

    it('tolera config vacía o nula', () => {
      expect(guestDietaryRequired(undefined)).toBe(false);
      expect(guestDietaryRequired(null)).toBe(false);
      expect(guestDietaryRequired({})).toBe(false);
    });
  });

  // Ancla de sanidad del modo (del que dependen los helpers de arriba).
  it('getGuestMode default es "named"', () => {
    expect(getGuestMode(undefined)).toBe('named');
    expect(getGuestMode({ guests: { mode: 'count' } })).toBe('count');
    expect(getGuestMode({ guests: { mode: 'companion' } })).toBe('companion');
  });
});
