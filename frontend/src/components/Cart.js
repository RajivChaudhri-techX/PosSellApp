import React from 'react';
import { List, ListItem, ListItemText, IconButton, Typography, Divider, Button } from '@mui/material';
import { Delete } from '@mui/icons-material';

const Cart = ({ cart, onUpdateQuantity, onRemoveItem, onCheckout }) => {
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div>
      <Typography variant="h6" gutterBottom>
        Cart
      </Typography>
      <List>
        {cart.map((item) => (
          <ListItem key={item.id}>
            <ListItemText
              primary={item.name}
              secondary={`$${item.price} x ${item.quantity} = $${(item.price * item.quantity).toFixed(2)}`}
            />
            <IconButton onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
              -
            </IconButton>
            <Typography>{item.quantity}</Typography>
            <IconButton onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}>
              +
            </IconButton>
            <IconButton onClick={() => onRemoveItem(item.id)}>
              <Delete />
            </IconButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <Typography variant="h6" sx={{ mt: 2 }}>
        Total: ${total.toFixed(2)}
      </Typography>
      <Button
        variant="contained"
        fullWidth
        sx={{ mt: 2 }}
        onClick={onCheckout}
        disabled={cart.length === 0}
      >
        Checkout
      </Button>
    </div>
  );
};

export default Cart;