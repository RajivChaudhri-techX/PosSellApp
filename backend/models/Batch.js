const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');
const Product = require('./Product');
const Supplier = require('./Supplier');

const Batch = sequelize.define('Batch', {
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
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Product,
      key: 'id'
    }
  },
  supplier_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Supplier,
      key: 'id'
    }
  },
  batch_number: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  quantity_received: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cost_per_unit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  expiration_date: {
    type: DataTypes.DATE
  },
  received_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
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
  tableName: 'batches',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['tenant_id', 'product_id', 'batch_number']
    }
  ]
});

// Associations
Batch.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Batch.belongsTo(Product, { foreignKey: 'product_id' });
Batch.belongsTo(Supplier, { foreignKey: 'supplier_id' });

Tenant.hasMany(Batch, { foreignKey: 'tenant_id' });
Product.hasMany(Batch, { foreignKey: 'product_id' });
Supplier.hasMany(Batch, { foreignKey: 'supplier_id' });

module.exports = Batch;