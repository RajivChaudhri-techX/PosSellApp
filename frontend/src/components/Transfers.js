import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, TextField, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, Select, MenuItem, FormControl, InputLabel, Chip
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';
import api from '../services/api';

const Transfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [formData, setFormData] = useState({
    from_location_id: '',
    to_location_id: '',
    product_id: '',
    batch_id: '',
    quantity: 0,
    transfer_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchTransfers();
    fetchProducts();
    fetchBatches();
    fetchLocations();
  }, []);

  const fetchTransfers = async () => {
    try {
      const response = await api.get('/inventory/transfers');
      setTransfers(response.data.transfers);
    } catch (error) {
      console.error('Error fetching transfers:', error);
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

  const fetchBatches = async () => {
    try {
      const response = await api.get('/inventory/batches');
      setBatches(response.data.batches);
    } catch (error) {
      console.error('Error fetching batches:', error);
    }
  };

  const fetchLocations = async () => {
    // For now, hardcode locations since no API
    setLocations([
      { id: 1, name: 'Main Store' },
      { id: 2, name: 'Warehouse' },
      { id: 3, name: 'Branch 1' }
    ]);
  };

  const handleOpen = (transfer = null) => {
    setEditingTransfer(transfer);
    setFormData(transfer ? {
      from_location_id: transfer.from_location_id,
      to_location_id: transfer.to_location_id,
      product_id: transfer.product_id,
      batch_id: transfer.batch_id || '',
      quantity: transfer.quantity,
      transfer_date: transfer.transfer_date ? transfer.transfer_date.split('T')[0] : '',
      notes: transfer.notes || ''
    } : {
      from_location_id: '',
      to_location_id: '',
      product_id: '',
      batch_id: '',
      quantity: 0,
      transfer_date: '',
      notes: ''
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingTransfer(null);
  };

  const handleSubmit = async () => {
    try {
      const data = {
        ...formData,
        transfer_date: formData.transfer_date || null
      };
      if (editingTransfer) {
        await api.put(`/inventory/transfers/${editingTransfer.id}`, data);
      } else {
        await api.post('/inventory/transfers', data);
      }
      fetchTransfers();
      handleClose();
    } catch (error) {
      console.error('Error saving transfer:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/inventory/transfers/${id}`);
      fetchTransfers();
    } catch (error) {
      console.error('Error deleting transfer:', error);
    }
  };

  const getProductName = (id) => products.find(p => p.id === id)?.name || 'Unknown';
  const getLocationName = (id) => locations.find(l => l.id === id)?.name || 'Unknown';
  const getBatchNumber = (id) => batches.find(b => b.id === id)?.batch_number || 'N/A';

  return (
    <div>
      <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()} sx={{ mb: 2 }}>
        Create Transfer
      </Button>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>From</TableCell>
              <TableCell>To</TableCell>
              <TableCell>Product</TableCell>
              <TableCell>Batch</TableCell>
              <TableCell>Quantity</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transfers.map((transfer) => (
              <TableRow key={transfer.id}>
                <TableCell>{getLocationName(transfer.from_location_id)}</TableCell>
                <TableCell>{getLocationName(transfer.to_location_id)}</TableCell>
                <TableCell>{getProductName(transfer.product_id)}</TableCell>
                <TableCell>{getBatchNumber(transfer.batch_id)}</TableCell>
                <TableCell>{transfer.quantity}</TableCell>
                <TableCell>{transfer.transfer_date ? new Date(transfer.transfer_date).toLocaleDateString() : 'N/A'}</TableCell>
                <TableCell>
                  <Chip
                    label={transfer.status}
                    color={transfer.status === 'completed' ? 'success' : transfer.status === 'pending' ? 'warning' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => handleOpen(transfer)}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(transfer.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>{editingTransfer ? 'Edit Transfer' : 'Create Transfer'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="dense">
            <InputLabel>From Location</InputLabel>
            <Select
              value={formData.from_location_id}
              onChange={(e) => setFormData({ ...formData, from_location_id: e.target.value })}
              required
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>{location.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense">
            <InputLabel>To Location</InputLabel>
            <Select
              value={formData.to_location_id}
              onChange={(e) => setFormData({ ...formData, to_location_id: e.target.value })}
              required
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>{location.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
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
            <InputLabel>Batch (Optional)</InputLabel>
            <Select
              value={formData.batch_id}
              onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
            >
              <MenuItem value=""><em>None</em></MenuItem>
              {batches.filter(b => b.product_id === formData.product_id).map((batch) => (
                <MenuItem key={batch.id} value={batch.id}>{batch.batch_number}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            margin="dense"
            label="Quantity"
            type="number"
            fullWidth
            required
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
          />
          <TextField
            margin="dense"
            label="Transfer Date"
            type="date"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={formData.transfer_date}
            onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Notes"
            fullWidth
            multiline
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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

export default Transfers;