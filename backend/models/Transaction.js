const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');
const Customer = require('./Customer');
const Location = require('./Location');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tenant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Tenant,
      key: 'id'
    }
  },
  customer_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Customer,
      key: 'id'
    }
  },
  location_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Location,
      key: 'id'
    }
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  tax_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  discount_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'pending'
  },
  stripe_payment_intent_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  stripe_charge_id: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  payment_status: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'transactions',
  timestamps: false
});

// Associations
Transaction.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Transaction.belongsTo(Customer, { foreignKey: 'customer_id' });
Transaction.belongsTo(Location, { foreignKey: 'location_id' });

Tenant.hasMany(Transaction, { foreignKey: 'tenant_id' });
Customer.hasMany(Transaction, { foreignKey: 'customer_id' });
Location.hasMany(Transaction, { foreignKey: 'location_id' });

module.exports = Transaction;