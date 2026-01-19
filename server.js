const express = require('express');
const cors = require('cors');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5000;

// Middleware
const corsOptions = {
    origin: [
        'https://bank-front-chi.vercel.app',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://localhost:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));
app.use(express.json());

// In-memory store for demo (no database)
const demoBalance = 100000; // KES 100,000 demo balance

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'Stripe Money System',
        mode: process.env.NODE_ENV || 'development',
        stripe: 'active'
    });
});

// Get available balance
app.get('/api/balance', (req, res) => {
    res.json({
        success: true,
        balance: demoBalance,
        currency: 'KES',
        message: 'Demo balance for testing'
    });
});

// Process WITHDRAWAL (Bank or M-Pesa)
app.post('/api/withdraw', async (req, res) => {
    try {
        const { amount, method, accountDetails, phoneNumber, accountName } = req.body;
        
        console.log('Withdrawal request:', { amount, method, accountDetails, phoneNumber });
        
        // Validation
        if (!amount || amount < 100) {
            return res.json({
                success: false,
                message: 'Amount must be at least KES 100'
            });
        }
        
        if (amount > demoBalance) {
            return res.json({
                success: false,
                message: `Insufficient balance. Available: KES ${demoBalance}`
            });
        }
        
        if (amount > 1000000) {
            return res.json({
                success: false,
                message: 'Maximum withdrawal is KES 1,000,000'
            });
        }
        
        if (!method || !['bank', 'mpesa'].includes(method)) {
            return res.json({
                success: false,
                message: 'Please select withdrawal method (bank or mpesa)'
            });
        }
        
        // Validate method-specific details
        if (method === 'bank') {
            if (!accountDetails || !accountName) {
                return res.json({
                    success: false,
                    message: 'Bank account details required'
                });
            }
        } else if (method === 'mpesa') {
            if (!phoneNumber || !/^[0-9]{10}$/.test(phoneNumber)) {
                return res.json({
                    success: false,
                    message: 'Valid 10-digit M-Pesa number required'
                });
            }
        }
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Generate transaction ID
        const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Calculate fees
        const fees = method === 'bank' ? 50 : 25;
        const netAmount = amount - fees;
        
        // Create Stripe Transfer for REAL implementation
        // For demo, we simulate success 90% of the time
        const isSuccess = Math.random() > 0.1; // 90% success rate
        
        if (isSuccess) {
            console.log(`✅ Withdrawal SUCCESS: KES ${amount} via ${method}`);
            
            res.json({
                success: true,
                message: `Withdrawal of KES ${amount} processed successfully!`,
                transactionId: transactionId,
                amount: amount,
                fees: fees,
                netAmount: netAmount,
                method: method,
                status: 'completed',
                timestamp: new Date().toISOString(),
                reference: `REF${Date.now()}`
            });
        } else {
            console.log(`❌ Withdrawal FAILED: KES ${amount} via ${method}`);
            
            res.json({
                success: false,
                message: 'Payment processing failed. Please try again.',
                transactionId: transactionId,
                status: 'failed'
            });
        }
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.json({
            success: false,
            message: 'System error: ' + error.message
        });
    }
});

// Process DEPOSIT (Card payment via Stripe Checkout)
app.post('/api/deposit', async (req, res) => {
    try {
        const { amount, returnUrl } = req.body;
        
        if (!amount || amount < 100) {
            return res.json({
                success: false,
                message: 'Minimum deposit is KES 100'
            });
        }
        
        if (amount > 500000) {
            return res.json({
                success: false,
                message: 'Maximum deposit is KES 500,000'
            });
        }
        
        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: 'kes',
                    product_data: {
                        name: 'Money Deposit',
                        description: `Deposit KES ${amount} to your account`
                    },
                    unit_amount: Math.round(amount * 100), // Convert to cents
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: returnUrl || 'https://bank-front-chi.vercel.app/?success=true&type=deposit',
            cancel_url: returnUrl || 'https://bank-front-chi.vercel.app/?canceled=true',
            metadata: {
                type: 'deposit',
                amount: amount.toString()
            }
        });
        
        res.json({
            success: true,
            message: 'Deposit session created',
            sessionId: session.id,
            url: session.url,
            amount: amount
        });
        
    } catch (error) {
        console.error('Deposit error:', error);
        res.json({
            success: false,
            message: 'Failed to create deposit: ' + error.message
        });
    }
});

// Stripe webhook for real payments (optional)
app.post('/api/webhook', express.raw({type: 'application/json'}), (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            console.log('💰 Payment completed:', session.id);
            break;
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object;
            console.log('💳 Payment succeeded:', paymentIntent.id);
            break;
        default:
            console.log(`Unhandled event type: ${event.type}`);
    }
    
    res.json({received: true});
});

// Start server
app.listen(port, () => {
    console.log('='.repeat(50));
    console.log('💰 STRIPE MONEY SYSTEM BACKEND');
    console.log('='.repeat(50));
    console.log(`🚀 Server: http://localhost:${port}`);
    console.log(`🔗 Frontend: https://bank-front-chi.vercel.app`);
    console.log(`💳 Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📊 Demo Balance: KES ${demoBalance.toLocaleString()}`);
    console.log('✅ Bank & M-Pesa withdrawals ready');
    console.log('✅ Stripe Checkout deposits ready');
    console.log('='.repeat(50));
});
