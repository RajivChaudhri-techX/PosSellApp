import React from 'react';
import { Container, Typography, Paper } from '@mui/material';
import CustomerTable from '../components/CustomerTable';

const Customers = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Customer Management
      </Typography>
      <Paper sx={{ p: 2 }}>
        <CustomerTable />
      </Paper>
    </Container>
  );
};

export default Customers;