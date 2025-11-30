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
var Award = /** @class */ (function (_super) {
    __extends(Award, _super);
    function Award() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return Award;
}(sequelize_1.Model));
Award.init({
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
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: sequelize_1.DataTypes.TEXT,
        allowNull: true,
    },
    quantity: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
    },
    isActive: {
        type: sequelize_1.DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    sequelize: sequelize_2.sequelize,
    modelName: 'Award',
    tableName: 'awards',
    timestamps: true,
});
Award.addHook('beforeUpdate', function (instance) {
    if (instance.quantity < 0) {
        throw new Error('Award quantity cannot be negative.');
    }
});
Award.addHook('beforeCreate', function (instance) {
    if (instance.quantity < 0) {
        throw new Error('Award quantity cannot be negative.');
    }
});
// Associations
Event_1.default.hasMany(Award, { foreignKey: 'eventId' });
Award.belongsTo(Event_1.default, { foreignKey: 'eventId' });
exports.default = Award;
