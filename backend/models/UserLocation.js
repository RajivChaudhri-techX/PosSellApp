const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Location = require('./Location');

const UserLocation = sequelize.define('UserLocation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
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
  role_at_location: {
    type: DataTypes.ENUM('admin', 'manager', 'cashier'),
    allowNull: false,
    defaultValue: 'cashier'
  },
  is_primary: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  assigned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'user_locations',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'location_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['location_id']
    }
  ]
});


module.exports = UserLocation;