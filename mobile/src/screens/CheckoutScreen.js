import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { CardField, useConfirmPayment } from '@stripe/stripe-react-native';
import { transactionsAPI, customersAPI, paymentsAPI } from '../services/api';
import { storePendingTransaction, isOnline, syncPendingTransactions } from '../utils/sync';

const CheckoutScreen = ({ route, navigation }) => {
  const { cart, setCart } = route.params;
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [loading, setLoading] = useState(false);
  const [locationId, setLocationId] = useState('1'); // Default location, should be configurable
  const [clientSecret, setClientSecret] = useState('');
  const { confirmPayment, loading: stripeLoading } = useConfirmPayment();

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getCustomers();
      setCustomers(response.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDiscount = () => {
    return parseFloat(discountAmount) || 0;
  };

  const getTotal = () => {
    return Math.max(0, getSubtotal() - getDiscount());
  };

  const createPaymentIntent = async () => {
    try {
      const response = await paymentsAPI.createPaymentIntent({
        amount: getTotal(),
        currency: 'usd'
      });
      setClientSecret(response.data.client_secret);
      return response.data.client_secret;
    } catch (error) {
      throw new Error('Failed to initialize payment');
    }
  };

  const processPayment = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'No items in cart');
      return;
    }

    setLoading(true);
    try {
      if (paymentMethod === 'card') {
        // Handle Stripe payment
        if (!clientSecret) {
          await createPaymentIntent();
        }

        const { error, paymentIntent } = await confirmPayment(clientSecret, {
          paymentMethodType: 'Card',
        });

        if (error) {
          Alert.alert('Payment Failed', error.message);
          return;
        }

        if (paymentIntent.status === 'Succeeded') {
          // Confirm payment and create transaction
          await confirmStripePayment(paymentIntent.id);
        }
      } else {
        // Handle cash/digital payments
        const transactionData = {
          customer_id: selectedCustomer?.id,
          location_id: parseInt(locationId),
          items: cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
          })),
          payment_method: paymentMethod,
          discount_amount: getDiscount(),
        };

        const online = await isOnline();

        if (online) {
          const response = await transactionsAPI.createTransaction(transactionData);
          Alert.alert(
            'Success',
            `Transaction completed!\nTotal: $${getTotal().toFixed(2)}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setCart([]);
                  navigation.navigate('ProductSearch');
                }
              }
            ]
          );
        } else {
          await storePendingTransaction(transactionData);
          Alert.alert(
            'Transaction Stored',
            `Transaction saved for sync when online.\nTotal: $${getTotal().toFixed(2)}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setCart([]);
                  navigation.navigate('ProductSearch');
                }
              }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Transaction error:', error);
      Alert.alert(
        'Transaction Failed',
        error.response?.data?.error || error.message || 'An error occurred during checkout'
      );
    } finally {
      setLoading(false);
    }
  };

  const confirmStripePayment = async (paymentIntentId) => {
    try {
      const transactionData = {
        payment_intent_id: paymentIntentId,
        customer_id: selectedCustomer?.id,
        location_id: parseInt(locationId),
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
        discount_amount: getDiscount(),
      };

      await paymentsAPI.confirmPayment(transactionData);

      Alert.alert(
        'Success',
        `Payment completed!\nTotal: $${getTotal().toFixed(2)}`,
        [
          {
            text: 'OK',
            onPress: () => {
              setCart([]);
              navigation.navigate('ProductSearch');
            }
          }
        ]
      );
    } catch (error) {
      throw new Error('Failed to confirm payment');
    }
  };

  const renderCartSummary = () => (
    <View style={styles.cartSummary}>
      <Text style={styles.sectionTitle}>Order Summary</Text>
      {cart.map(item => (
        <View key={item.product_id} style={styles.summaryItem}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemDetails}>
            {item.quantity} x ${item.price} = ${(item.price * item.quantity).toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Checkout</Text>

      {renderCartSummary()}

      <View style={styles.customerSection}>
        <Text style={styles.sectionTitle}>Customer (Optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.customerList}>
          <TouchableOpacity
            style={[styles.customerItem, !selectedCustomer && styles.customerSelected]}
            onPress={() => setSelectedCustomer(null)}
          >
            <Text style={styles.customerName}>Walk-in Customer</Text>
          </TouchableOpacity>
          {customers.map(customer => (
            <TouchableOpacity
              key={customer.id}
              style={[styles.customerItem, selectedCustomer?.id === customer.id && styles.customerSelected]}
              onPress={() => setSelectedCustomer(customer)}
            >
              <Text style={styles.customerName}>{customer.name}</Text>
              <Text style={styles.customerPhone}>{customer.phone}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.paymentSection}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentMethods}>
          {['cash', 'card', 'digital'].map(method => (
            <TouchableOpacity
              key={method}
              style={[styles.paymentMethod, paymentMethod === method && styles.paymentSelected]}
              onPress={() => setPaymentMethod(method)}
            >
              <Text style={[styles.paymentText, paymentMethod === method && styles.paymentTextSelected]}>
                {method.charAt(0).toUpperCase() + method.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {paymentMethod === 'card' && (
          <View style={styles.cardFieldContainer}>
            <CardField
              postalCodeEnabled={false}
              style={styles.cardField}
              cardStyle={{
                backgroundColor: '#FFFFFF',
                textColor: '#000000',
              }}
              onCardChange={(cardDetails) => {
                // Handle card details change if needed
              }}
            />
          </View>
        )}
      </View>

      <View style={styles.discountSection}>
        <Text style={styles.sectionTitle}>Discount</Text>
        <TextInput
          style={styles.discountInput}
          placeholder="0.00"
          value={discountAmount}
          onChangeText={setDiscountAmount}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.totalSection}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal:</Text>
          <Text style={styles.totalValue}>${getSubtotal().toFixed(2)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Discount:</Text>
          <Text style={styles.totalValue}>-${getDiscount().toFixed(2)}</Text>
        </View>
        <View style={[styles.totalRow, styles.finalTotal]}>
          <Text style={styles.finalTotalLabel}>Total:</Text>
          <Text style={styles.finalTotalValue}>${getTotal().toFixed(2)}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.payButton, loading && styles.payButtonDisabled]}
        onPress={processPayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>
            Pay ${getTotal().toFixed(2)}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  cartSummary: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  itemName: {
    fontSize: 16,
    flex: 1,
  },
  itemDetails: {
    fontSize: 14,
    color: '#666',
  },
  customerSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  customerList: {
    flexDirection: 'row',
  },
  customerItem: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    minWidth: 120,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  customerSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e3f2fd',
  },
  customerName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  customerPhone: {
    fontSize: 12,
    color: '#666',
  },
  paymentSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  paymentMethod: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#f8f9fa',
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  paymentSelected: {
    borderColor: '#007bff',
    backgroundColor: '#e3f2fd',
  },
  paymentText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  paymentTextSelected: {
    color: '#007bff',
  },
  cardFieldContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  cardField: {
    width: '100%',
    height: 50,
  },
  discountSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  totalSection: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  finalTotal: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10,
    marginTop: 10,
  },
  finalTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  finalTotalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  payButton: {
    backgroundColor: '#28a745',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CheckoutScreen;