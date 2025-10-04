import React, { useState } from 'react';
import { Container, Typography, Grid, Paper } from '@mui/material';
import ProductSelection from '../components/ProductSelection';
import Cart from '../components/Cart';
import Checkout from '../components/Checkout';

const POS = () => {
  const [cart, setCart] = useState([]);
  const [checkoutMode, setCheckoutMode] = useState(false);

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id, quantity) => {
    if (quantity <= 0) {
      removeItem(id);
    } else {
      setCart(cart.map(item =>
        item.id === id ? { ...item, quantity } : item
      ));
    }
  };

  const removeItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleCheckout = () => {
    setCheckoutMode(true);
  };

  const handleComplete = () => {
    setCart([]);
    setCheckoutMode(false);
  };

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Point of Sale
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <ProductSelection onAddToCart={addToCart} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            {checkoutMode ? (
              <Checkout cart={cart} total={total} onComplete={handleComplete} />
            ) : (
              <Cart
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeItem}
                onCheckout={handleCheckout}
              />
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default POS;