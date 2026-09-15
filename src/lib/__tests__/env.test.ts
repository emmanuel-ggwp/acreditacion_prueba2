/**
 * validateDbEnv (2026-09-15): la migración en el droplet aceptaba en silencio
 * una DATABASE_URL con `?sslmode=require` y fallaba en el handshake TLS con un
 * error opaco. El script debe fallar ANTES de conectar, nombrando el problema,
 * con las mismas reglas que aplica la app en el arranque (P07-D7.10, SB-09).
 */
describe('validateDbEnv — misma validación de base que la app', () => {
  const OLD_ENV = process.env;
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.DATABASE_URL;
    delete process.env.DB_SSL;
    delete process.env.DB_CA_CERT;
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`exit:${code}`);
    }) as never);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  const salida = () => errorSpy.mock.calls.map((c) => c.join(' ')).join('\n');

  it('rechaza la URL de la consola de DigitalOcean (con ?sslmode=require) nombrando el problema', () => {
    process.env.DATABASE_URL = 'postgresql://doadmin:secreto@host:25060/db?sslmode=require';
    process.env.DB_SSL = '';
    const { validateDbEnv } = require('@/lib/env');
    expect(() => validateDbEnv()).toThrow('exit:1');
    expect(salida()).toContain('DATABASE_URL');
    expect(salida()).toContain('sslmode');
    // R2: nunca el valor de la URL (lleva credenciales)
    expect(salida()).not.toContain('secreto');
  });

  it('rechaza una URL sin esquema postgres', () => {
    process.env.DATABASE_URL = 'acreditacion';
    const { validateDbEnv } = require('@/lib/env');
    expect(() => validateDbEnv()).toThrow('exit:1');
    expect(salida()).toContain('postgres://');
  });

  it('con DB_SSL=true exige DB_CA_CERT', () => {
    process.env.DATABASE_URL = 'postgresql://doadmin:secreto@host:25060/db';
    process.env.DB_SSL = 'true';
    const { validateDbEnv } = require('@/lib/env');
    expect(() => validateDbEnv()).toThrow('exit:1');
    expect(salida()).toContain('DB_CA_CERT');
  });

  it('acepta una URL limpia sin SSL, y no exige JWT_* ni UPLOADS_DIR', () => {
    process.env.DATABASE_URL = 'postgresql://doadmin:secreto@host:25060/db';
    process.env.DB_SSL = '';
    delete process.env.JWT_SECRET;
    delete process.env.UPLOADS_DIR;
    const { validateDbEnv } = require('@/lib/env');
    expect(() => validateDbEnv()).not.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
