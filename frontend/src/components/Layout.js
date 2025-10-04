import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Button } from '@mui/material';
import { Dashboard, PointOfSale, Inventory, People, Assessment, Logout } from '@mui/icons-material';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/AuthContext';
import LocationSelector from './LocationSelector';
import { locationsAPI } from '../services/locations';

const drawerWidth = 240;

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [selectedLocation, setSelectedLocation] = useState('');
  const [userLocations, setUserLocations] = useState([]);

  useEffect(() => {
    loadUserLocations();
  }, []);

  const loadUserLocations = async () => {
    try {
      const response = await locationsAPI.getUserLocations();
      setUserLocations(response.data.locations || []);
      // Set default location to primary or first available
      const primaryLocation = response.data.locations?.find(loc => loc.is_primary);
      if (primaryLocation) {
        setSelectedLocation(primaryLocation.id);
      } else if (response.data.locations?.length > 0) {
        setSelectedLocation(response.data.locations[0].id);
      }
    } catch (error) {
      console.error('Error loading user locations:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'POS', icon: <PointOfSale />, path: '/pos' },
    { text: 'Inventory', icon: <Inventory />, path: '/inventory' },
    { text: 'Customers', icon: <People />, path: '/customers' },
    { text: 'Reports', icon: <Assessment />, path: '/reports' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            ShopXperience
          </Typography>
          {userLocations.length > 1 && (
            <LocationSelector
              selectedLocation={selectedLocation}
              onLocationChange={setSelectedLocation}
              showAllOption={false}
              disabled={false}
            />
          )}
          <Button color="inherit" onClick={handleLogout} startIcon={<Logout />} sx={{ ml: 2 }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem button key={item.text} component={Link} to={item.path} selected={location.pathname === item.path}>
                <ListItemIcon>
                  {item.icon}
                </ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout;