const express = require('express');
const { Transaction, TransactionItem, Product, Inventory, Customer } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const multiTenancyMiddleware = require('../middleware/multiTenancy');
const { sequelize } = require('../config/database');
const PDFDocument = require('pdfkit');
const { Parser } = require('json2csv');
const regression = require('regression');

const router = express.Router();

// Apply middleware to all routes
router.use(multiTenancyMiddleware);
router.use(authenticateToken);

// Sales report
router.get('/sales', async (req, res) => {
  try {
    const { start_date, end_date, location_id, group_by = 'day' } = req.query;

    let dateTrunc = 'day';
    if (group_by === 'month') dateTrunc = 'month';
    if (group_by === 'year') dateTrunc = 'year';

    const whereClause = {
      tenant_id: req.tenantId,
      status: 'completed'
    };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    if (location_id) {
      whereClause.location_id = location_id;
    }

    const salesData = await Transaction.findAll({
      attributes: [
        [sequelize.fn('date_trunc', dateTrunc, sequelize.col('created_at')), 'period'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sales'],
        [sequelize.fn('AVG', sequelize.col('total_amount')), 'avg_transaction']
      ],
      where: whereClause,
      group: [sequelize.fn('date_trunc', dateTrunc, sequelize.col('created_at'))],
      order: [[sequelize.fn('date_trunc', dateTrunc, sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Get total summary with enhanced metrics
    const summary = await Transaction.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_transactions'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sales'],
        [sequelize.fn('AVG', sequelize.col('total_amount')), 'avg_transaction'],
        [sequelize.fn('MIN', sequelize.col('total_amount')), 'min_transaction'],
        [sequelize.fn('MAX', sequelize.col('total_amount')), 'max_transaction'],
        [sequelize.fn('STDDEV', sequelize.col('total_amount')), 'std_dev_transaction']
      ],
      where: whereClause,
      raw: true
    });

    // Calculate profit (assuming cost is 60% of price)
    const profitData = await TransactionItem.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue'],
        [sequelize.fn('SUM', sequelize.literal('TransactionItem.quantity * Product.price * 0.6')), 'total_cost']
      ],
      include: [
        {
          model: Product,
          attributes: []
        },
        {
          model: Transaction,
          attributes: [],
          where: whereClause
        }
      ],
      raw: true
    });

    const totalRevenue = parseFloat(profitData[0]?.total_revenue || 0);
    const totalCost = parseFloat(profitData[0]?.total_cost || 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Calculate growth rate (compare with previous period)
    let growthRate = 0;
    if (start_date && end_date) {
      const periodLength = new Date(end_date) - new Date(start_date);
      const prevStart = new Date(new Date(start_date) - periodLength);
      const prevEnd = new Date(start_date);

      const prevSummary = await Transaction.findAll({
        attributes: [
          [sequelize.fn('SUM', sequelize.col('total_amount')), 'prev_sales']
        ],
        where: {
          ...whereClause,
          created_at: {
            [require('sequelize').Op.between]: [prevStart, prevEnd]
          }
        },
        raw: true
      });

      const prevSales = parseFloat(prevSummary[0]?.prev_sales || 0);
      const currentSales = parseFloat(summary[0]?.total_sales || 0);
      growthRate = prevSales > 0 ? ((currentSales - prevSales) / prevSales) * 100 : 0;
    }

    res.json({
      summary: {
        ...summary[0],
        total_profit: totalProfit,
        profit_margin: profitMargin,
        growth_rate: growthRate
      },
      data: salesData
    });
  } catch (error) {
    console.error('Sales report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Inventory report
router.get('/inventory', async (req, res) => {
  try {
    const { location_id, low_stock_only = false } = req.query;

    const whereClause = { tenant_id: req.tenantId };

    if (location_id) whereClause.location_id = location_id;
    if (low_stock_only === 'true') {
      whereClause.quantity = {
        [require('sequelize').Op.lte]: require('sequelize').col('min_stock')
      };
    }

    const inventoryReport = await Inventory.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          attributes: ['name', 'sku', 'price', 'category']
        }
      ],
      order: [['quantity', 'ASC']]
    });

    // Calculate totals and enhanced metrics
    const totals = inventoryReport.reduce((acc, item) => {
      acc.total_items += 1;
      acc.total_value += parseFloat(item.quantity) * parseFloat(item.Product.price);
      if (item.quantity <= item.min_stock) {
        acc.low_stock_items += 1;
      }
      return acc;
    }, { total_items: 0, total_value: 0, low_stock_items: 0 });

    // Calculate inventory turnover (sales / average inventory)
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Last month
    const soldItems = await TransactionItem.findAll({
      attributes: [
        'product_id',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_sold']
      ],
      include: [
        {
          model: Transaction,
          attributes: [],
          where: {
            tenant_id: req.tenantId,
            created_at: { [require('sequelize').Op.gte]: startDate }
          }
        }
      ],
      group: ['TransactionItem.product_id'],
      raw: true
    });

    const turnoverData = {};
    soldItems.forEach(item => {
      turnoverData[item.product_id] = parseFloat(item.total_sold);
    });

    const avgInventory = inventoryReport.reduce((sum, item) => sum + parseFloat(item.quantity), 0) / inventoryReport.length;
    const totalSold = Object.values(turnoverData).reduce((sum, val) => sum + val, 0);
    const turnoverRatio = avgInventory > 0 ? totalSold / avgInventory : 0;

    res.json({
      summary: {
        ...totals,
        inventory_turnover: turnoverRatio,
        avg_inventory_level: avgInventory
      },
      inventory: inventoryReport
    });
  } catch (error) {
    console.error('Inventory report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Product performance report
router.get('/products', async (req, res) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;

    const whereClause = { tenant_id: req.tenantId };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const productPerformance = await TransactionItem.findAll({
      attributes: [
        'product_id',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue'],
        [sequelize.fn('COUNT', sequelize.col('TransactionItem.transaction_id')), 'transaction_count']
      ],
      include: [
        {
          model: Product,
          attributes: ['name', 'sku', 'price', 'category'],
          where: { tenant_id: req.tenantId }
        },
        {
          model: Transaction,
          attributes: [],
          where: whereClause
        }
      ],
      group: ['TransactionItem.product_id', 'Product.id'],
      order: [[sequelize.fn('SUM', sequelize.col('total_price')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    res.json({
      products: productPerformance
    });
  } catch (error) {
    console.error('Product performance report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer report
router.get('/customers', async (req, res) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;

    const whereClause = { tenant_id: req.tenantId };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const customerReport = await Transaction.findAll({
      attributes: [
        'customer_id',
        [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_spent'],
        [sequelize.fn('AVG', sequelize.col('total_amount')), 'avg_transaction'],
        [sequelize.fn('MAX', sequelize.col('created_at')), 'last_transaction'],
        [sequelize.fn('MIN', sequelize.col('created_at')), 'first_transaction']
      ],
      include: [
        {
          model: Customer,
          attributes: ['first_name', 'last_name', 'email'],
          where: { tenant_id: req.tenantId }
        }
      ],
      where: {
        customer_id: { [require('sequelize').Op.ne]: null },
        ...whereClause
      },
      group: ['Transaction.customer_id', 'Customer.id'],
      order: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    // Calculate customer lifetime value and retention
    const enhancedCustomers = customerReport.map(customer => {
      const totalSpent = parseFloat(customer.total_spent);
      const transactionCount = parseInt(customer.transaction_count);
      const avgTransaction = parseFloat(customer.avg_transaction);
      const firstTransaction = new Date(customer.first_transaction);
      const lastTransaction = new Date(customer.last_transaction);
      const customerAge = (new Date() - firstTransaction) / (1000 * 60 * 60 * 24); // days
      const lifetimeValue = totalSpent;
      const purchaseFrequency = customerAge > 0 ? transactionCount / (customerAge / 30) : 0; // per month
      const retentionRate = lastTransaction > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) ? 100 : 0; // active in last 30 days

      return {
        ...customer,
        lifetime_value: lifetimeValue,
        purchase_frequency: purchaseFrequency,
        retention_rate: retentionRate
      };
    });

    res.json({
      customers: enhancedCustomers
    });
  } catch (error) {
    console.error('Customer report error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Data visualization endpoints for charts
router.get('/charts/sales-trends', async (req, res) => {
  try {
    const { start_date, end_date, group_by = 'day' } = req.query;

    let dateTrunc = 'day';
    if (group_by === 'month') dateTrunc = 'month';
    if (group_by === 'year') dateTrunc = 'year';

    const whereClause = { tenant_id: req.tenantId, status: 'completed' };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const chartData = await Transaction.findAll({
      attributes: [
        [sequelize.fn('date_trunc', dateTrunc, sequelize.col('created_at')), 'period'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactions'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'sales']
      ],
      where: whereClause,
      group: [sequelize.fn('date_trunc', dateTrunc, sequelize.col('created_at'))],
      order: [[sequelize.fn('date_trunc', dateTrunc, sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    res.json(chartData);
  } catch (error) {
    console.error('Sales trends chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/charts/product-performance', async (req, res) => {
  try {
    const { start_date, end_date, limit = 10 } = req.query;

    const whereClause = { tenant_id: req.tenantId };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const chartData = await TransactionItem.findAll({
      attributes: [
        'product_id',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'quantity'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'revenue']
      ],
      include: [
        {
          model: Product,
          attributes: ['name', 'category'],
          where: { tenant_id: req.tenantId }
        },
        {
          model: Transaction,
          attributes: [],
          where: whereClause
        }
      ],
      group: ['TransactionItem.product_id', 'Product.id', 'Product.name', 'Product.category'],
      order: [[sequelize.fn('SUM', sequelize.col('total_price')), 'DESC']],
      limit: parseInt(limit),
      raw: true
    });

    res.json(chartData);
  } catch (error) {
    console.error('Product performance chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/charts/customer-analytics', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const whereClause = { tenant_id: req.tenantId };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const chartData = await Transaction.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'month'],
        [sequelize.fn('COUNT', sequelize.literal('DISTINCT customer_id')), 'unique_customers'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transactions']
      ],
      where: {
        customer_id: { [require('sequelize').Op.ne]: null },
        ...whereClause
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('created_at'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    res.json(chartData);
  } catch (error) {
    console.error('Customer analytics chart error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Export endpoints
router.get('/export/sales/csv', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const whereClause = { tenant_id: req.tenantId, status: 'completed' };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const data = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          attributes: ['first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      raw: true
    });

    const fields = ['id', 'total_amount', 'created_at', 'Customer.first_name', 'Customer.last_name', 'Customer.email'];
    const opts = { fields };
    const parser = new Parser(opts);
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment('sales_report.csv');
    res.send(csv);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/export/sales/pdf', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const whereClause = { tenant_id: req.tenantId, status: 'completed' };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const data = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          attributes: ['first_name', 'last_name', 'email']
        }
      ],
      order: [['created_at', 'DESC']],
      raw: true
    });

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales_report.pdf"');
    doc.pipe(res);

    doc.fontSize(20).text('Sales Report', { align: 'center' });
    doc.moveDown();

    data.forEach(transaction => {
      doc.fontSize(12).text(`Transaction ID: ${transaction.id}`);
      doc.text(`Amount: $${transaction.total_amount}`);
      doc.text(`Date: ${new Date(transaction.created_at).toLocaleDateString()}`);
      if (transaction['Customer.first_name']) {
        doc.text(`Customer: ${transaction['Customer.first_name']} ${transaction['Customer.last_name']}`);
      }
      doc.moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Predictive analytics endpoints
router.get('/predictive/sales-forecast', async (req, res) => {
  try {
    const { periods = 12 } = req.query; // forecast next 12 periods

    // Get historical sales data (last 24 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 24);

    const historicalData = await Transaction.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'month'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'sales']
      ],
      where: {
        tenant_id: req.tenantId,
        status: 'completed',
        created_at: {
          [require('sequelize').Op.between]: [startDate, endDate]
        }
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('created_at'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Prepare data for regression
    const dataPoints = historicalData.map((point, index) => [index, parseFloat(point.sales)]);

    if (dataPoints.length < 2) {
      return res.json({ forecast: [], message: 'Insufficient data for forecasting' });
    }

    // Perform linear regression
    const result = regression.linear(dataPoints);
    const gradient = result.equation[0];
    const intercept = result.equation[1];

    // Generate forecast
    const forecast = [];
    for (let i = 1; i <= periods; i++) {
      const futureIndex = dataPoints.length + i - 1;
      const predictedSales = gradient * futureIndex + intercept;
      const futureDate = new Date(endDate);
      futureDate.setMonth(futureDate.getMonth() + i);
      forecast.push({
        period: futureDate.toISOString().slice(0, 7), // YYYY-MM
        predicted_sales: Math.max(0, predictedSales) // Ensure non-negative
      });
    }

    res.json({
      historical: historicalData,
      forecast: forecast,
      r2: result.r2
    });
  } catch (error) {
    console.error('Sales forecast error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/predictive/inventory-forecast', async (req, res) => {
  try {
    const { product_id, periods = 6 } = req.query;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    // Get historical sales data for the product (last 12 months)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);

    const historicalData = await TransactionItem.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'month'],
        [sequelize.fn('SUM', sequelize.col('quantity')), 'quantity_sold']
      ],
      include: [
        {
          model: Transaction,
          attributes: [],
          where: {
            tenant_id: req.tenantId,
            created_at: {
              [require('sequelize').Op.between]: [startDate, endDate]
            }
          }
        }
      ],
      where: { product_id },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('created_at'))],
      order: [[sequelize.fn('date_trunc', 'month', sequelize.col('created_at')), 'ASC']],
      raw: true
    });

    // Get current inventory
    const inventory = await Inventory.findOne({
      where: { product_id, tenant_id: req.tenantId }
    });

    if (!inventory) {
      return res.status(404).json({ error: 'Inventory not found' });
    }

    const dataPoints = historicalData.map((point, index) => [index, parseFloat(point.quantity_sold)]);

    if (dataPoints.length < 2) {
      return res.json({ forecast: [], current_stock: inventory.quantity, message: 'Insufficient data for forecasting' });
    }

    // Perform linear regression
    const result = regression.linear(dataPoints);
    const gradient = result.equation[0];
    const intercept = result.equation[1];

    // Generate forecast
    const forecast = [];
    let projectedStock = parseFloat(inventory.quantity);

    for (let i = 1; i <= periods; i++) {
      const futureIndex = dataPoints.length + i - 1;
      const predictedDemand = gradient * futureIndex + intercept;
      projectedStock -= Math.max(0, predictedDemand);

      const futureDate = new Date(endDate);
      futureDate.setMonth(futureDate.getMonth() + i);

      forecast.push({
        period: futureDate.toISOString().slice(0, 7),
        predicted_demand: Math.max(0, predictedDemand),
        projected_stock: Math.max(0, projectedStock)
      });
    }

    res.json({
      historical: historicalData,
      forecast: forecast,
      current_stock: inventory.quantity,
      r2: result.r2
    });
  } catch (error) {
    console.error('Inventory forecast error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Real-time dashboard with filtering
router.get('/dashboard', async (req, res) => {
  try {
    const { start_date, end_date, location_id, category } = req.query;

    const whereClause = { tenant_id: req.tenantId, status: 'completed' };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    if (location_id) {
      whereClause.location_id = location_id;
    }

    // Sales summary
    const salesSummary = await Transaction.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sales'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_transactions'],
        [sequelize.fn('AVG', sequelize.col('total_amount')), 'avg_transaction']
      ],
      where: whereClause,
      raw: true
    });

    // Top products
    let productWhere = { tenant_id: req.tenantId };
    if (category) {
      productWhere.category = category;
    }

    const topProducts = await TransactionItem.findAll({
      attributes: [
        'product_id',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue']
      ],
      include: [
        {
          model: Product,
          attributes: ['name', 'category'],
          where: productWhere
        },
        {
          model: Transaction,
          attributes: [],
          where: whereClause
        }
      ],
      group: ['TransactionItem.product_id', 'Product.id'],
      order: [[sequelize.fn('SUM', sequelize.col('total_price')), 'DESC']],
      limit: 5,
      raw: true
    });

    // Recent transactions
    const recentTransactions = await Transaction.findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          attributes: ['first_name', 'last_name']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      summary: salesSummary[0],
      top_products: topProducts,
      recent_transactions: recentTransactions
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enterprise dashboard with cross-location reporting
router.get('/enterprise-dashboard', requireRole(['admin', 'manager']), async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const whereClause = { tenant_id: req.tenantId, status: 'completed' };

    if (start_date && end_date) {
      whereClause.created_at = {
        [require('sequelize').Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    // Overall enterprise summary
    const enterpriseSummary = await Transaction.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sales'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_transactions'],
        [sequelize.fn('AVG', sequelize.col('total_amount')), 'avg_transaction']
      ],
      where: whereClause,
      raw: true
    });

    // Sales by location
    const salesByLocation = await Transaction.findAll({
      attributes: [
        'location_id',
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total_sales'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count'],
        [sequelize.fn('AVG', sequelize.col('total_amount')), 'avg_transaction']
      ],
      include: [
        {
          model: require('../models').Location,
          attributes: ['name']
        }
      ],
      where: whereClause,
      group: ['Transaction.location_id', 'Location.id'],
      order: [[sequelize.fn('SUM', sequelize.col('total_amount')), 'DESC']],
      raw: true
    });

    // Inventory summary across all locations
    const inventorySummary = await Inventory.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_items']
      ],
      where: { tenant_id: req.tenantId },
      raw: true
    });

    // Low stock alerts across locations
    const lowStockAlerts = await Inventory.findAll({
      where: {
        tenant_id: req.tenantId,
        quantity: {
          [require('sequelize').Op.lte]: require('sequelize').col('reorder_point')
        }
      },
      include: [
        {
          model: Product,
          attributes: ['name', 'sku']
        },
        {
          model: require('../models').Location,
          attributes: ['name']
        }
      ],
      order: [['quantity', 'ASC']],
      limit: 20
    });

    // Top performing products enterprise-wide
    const topProducts = await TransactionItem.findAll({
      attributes: [
        'product_id',
        [sequelize.fn('SUM', sequelize.col('quantity')), 'total_quantity'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total_revenue']
      ],
      include: [
        {
          model: Product,
          attributes: ['name', 'category']
        },
        {
          model: Transaction,
          attributes: [],
          where: whereClause
        }
      ],
      group: ['TransactionItem.product_id', 'Product.id'],
      order: [[sequelize.fn('SUM', sequelize.col('total_price')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Recent transfers between locations
    const recentTransfers = await require('../models').Transfer.findAll({
      where: { tenant_id: req.tenantId },
      include: [
        { model: require('../models').Location, as: 'fromLocation', attributes: ['name'] },
        { model: require('../models').Location, as: 'toLocation', attributes: ['name'] },
        { model: Product, attributes: ['name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    res.json({
      enterprise_summary: enterpriseSummary[0],
      sales_by_location: salesByLocation,
      inventory_summary: inventorySummary[0],
      low_stock_alerts: lowStockAlerts,
      top_products: topProducts,
      recent_transfers: recentTransfers
    });
  } catch (error) {
    console.error('Enterprise dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;