// jest.setup.js
//
// Los servicios importan modelos (directo o vía @/models/index, que además registra
// asociaciones). Para que las suites CARGUEN sin una BD real, se mockean TODOS los modelos
// con una fábrica común: métodos de consulta como jest.fn() (que cada test configura) +
// asociaciones no-op (belongsTo/hasMany/... ) para que las llamadas de models/index no
// revienten sobre clases sin inicializar. Antes la lista de mocks estaba incompleta
// (faltaban ParticipantSchedule, GuestSchedule, EmailTemplate, AuditLog, Gift*), así que
// cualquier suite que tocara un modelo no mockeado fallaba al importar (getQueryInterface /
// null.replace). Un solo lugar para todos evita que se vuelva a desincronizar.

// Instancia de sequelize mockeada (los servicios usan sequelize.transaction, etc.).
jest.mock('@/lib/sequelize', () => ({
  sequelize: {
    transaction: jest.fn(),
    define: jest.fn().mockReturnThis(),
    sync: jest.fn(),
    query: jest.fn(),
    literal: jest.fn((v) => v),
    fn: jest.fn(),
    col: jest.fn(),
    where: jest.fn(),
    getQueryInterface: jest.fn(() => ({})),
  },
}), { virtual: true });

// Fábrica de modelo mockeado: estáticos de consulta + asociaciones no-op.
const makeMockModel = () => {
  const { Model } = require('sequelize');
  class MockModel extends Model {}
  ['findOne', 'findByPk', 'findAll', 'findAndCountAll', 'count', 'create', 'bulkCreate', 'update', 'destroy', 'max', 'min', 'sum', 'increment']
    .forEach((m) => { MockModel[m] = jest.fn(); });
  MockModel.scope = jest.fn(() => MockModel);
  // Asociaciones: no-op para que models/index no falle al registrarlas sobre el mock.
  ['belongsTo', 'hasOne', 'hasMany', 'belongsToMany', 'addScope', 'init', 'sync']
    .forEach((m) => { MockModel[m] = jest.fn(); });
  return MockModel;
};

[
  'User', 'RefreshToken', 'Event', 'EventSchedule', 'Participant', 'ParticipantSchedule',
  'Guest', 'GuestSchedule', 'Award', 'ParticipantAward', 'Accreditation', 'AuditLog',
  'EmailTemplate', 'GiftCampaign', 'GiftType', 'GiftEmployee', 'GiftDelivery',
].forEach((name) => {
  jest.mock(`./src/models/${name}`, () => makeMockModel());
});
