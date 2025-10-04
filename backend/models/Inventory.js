const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');
const Product = require('./Product');
const Location = require('./Location');

const Inventory = sequelize.define('Inventory', {
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
  location_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Location,
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  min_stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reorder_point: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'inventory',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['product_id', 'location_id']
    }
  ]
});

// Associations
Inventory.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Inventory.belongsTo(Product, { foreignKey: 'product_id' });
Inventory.belongsTo(Location, { foreignKey: 'location_id' });

Tenant.hasMany(Inventory, { foreignKey: 'tenant_id' });
Product.hasMany(Inventory, { foreignKey: 'product_id' });
Location.hasMany(Inventory, { foreignKey: 'location_id' });

module.exports = Inventory;