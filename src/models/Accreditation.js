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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var sequelize_1 = require("sequelize");
var sequelize_2 = require("../lib/sequelize");
var Participant_1 = require("./Participant");
var Guest_1 = require("./Guest");
var EventSchedule_1 = require("./EventSchedule");
var User_1 = require("./User");
var Accreditation = /** @class */ (function (_super) {
    __extends(Accreditation, _super);
    function Accreditation() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Accreditation;
}(sequelize_1.Model));
Accreditation.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        defaultValue: sequelize_1.UUIDV4,
        primaryKey: true,
    },
    participantId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: Participant_1.default,
            key: 'id',
        },
    },
    guestId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: Guest_1.default,
            key: 'id',
        },
    },
    eventScheduleId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: EventSchedule_1.default,
            key: 'id',
        },
    },
    accreditedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
    accreditedAt: {
        type: sequelize_1.DataTypes.DATE,
        defaultValue: sequelize_1.DataTypes.NOW,
    },
    checkInTime: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
    checkOutTime: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'Accreditation',
    tableName: 'accreditations',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['participantId', 'eventScheduleId'],
            name: 'unique_accreditation_participant_schedule'
        },
        {
            unique: true,
            fields: ['guestId', 'eventScheduleId'],
            name: 'unique_accreditation_guest_schedule',
            where: {
                guestId: (_a = {},
                    _a[sequelize_1.Op.ne] = null,
                    _a)
            }
        }
    ]
});
// Associations
Participant_1.default.hasMany(Accreditation, { foreignKey: 'participantId' });
Accreditation.belongsTo(Participant_1.default, { foreignKey: 'participantId' });
Guest_1.default.hasMany(Accreditation, { foreignKey: 'guestId' });
Accreditation.belongsTo(Guest_1.default, { foreignKey: 'guestId' });
EventSchedule_1.default.hasMany(Accreditation, { foreignKey: 'eventScheduleId' });
Accreditation.belongsTo(EventSchedule_1.default, { foreignKey: 'eventScheduleId' });
User_1.default.hasMany(Accreditation, { foreignKey: 'accreditedBy' });
Accreditation.belongsTo(User_1.default, { foreignKey: 'accreditedBy' });
exports.default = Accreditation;
