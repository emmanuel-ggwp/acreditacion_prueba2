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
var Participant_1 = require("./Participant");
var Award_1 = require("./Award");
var User_1 = require("./User");
var ParticipantAward = /** @class */ (function (_super) {
    __extends(ParticipantAward, _super);
    function ParticipantAward() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return ParticipantAward;
}(sequelize_1.Model));
ParticipantAward.init({
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
    awardId: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: Award_1.default,
            key: 'id',
        },
    },
    assignedBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: false,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
    deliveredAt: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
    deliveredBy: {
        type: sequelize_1.DataTypes.UUID,
        allowNull: true,
        references: {
            model: User_1.default,
            key: 'id',
        },
    },
    notes: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'ParticipantAward',
    tableName: 'participant_awards',
    timestamps: true,
});
// Associations
Participant_1.default.belongsToMany(Award_1.default, { through: ParticipantAward, foreignKey: 'participantId' });
Award_1.default.belongsToMany(Participant_1.default, { through: ParticipantAward, foreignKey: 'awardId' });
Participant_1.default.hasMany(ParticipantAward, { foreignKey: 'participantId' });
ParticipantAward.belongsTo(Participant_1.default, { foreignKey: 'participantId' });
Award_1.default.hasMany(ParticipantAward, { foreignKey: 'awardId' });
ParticipantAward.belongsTo(Award_1.default, { foreignKey: 'awardId' });
User_1.default.hasMany(ParticipantAward, { foreignKey: 'assignedBy', as: 'AssignedAwards' });
ParticipantAward.belongsTo(User_1.default, { foreignKey: 'assignedBy', as: 'Assigner' });
User_1.default.hasMany(ParticipantAward, { foreignKey: 'deliveredBy', as: 'DeliveredAwards' });
ParticipantAward.belongsTo(User_1.default, { foreignKey: 'deliveredBy', as: 'Deliverer' });
exports.default = ParticipantAward;
