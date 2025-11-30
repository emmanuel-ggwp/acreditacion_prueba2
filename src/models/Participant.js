"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var sequelize_1 = require("sequelize");
var sequelize_2 = require("../lib/sequelize");
var Event_1 = require("./Event");
var User_1 = require("./User");
var Participant = /** @class */ (function (_super) {
    __extends(Participant, _super);
    function Participant() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Participant;
}(sequelize_1.Model));
Participant.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.UUIDV4,
        primaryKey: true,
    },
    eventId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: Event_1.default,
            key: 'id',
        },
    },
    firstName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
        validate: {
            isEmail: true,
        },
    },
    phone: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    documentNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    company: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    position: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    allowedGuests: {
        type: sequelize_1.DataTypes.INTEGER,
        defaultValue: 0,
    },
    createdBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'Participant',
    tableName: 'participants',
    timestamps: true,
    paranoid: true,
});
// Associations
Event_1.default.hasMany(Participant, { foreignKey: 'eventId' });
Participant.belongsTo(Event_1.default, { foreignKey: 'eventId' });
User_1.default.hasMany(Participant, { foreignKey: 'createdBy' });
Participant.belongsTo(User_1.default, { foreignKey: 'createdBy' });
exports.default = Participant;
