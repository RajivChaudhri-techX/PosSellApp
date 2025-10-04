import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, TextField, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Chip, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { Edit } from '@mui/icons-material';
import api from '../services/api';

const InventoryLevels = () => {
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState(null);
  const [formData, setFormData] = useState({
    product_id: '',
    location_id: '',
    quantity: 0,
    min_stock: 0,
    reorder_point: 0
  });

  useEffect(() => {
    fetchInventory();
    fetchProducts();
    fetchLocations();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setInventory(response.data.inventory);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const handleOpen = (inv = null) => {
    setEditingInventory(inv);
    if (inv) {
      setFormData({
        product_id: inv.product_id,
        location_id: inv.location_id,
        quantity: inv.quantity,
        min_stock: inv.min_stock,
        reorder_point: inv.reorder_point
      });
    } else {
      setFormData({
        product_id: '',
        location_id: '',
        quantity: 0,
        min_stock: 0,
        reorder_point: 0
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingInventory(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingInventory) {
        await api.put(`/inventory/${formData.product_id}/${formData.location_id}`, {
          quantity: formData.quantity,
          min_stock: formData.min_stock,
          reorder_point: formData.reorder_point
        });
      } else {
        await api.put(`/inventory/${formData.product_id}/${formData.location_id}`, {
          quantity: formData.quantity,
          min_stock: formData.min_stock,
          reorder_point: formData.reorder_point
        });
      }
      fetchInventory();
      handleClose();
    } catch (error) {
      console.error('Error saving inventory:', error);
    }
  };

  const getProductName = (id) => products.find(p => p.id === id)?.name || 'Unknown';
  const getLocationName = (id) => locations.find(l => l.id === id)?.name || 'Unknown';

  return (
    <div>
      <Button variant="contained" onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Update Inventory Level
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Min Stock</TableCell>
              <TableCell>Reorder Point</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventory.map((inv) => (
              <TableRow key={`${inv.product_id}-${inv.location_id}`}>
                <TableCell>{getProductName(inv.product_id)}</TableCell>
                <TableCell>{getLocationName(inv.location_id)}</TableCell>
                <TableCell>{inv.quantity}</TableCell>
                <TableCell>{inv.min_stock}</TableCell>
                <TableCell>{inv.reorder_point}</TableCell>
                <TableCell>
                  {inv.quantity <= inv.reorder_point ? (
                    <Chip label="Reorder" color="error" size="small" />
                  ) : inv.quantity <= inv.min_stock ? (
                    <Chip label="Low Stock" color="warning" size="small" />
                  ) : (
                    <Chip label="In Stock" color="success" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(inv)}>
                    <Edit />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingInventory ? 'Edit Inventory Level' : 'Add Inventory Level'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Product</InputLabel>
            <Select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Location</InputLabel>
            <Select
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>{location.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Quantity"
            type="number"
            fullWidth
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
          />
          <TextField
            margin="dense"
            label="Min Stock"
            type="number"
            fullWidth
            value={formData.min_stock}
            onChange={(e) => setFormData({ ...formData, min_stock: parseInt(e.target.value) || 0 })}
          />
          <TextField
            margin="dense"
            label="Reorder Point"
            type="number"
            fullWidth
            value={formData.reorder_point}
            onChange={(e) => setFormData({ ...formData, reorder_point: parseInt(e.target.value) || 0 })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Save</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default InventoryLevels;