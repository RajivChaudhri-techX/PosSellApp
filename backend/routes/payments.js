const express = require('express');
const { Transaction, TransactionItem, Product, Inventory, Customer, Location } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const multiTenancyMiddleware = require('../middleware/multiTenancy');
const { sequelize } = require('../config/database');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Apply middleware to all routes
router.use(multiTenancyMiddleware);
router.use(authenticateToken);

// Create payment intent
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency = 'usd', payment_method_types = ['card'] } = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      payment_method_types,
      metadata: {
        tenant_id: req.tenantId
      }
    });

    res.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id
    });
  } catch (error) {
    console.error('Payment intent creation error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Confirm payment and create transaction
router.post('/confirm-payment', validate(schemas.confirmPayment), async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      payment_intent_id,
      customer_id,
      location_id,
      items,
      discount_amount = 0
    } = req.body;

    // Retrieve payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);

    if (paymentIntent.status !== 'succeeded') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Payment not completed' });
    }

    // Validate location belongs to tenant
    const location = await Location.findOne({
      where: { id: location_id, tenant_id: req.tenantId },
      transaction
    });

    if (!location) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Location not found' });
    }

    // Validate customer if provided
    if (customer_id) {
      const customer = await Customer.findOne({
        where: { id: customer_id, tenant_id: req.tenantId },
        transaction
      });

      if (!customer) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Customer not found' });
      }
    }

    let totalAmount = 0;
    const transactionItems = [];

    // Process each item
    for (const item of items) {
      const product = await Product.findOne({
        where: { id: item.product_id, tenant_id: req.tenantId },
        transaction
      });

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ error: `Product ${item.product_id} not found` });
      }

      // Check inventory
      const inventory = await Inventory.findOne({
        where: {
          product_id: item.product_id,
          location_id: location_id,
          tenant_id: req.tenantId
        },
        transaction
      });

      if (!inventory || inventory.quantity < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({
          error: `Insufficient inventory for product ${product.name}`
        });
      }

      const itemTotal = parseFloat(product.price) * item.quantity;
      totalAmount += itemTotal;

      transactionItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
        total_price: itemTotal
      });

      // Update inventory
      await inventory.update({
        quantity: inventory.quantity - item.quantity
      }, { transaction });
    }

    // Apply discount
    totalAmount -= discount_amount;
    if (totalAmount < 0) totalAmount = 0;

    // Create transaction
    const newTransaction = await Transaction.create({
      tenant_id: req.tenantId,
      customer_id,
      location_id,
      total_amount: totalAmount,
      tax_amount: 0,
      discount_amount,
      payment_method: 'card',
      status: 'completed',
      stripe_payment_intent_id: payment_intent_id,
      stripe_charge_id: paymentIntent.charges.data[0]?.id,
      payment_status: 'succeeded'
    }, { transaction });

    // Create transaction items
    for (const item of transactionItems) {
      await TransactionItem.create({
        transaction_id: newTransaction.id,
        ...item
      }, { transaction });
    }

    await transaction.commit();

    // Fetch complete transaction with items
    const completeTransaction = await Transaction.findByPk(newTransaction.id, {
      include: [
        {
          model: TransactionItem,
          include: [Product]
        },
        Customer,
        Location
      ]
    });

    res.status(201).json({
      message: 'Payment confirmed and transaction created successfully',
      transaction: completeTransaction
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process refund
router.post('/refund/:transactionId', async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { amount, reason = 'requested_by_customer' } = req.body;

    // Find transaction
    const transaction = await Transaction.findOne({
      where: {
        id: transactionId,
        tenant_id: req.tenantId,
        stripe_charge_id: { [require('sequelize').Op.ne]: null }
      }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found or not eligible for refund' });
    }

    if (transaction.payment_status !== 'succeeded') {
      return res.status(400).json({ error: 'Transaction is not in a refundable state' });
    }

    // Process refund with Stripe
    const refundAmount = amount ? Math.round(amount * 100) : undefined;
    const refund = await stripe.refunds.create({
      charge: transaction.stripe_charge_id,
      amount: refundAmount,
      reason,
      metadata: {
        tenant_id: req.tenantId,
        transaction_id: transactionId
      }
    });

    // Update transaction status
    await transaction.update({
      status: refund.status === 'succeeded' ? 'refunded' : 'refund_pending',
      payment_status: refund.status
    });

    res.json({
      message: 'Refund processed successfully',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });

  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({ error: 'Failed to process refund' });
  }
});

// Webhook handler for Stripe events (exported separately for raw body handling)
const handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        // Update transaction status if needed
        await Transaction.update(
          {
            payment_status: 'succeeded',
            status: 'completed'
          },
          {
            where: { stripe_payment_intent_id: paymentIntent.id }
          }
        );
        break;

      case 'payment_intent.payment_failed':
        const failedPaymentIntent = event.data.object;
        await Transaction.update(
          {
            payment_status: 'failed',
            status: 'failed'
          },
          {
            where: { stripe_payment_intent_id: failedPaymentIntent.id }
          }
        );
        break;

      case 'charge.dispute.created':
        // Handle charge disputes
        const dispute = event.data.object;
        console.log('Charge dispute created:', dispute.id);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}

module.exports = router;
module.exports.handleWebhook = handleWebhook;