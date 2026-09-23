module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.+(ts|tsx|js)', '**/?(*.)+(spec|test).+(ts|tsx|js)'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  collectCoverage: true,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/services/**/*.ts',
    'src/app/api/**/*.ts',
  ],
  // Umbral tipo "ratchet": refleja la cobertura REAL actual (no una meta inalcanzable).
  // `npm test` queda en verde mientras no BAJE la cobertura, y se sube conforme se
  // agregan pruebas. Hoy los servicios están ~88% y faltan las rutas API (que arrastran
  // el global hacia abajo); al cubrir las rutas se sube este piso hacia el 80% global.
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 47,
      lines: 46,
      statements: 45,
    },
  },
};
