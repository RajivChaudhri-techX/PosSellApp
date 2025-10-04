import React, { useState, useEffect, useCallback } from 'react';
import { TextField, Button, Typography, Box, Alert, CircularProgress } from '@mui/material';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import api from '../services/api';

// Initialize Stripe (replace with your publishable key)
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_stripe_publishable_key_here');

const CheckoutForm = ({ cart, total, onComplete, customerName, setCustomerName, paymentMethod, setPaymentMethod, setError, setSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState('');

  const createPaymentIntent = useCallback(async () => {
    try {
      const response = await api.post('/payments/create-payment-intent', {
        amount: total,
        currency: 'usd'
      });
      setClientSecret(response.data.client_secret);
    } catch (error) {
      setError('Failed to initialize payment');
    }
  }, [total, setError]);

  useEffect(() => {
    if (paymentMethod === 'card' && total > 0) {
      createPaymentIntent();
    }
  }, [paymentMethod, total, createPaymentIntent]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (paymentMethod === 'card') {
      if (!stripe || !elements) return;

      setProcessing(true);

      const cardElement = elements.getElement(CardElement);

      try {
        const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
          }
        });

        if (error) {
          setError(error.message);
        } else if (paymentIntent.status === 'succeeded') {
          // Confirm payment and create transaction
          await confirmPayment(paymentIntent.id);
        }
      } catch (err) {
        setError('Payment failed');
      }

      setProcessing(false);
    } else {
      // Handle cash/digital payments
      try {
        const transactionData = {
          customer_id: null, // You might want to add customer selection
          location_id: 1, // Default location
          items: cart.map(item => ({
            product_id: item.id,
            quantity: item.quantity,
          })),
          payment_method: paymentMethod,
          discount_amount: 0,
        };
        await api.post('/transactions', transactionData);
        setSuccess(true);
        onComplete();
      } catch (error) {
        setError('Failed to process transaction');
      }
    }
  };

  const confirmPayment = async (paymentIntentId) => {
    try {
      const transactionData = {
        payment_intent_id: paymentIntentId,
        customer_id: null, // Add customer selection
        location_id: 1, // Default location
        items: cart.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
        discount_amount: 0,
      };

      await api.post('/payments/confirm-payment', transactionData);
      setSuccess(true);
      onComplete();
    } catch (error) {
      setError('Failed to confirm payment');
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Checkout
      </Typography>

      <TextField
        label="Customer Name"
        fullWidth
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        sx={{ mb: 2 }}
      />

      <TextField
        label="Payment Method"
        select
        fullWidth
        value={paymentMethod}
        onChange={(e) => setPaymentMethod(e.target.value)}
        sx={{ mb: 2 }}
        SelectProps={{
          native: true,
        }}
      >
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="digital">Digital Wallet</option>
      </TextField>

      {paymentMethod === 'card' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            Card Information
          </Typography>
          <Box sx={{
            border: '1px solid #ccc',
            borderRadius: 1,
            p: 2,
            bgcolor: 'grey.50'
          }}>
            <CardElement options={cardElementOptions} />
          </Box>
        </Box>
      )}

      <Typography variant="h6" sx={{ mb: 2 }}>
        Total: ${total.toFixed(2)}
      </Typography>

      <Button
        type="submit"
        variant="contained"
        fullWidth
        disabled={processing || (paymentMethod === 'card' && !stripe)}
        sx={{ mt: 2 }}
      >
        {processing ? <CircularProgress size={24} /> : 'Complete Transaction'}
      </Button>
    </Box>
  );
};

const Checkout = ({ cart, total, onComplete }) => {
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Typography variant="h5" color="success.main">
          Transaction Completed Successfully!
        </Typography>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => setSuccess(false)}>
          New Transaction
        </Button>
      </Box>
    );
  }

  return (
    <>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Elements stripe={stripePromise}>
        <CheckoutForm
          cart={cart}
          total={total}
          onComplete={onComplete}
          customerName={customerName}
          setCustomerName={setCustomerName}
          paymentMethod={paymentMethod}
          setPaymentMethod={setPaymentMethod}
          setError={setError}
          setSuccess={setSuccess}
        />
      </Elements>
    </>
  );
};

export default Checkout;