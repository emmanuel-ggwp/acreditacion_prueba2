// jest.setup.js
const { Sequelize } = require('sequelize');

// Mock the sequelize instance from the correct path
jest.mock('@/lib/sequelize', () => ({
  sequelize: {
    transaction: jest.fn(),
    define: jest.fn().mockReturnThis(),
    sync: jest.fn(),
    query: jest.fn(),
  },
}), { virtual: true });

// Mock individual models to prevent them from being registered with Sequelize's connection manager
// while still allowing their static methods to be mocked in tests.
jest.mock('./src/models/User', () => {
  const { Model } = require('sequelize');
  class User extends Model {
    static findOne = jest.fn();
    static findByPk = jest.fn();
    static findAll = jest.fn();
    static create = jest.fn();
    static update = jest.fn();
    static destroy = jest.fn();
    static scope = jest.fn(() => User);
  }
  return User;
});

jest.mock('./src/models/RefreshToken', () => {
  const { Model } = require('sequelize');
  class RefreshToken extends Model {
      static findOne = jest.fn();
      static create = jest.fn();
      static update = jest.fn();
  }
  return RefreshToken;
});

// Mock other models that might be pulled in as dependencies
jest.mock('./src/models/Event', () => {
    const { Model } = require('sequelize');
    class Event extends Model {
        static findOne = jest.fn();
        static findByPk = jest.fn();
        static findAll = jest.fn();
        static findAndCountAll = jest.fn();
        static create = jest.fn();
        static update = jest.fn();
        static destroy = jest.fn();
        static scope = jest.fn(() => Event);
    }
    return Event;
});

jest.mock('./src/models/Participant', () => {
    const { Model } = require('sequelize');
    class Participant extends Model {
        static findByPk = jest.fn();
        static count = jest.fn();
    }
    return Participant;
});

jest.mock('./src/models/Accreditation', () => {
    const { Model } = require('sequelize');
    class Accreditation extends Model {
        static findByPk = jest.fn();
        static findAll = jest.fn();
        static findAndCountAll = jest.fn();
        static count = jest.fn();
        static findOne = jest.fn();
        static create = jest.fn();
    }
    return Accreditation;
});

jest.mock('./src/models/Award', () => {
    const { Model } = require('sequelize');
    class Award extends Model {
        static findByPk = jest.fn();
        static findAll = jest.fn();
        static create = jest.fn();
        static destroy = jest.fn();
    }
    return Award;
});

jest.mock('./src/models/ParticipantAward', () => {
    const { Model } = require('sequelize');
    class ParticipantAward extends Model {
        static findByPk = jest.fn();
        static findAll = jest.fn();
        static count = jest.fn();
        static create = jest.fn();
        static destroy = jest.fn();
    }
    return ParticipantAward;
});

jest.mock('./src/models/Guest', () => {
    const { Model } = require('sequelize');
    class Guest extends Model {
        static findByPk = jest.fn();
    }
    return Guest;
});

jest.mock('./src/models/EventSchedule', () => {
    const { Model } = require('sequelize');
    class EventSchedule extends Model {
        static findByPk = jest.fn();
        static findAll = jest.fn();
    }
    return EventSchedule;
});
