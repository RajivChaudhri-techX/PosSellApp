import React from 'react';
import { Container, Typography, Paper } from '@mui/material';
import ReportsView from '../components/ReportsView';

const Reports = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>
      <Paper sx={{ p: 2 }}>
        <ReportsView />
      </Paper>
    </Container>
  );
};

export default Reports;