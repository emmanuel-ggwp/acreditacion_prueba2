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
var Guest = /** @class */ (function (_super) {
    __extends(Guest, _super);
    function Guest() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Guest;
}(sequelize_1.Model));
Guest.init({
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
    firstName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    lastName: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    documentNumber: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'Guest',
    tableName: 'guests',
    timestamps: true,
    paranoid: true,
});
// Associations
Participant_1.default.hasMany(Guest, { foreignKey: 'participantId' });
Guest.belongsTo(Participant_1.default, { foreignKey: 'participantId' });
exports.default = Guest;
