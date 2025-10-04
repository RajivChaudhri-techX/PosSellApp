import React from 'react';
import { Container, Typography, Tabs, Tab, Box } from '@mui/material';
import InventoryLevels from '../components/InventoryLevels';
import Suppliers from '../components/Suppliers';
import Batches from '../components/Batches';
import Transfers from '../components/Transfers';
import InventoryAlerts from '../components/InventoryAlerts';

const Inventory = () => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Advanced Inventory Management
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="inventory tabs">
          <Tab label="Inventory Levels" />
          <Tab label="Suppliers" />
          <Tab label="Batches" />
          <Tab label="Transfers" />
          <Tab label="Alerts" />
        </Tabs>
      </Box>
      <Box sx={{ mt: 2 }}>
        {tabValue === 0 && <InventoryLevels />}
        {tabValue === 1 && <Suppliers />}
        {tabValue === 2 && <Batches />}
        {tabValue === 3 && <Transfers />}
        {tabValue === 4 && <InventoryAlerts />}
      </Box>
    </Container>
  );
};

export default Inventory;