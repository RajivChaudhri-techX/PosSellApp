import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, TextField, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import api from '../services/api';

const Batches = () => {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState(null);
  const [formData, setFormData] = useState({
    product_id: '',
    supplier_id: '',
    batch_number: '',
    quantity_received: 0,
    cost_per_unit: 0,
    expiration_date: '',
    received_date: ''
  });

  useEffect(() => {
    fetchBatches();
    fetchProducts();
    fetchSuppliers();
  }, []);

  const fetchBatches = async () => {
    try {
      const response = await api.get('/inventory/batches');
      setBatches(response.data.batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
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

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/inventory/suppliers');
      setSuppliers(response.data.suppliers);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const handleOpen = (batch = null) => {
    setEditingBatch(batch);
    setFormData(batch ? {
      product_id: batch.product_id,
      supplier_id: batch.supplier_id || '',
      batch_number: batch.batch_number,
      quantity_received: batch.quantity_received,
      cost_per_unit: batch.cost_per_unit,
      expiration_date: batch.expiration_date ? batch.expiration_date.split('T')[0] : '',
      received_date: batch.received_date ? batch.received_date.split('T')[0] : ''
    } : {
      product_id: '',
      supplier_id: '',
      batch_number: '',
      quantity_received: 0,
      cost_per_unit: 0,
      expiration_date: '',
      received_date: ''
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingBatch(null);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        expiration_date: formData.expiration_date || null,
        received_date: formData.received_date || null
      };
      if (editingBatch) {
        await api.put(`/inventory/batches/${editingBatch.id}`, data);
      } else {
        await api.post('/inventory/batches', data);
      }
      fetchBatches();
      handleClose();
    } catch (error) {
      console.error('Error saving batch:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/inventory/batches/${id}`);
      fetchBatches();
    } catch (error) {
      console.error('Error deleting batch:', error);
    }
  };

  const getProductName = (id) => products.find(p => p.id === id)?.name || 'Unknown';
  const getSupplierName = (id) => suppliers.find(s => s.id === id)?.name || 'Unknown';

  const isExpiringSoon = (date) => {
    if (!date) return false;
    const expDate = new Date(date);
    const now = new Date();
    const diffTime = expDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30 && diffDays >= 0;
  };

  return (
    <div>
      <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Add Batch
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Product</TableCell>
              <TableCell>Batch Number</TableCell>
              <TableCell>Supplier</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Cost/Unit</TableCell>
              <TableCell>Expiration</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {batches.map((batch) => (
              <TableRow key={batch.id}>
                <TableCell>{getProductName(batch.product_id)}</TableCell>
                <TableCell>{batch.batch_number}</TableCell>
                <TableCell>{getSupplierName(batch.supplier_id)}</TableCell>
                <TableCell>{batch.quantity_received}</TableCell>
                <TableCell>${batch.cost_per_unit}</TableCell>
                <TableCell>{batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>
                  {isExpiringSoon(batch.expiration_date) ? (
                    <Chip label="Expiring Soon" color="warning" size="small" />
                  ) : (
                    <Chip label="Active" color="success" size="small" />
                  )}
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(batch)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(batch.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingBatch ? 'Edit Batch' : 'Add Batch'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>Product</InputLabel>
            <Select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
            >
              {products.map((product) => (
                <MenuItem key={product.id} value={product.id}>{product.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>Supplier</InputLabel>
            <Select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {suppliers.map((supplier) => (
                <MenuItem key={supplier.id} value={supplier.id}>{supplier.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Batch Number"
            fullWidth
            required
            value={formData.batch_number}
            onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Quantity Received"
            type="number"
            fullWidth
            required
            value={formData.quantity_received}
            onChange={(e) => setFormData({ ...formData, quantity_received: parseInt(e.target.value) || 0 })}
          />
          <TextField
            margin="dense"
            label="Cost Per Unit"
            type="number"
            step="0.01"
            fullWidth
            required
            value={formData.cost_per_unit}
            onChange={(e) => setFormData({ ...formData, cost_per_unit: parseFloat(e.target.value) || 0 })}
          />
          <TextField
            margin="dense"
            label="Expiration Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={formData.expiration_date}
            onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Received Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={formData.received_date}
            onChange={(e) => setFormData({ ...formData, received_date: e.target.value })}
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

export default Batches;