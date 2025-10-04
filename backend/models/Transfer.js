const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');
const Location = require('./Location');
const Product = require('./Product');
const Batch = require('./Batch');

const Transfer = sequelize.define('Transfer', {
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
  from_location_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Location,
      key: 'id'
    }
  },
  to_location_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Location,
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
  },
  batch_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Batch,
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  transfer_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'cancelled'),
    defaultValue: 'pending'
  },
  notes: {
    type: DataTypes.TEXT
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'transfers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['tenant_id', 'status']
    }
  ]
});

// Associations
Transfer.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Transfer.belongsTo(Location, { foreignKey: 'from_location_id', as: 'fromLocation' });
Transfer.belongsTo(Location, { foreignKey: 'to_location_id', as: 'toLocation' });
Transfer.belongsTo(Product, { foreignKey: 'product_id' });
Transfer.belongsTo(Batch, { foreignKey: 'batch_id' });

Tenant.hasMany(Transfer, { foreignKey: 'tenant_id' });
Location.hasMany(Transfer, { foreignKey: 'from_location_id' });
Location.hasMany(Transfer, { foreignKey: 'to_location_id' });
Product.hasMany(Transfer, { foreignKey: 'product_id' });
Batch.hasMany(Transfer, { foreignKey: 'batch_id' });

module.exports = Transfer;