import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Box, Alert
} from '@mui/material';
import api from '../services/api';

const InventoryAlerts = () => {
  const [reorderAlerts, setReorderAlerts] = useState([]);
  const [expirationAlerts, setExpirationAlerts] = useState([]);

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    try {
      const [reorderResponse, expirationResponse] = await Promise.all([
        api.get('/inventory/reorder-alerts'),
        api.get('/inventory/expiration-alerts')
      ]);
      setReorderAlerts(reorderResponse.data.alerts);
      setExpirationAlerts(expirationResponse.data.alerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Inventory Alerts
      </Typography>

      {reorderAlerts.length === 0 && expirationAlerts.length === 0 ? (
        <Alert severity="success">No alerts at this time.</Alert>
      ) : (
        <>
          {reorderAlerts.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="error" gutterBottom>
                Reorder Alerts ({reorderAlerts.length})
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Current Stock</TableCell>
                      <TableCell>Reorder Point</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reorderAlerts.map((alert) => (
                      <TableRow key={`${alert.product_id}-${alert.location_id}`}>
                        <TableCell>{alert.Product?.name || 'Unknown'}</TableCell>
                        <TableCell>{alert.Location?.name || 'Unknown'}</TableCell>
                        <TableCell>{alert.quantity}</TableCell>
                        <TableCell>{alert.reorder_point}</TableCell>
                        <TableCell>
                          <Chip label="Reorder Needed" color="error" size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {expirationAlerts.length > 0 && (
            <Box>
              <Typography variant="h6" color="warning.main" gutterBottom>
                Expiration Alerts ({expirationAlerts.length})
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Batch Number</TableCell>
                      <TableCell>Supplier</TableCell>
                      <TableCell>Expiration Date</TableCell>
                      <TableCell>Days Left</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {expirationAlerts.map((alert) => {
                      const expDate = new Date(alert.expiration_date);
                      const now = new Date();
                      const diffTime = expDate - now;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return (
                        <TableRow key={alert.id}>
                          <TableCell>{alert.Product?.name || 'Unknown'}</TableCell>
                          <TableCell>{alert.batch_number}</TableCell>
                          <TableCell>{alert.Supplier?.name || 'Unknown'}</TableCell>
                          <TableCell>{expDate.toLocaleDateString()}</TableCell>
                          <TableCell>{diffDays}</TableCell>
                          <TableCell>
                            <Chip
                              label={diffDays <= 7 ? 'Critical' : 'Warning'}
                              color={diffDays <= 7 ? 'error' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default InventoryAlerts;