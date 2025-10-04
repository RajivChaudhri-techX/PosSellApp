const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Tenant = require('./Tenant');
const User = require('./User');

const Report = sequelize.define('Report', {
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
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  parameters: {
    type: DataTypes.JSONB
  },
  created_by: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'reports',
  timestamps: false
});

// Associations
Report.belongsTo(Tenant, { foreignKey: 'tenant_id' });
Report.belongsTo(User, { foreignKey: 'created_by' });

Tenant.hasMany(Report, { foreignKey: 'tenant_id' });
User.hasMany(Report, { foreignKey: 'created_by' });

module.exports = Report;