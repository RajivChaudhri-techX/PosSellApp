import React, { useState, useEffect } from 'react';
import { Container, Typography, Grid, Card, CardContent, Box, Tabs, Tab } from '@mui/material';
import { reportsAPI } from '../services/reports';
import LocationSelector from '../components/LocationSelector';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [enterpriseData, setEnterpriseData] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [selectedLocation]);

  useEffect(() => {
    if (tabValue === 1) {
      loadEnterpriseData();
    }
  }, [tabValue]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params = selectedLocation ? { location_id: selectedLocation } : {};
      const response = await reportsAPI.getDashboard(params);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEnterpriseData = async () => {
    try {
      const response = await reportsAPI.getEnterpriseDashboard();
      setEnterpriseData(response.data);
    } catch (error) {
      console.error('Error loading enterprise data:', error);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <LocationSelector
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
        />
      </Box>

      <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Location Dashboard" />
        <Tab label="Enterprise Overview" />
      </Tabs>

      {tabValue === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Sales</Typography>
                <Typography variant="h4">
                  {loading ? '...' : formatCurrency(dashboardData?.summary?.total_sales)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Transactions</Typography>
                <Typography variant="h4">
                  {loading ? '...' : dashboardData?.summary?.total_transactions || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Avg Transaction</Typography>
                <Typography variant="h4">
                  {loading ? '...' : formatCurrency(dashboardData?.summary?.avg_transaction)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {tabValue === 1 && enterpriseData && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Enterprise Sales</Typography>
                <Typography variant="h4">
                  {formatCurrency(enterpriseData.enterprise_summary?.total_sales)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Total Inventory</Typography>
                <Typography variant="h4">
                  {enterpriseData.inventory_summary?.total_items || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Sales by Location
                </Typography>
                <Grid container spacing={2}>
                  {enterpriseData.sales_by_location?.map((location) => (
                    <Grid item xs={12} md={4} key={location.location_id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">{location.Location?.name}</Typography>
                          <Typography variant="h6">{formatCurrency(location.total_sales)}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {location.transaction_count} transactions
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Container>
  );
};

export default Dashboard;