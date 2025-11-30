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
var EventSchedule = /** @class */ (function (_super) {
    __extends(EventSchedule, _super);
    function EventSchedule() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return EventSchedule;
}(sequelize_1.Model));
EventSchedule.init({
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
    scheduleName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    startDateTime: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    endDateTime: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    maxCapacity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: true,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'EventSchedule',
    tableName: 'event_schedules',
    timestamps: true,
});
// Associations
Event_1.default.hasMany(EventSchedule, { foreignKey: 'eventId' });
EventSchedule.belongsTo(Event_1.default, { foreignKey: 'eventId' });
exports.default = EventSchedule;
