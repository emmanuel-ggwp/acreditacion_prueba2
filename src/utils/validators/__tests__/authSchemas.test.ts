import { passwordError, passwordSchema, loginSchema, registerSchema } from '../authSchemas';

describe('política de contraseñas única (D2.6 / SB-31)', () => {
  it('acepta una contraseña fuerte (8+ y las 4 clases)', () => {
    expect(passwordError('Abcdef1!')).toBeNull();
    expect(passwordSchema.safeParse('Abcdef1!').success).toBe(true);
  });

  it('rechaza el hueco viejo de /api/users (6 sin complejidad)', () => {
    expect(passwordError('abcdef')).not.toBeNull();       // 6, débil
    expect(passwordError('password123')).not.toBeNull();  // sin mayúscula ni símbolo
  });

  it('exige longitud y cada clase, devolviendo el primer fallo', () => {
    expect(passwordError('Ab1!')).toMatch(/8 caracteres/);
    expect(passwordError('abcdefg1!')).toMatch(/mayúscula/);
    expect(passwordError('ABCDEFG1!')).toMatch(/minúscula/);
    expect(passwordError('Abcdefgh!')).toMatch(/número/);
    expect(passwordError('Abcdefg1')).toMatch(/especial/);
  });
});

describe('loginSchema — fuente única (SB-31)', () => {
  it('acepta email válido + contraseña presente', () => {
    expect(loginSchema.safeParse({ email: 'a@b.com', password: 'x' }).success).toBe(true);
  });

  it('rechaza email de más de 254 (tope del limitador, R2-03a)', () => {
    const long = 'a'.repeat(250) + '@b.com';
    expect(loginSchema.safeParse({ email: long, password: 'x' }).success).toBe(false);
  });
});

describe('registerSchema usa la misma política de contraseñas', () => {
  const base = { username: 'abc', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADMIN' };

  it('rechaza una contraseña débil', () => {
    expect(registerSchema.safeParse({ ...base, password: 'weak' }).success).toBe(false);
  });

  it('acepta datos válidos con contraseña fuerte', () => {
    expect(registerSchema.safeParse({ ...base, password: 'Abcdef1!' }).success).toBe(true);
  });
});
