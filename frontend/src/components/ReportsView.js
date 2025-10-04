import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Grid, Card, CardContent, Button, Box, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';

const ReportsView = () => {
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalSales: 0, totalTransactions: 0 });
  const [salesTrends, setSalesTrends] = useState([]);
  const [productPerformance, setProductPerformance] = useState([]);
  const [customerAnalytics, setCustomerAnalytics] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchReports();
    fetchCharts();
  }, [startDate, endDate]);

  const fetchReports = async () => {
    try {
      const params = {};
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const response = await api.get('/reports/sales', { params });
      setSummary(response.data.summary);
      const transResponse = await api.get('/transactions', { params });
      setTransactions(transResponse.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchCharts = async () => {
    try {
      const params = { group_by: 'month' };
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const [salesRes, productRes, customerRes] = await Promise.all([
        api.get('/reports/charts/sales-trends', { params }),
        api.get('/reports/charts/product-performance', { params }),
        api.get('/reports/charts/customer-analytics', { params })
      ]);
      setSalesTrends(salesRes.data.map(item => ({
        period: new Date(item.period).toLocaleDateString(),
        sales: parseFloat(item.sales),
        transactions: parseInt(item.transactions)
      })));
      setProductPerformance(productRes.data.map(item => ({
        name: item['Product.name'],
        revenue: parseFloat(item.revenue),
        quantity: parseInt(item.quantity)
      })));
      setCustomerAnalytics(customerRes.data.map(item => ({
        month: new Date(item.month).toLocaleDateString(),
        customers: parseInt(item.unique_customers),
        transactions: parseInt(item.transactions)
      })));
    } catch (error) {
      console.error('Error fetching charts:', error);
    }
  };

  const handleExport = async (format) => {
    try {
      const params = {};
      if (startDate && endDate) {
        params.start_date = startDate;
        params.end_date = endDate;
      }
      const response = await api.get(`/reports/export/sales/${format}`, {
        params,
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `sales_report.${format}`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.error('Error exporting:', error);
    }
  };

  return (
    <div>
      <Typography variant="h5" gutterBottom>
        Filters
      </Typography>
      <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <Button variant="contained" onClick={() => { setStartDate(''); setEndDate(''); }}>Clear Filters</Button>
        <Button variant="outlined" onClick={() => handleExport('csv')}>Export CSV</Button>
        <Button variant="outlined" onClick={() => handleExport('pdf')}>Export PDF</Button>
      </Box>

      <Typography variant="h5" gutterBottom>
        Sales Summary
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Sales</Typography>
              <Typography variant="h4">${summary.total_sales?.toFixed(2) || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Total Transactions</Typography>
              <Typography variant="h4">{summary.total_transactions || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Avg Transaction</Typography>
              <Typography variant="h4">${summary.avg_transaction?.toFixed(2) || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">Profit Margin</Typography>
              <Typography variant="h4">{summary.profit_margin?.toFixed(2) || 0}%</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Typography variant="h5" gutterBottom>
        Sales Trends
      </Typography>
      <LineChart width={800} height={300} data={salesTrends}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="sales" stroke="#8884d8" />
        <Line type="monotone" dataKey="transactions" stroke="#82ca9d" />
      </LineChart>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Product Performance
      </Typography>
      <BarChart width={800} height={300} data={productPerformance}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="revenue" fill="#8884d8" />
      </BarChart>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Customer Analytics
      </Typography>
      <LineChart width={800} height={300} data={customerAnalytics}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="customers" stroke="#8884d8" />
        <Line type="monotone" dataKey="transactions" stroke="#82ca9d" />
      </LineChart>

      <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
        Recent Transactions
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.slice(0, 10).map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell>{transaction.id}</TableCell>
                <TableCell>{transaction.customerName}</TableCell>
                <TableCell>${transaction.total_amount}</TableCell>
                <TableCell>{new Date(transaction.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default ReportsView;