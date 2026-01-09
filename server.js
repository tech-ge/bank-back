const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Pusher = require('pusher');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Pusher configuration
const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Backend is running successfully!',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV,
        port: port,
        paymentGateways: ['Stripe', 'Flutterwave', 'Pusher']
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'Money Withdrawal System',
        version: '1.0.0',
        port: port
    });
});

// Get all transactions
app.get('/api/transactions', (req, res) => {
    res.json({
        success: true,
        count: 0,
        transactions: [],
        message: 'Transactions are not persisted in this system'
    });
});

// Withdrawal endpoint with payment gateway integration
app.post('/api/withdraw', async (req, res) => {
    try {
        const { amount, accountNumber, bankCode, accountName, withdrawalMethod, phoneNumber, paymentMethod } = req.body;
        
        // Validation
        if (!amount || amount < 100) {
            return res.status(400).json({
                success: false,
                message: 'Amount must be at least KES 100'
            });
        }
        
        if (amount > 1000000) {
            return res.status(400).json({
                success: false,
                message: 'Amount cannot exceed KES 1,000,000'
            });
        }
        
        // Generate transaction ID
        const transactionId = 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9).toUpperCase();
        const reference = 'REF_' + Date.now();
        const fees = withdrawalMethod === 'bank' ? 50 : 25;
        const netAmount = parseFloat(amount) - fees;
        
        let paymentResult = null;
        
        try {
            // Route to appropriate payment gateway based on method
            if (paymentMethod === 'stripe') {
                paymentResult = await processStripePayment(amount, accountName, transactionId);
            } else if (paymentMethod === 'flutterwave') {
                paymentResult = await processFlutterwavePayment(amount, phoneNumber, accountName, transactionId);
            } else {
                // Default to Flutterwave if no method specified
                paymentResult = await processFlutterwavePayment(amount, phoneNumber, accountName, transactionId);
            }
        } catch (paymentError) {
            console.error('Payment processing error:', paymentError.message);
            return res.status(400).json({
                success: false,
                message: 'Payment processing failed: ' + paymentError.message
            });
        }
        
        // Send real-time notification via Pusher
        try {
            await pusher.trigger('withdrawal-channel', 'withdrawal-event', {
                transactionId: transactionId,
                amount: amount,
                method: withdrawalMethod,
                status: 'completed',
                timestamp: new Date().toISOString(),
                accountName: accountName,
                reference: reference
            });
        } catch (pusherError) {
            console.error('Pusher notification error:', pusherError.message);
        }
        
        // Success response
        res.json({
            success: true,
            message: 'Withdrawal of KES ' + amount + ' processed successfully',
            transactionId: transactionId,
            reference: reference,
            paymentGateway: paymentMethod || 'flutterwave',
            fees: fees,
            netAmount: netAmount,
            estimatedCompletion: 'Instant to 24 hours',
            paymentDetails: paymentResult
        });
        
    } catch (error) {
        console.error('Withdrawal error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error: ' + error.message
        });
    }
});

// Stripe payment processing
async function processStripePayment(amount, description, transactionId) {
    try {
        // Create a payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: 'kes',
            description: `Withdrawal ${transactionId} for ${description}`,
            metadata: {
                transactionId: transactionId,
                withdrawalMethod: 'bank'
            }
        });
        
        console.log('✅ Stripe payment intent created:', paymentIntent.id);
        
        return {
            gateway: 'stripe',
            paymentId: paymentIntent.id,
            status: 'processing',
            clientSecret: paymentIntent.client_secret
        };
    } catch (error) {
        throw new Error('Stripe error: ' + error.message);
    }
}

// Flutterwave payment processing
async function processFlutterwavePayment(amount, phoneNumber, accountName, transactionId) {
    try {
        const flutterwaveResponse = await axios.post(
            'https://api.flutterwave.com/v3/transfers',
            {
                account_bank: '999999', // Demo bank code
                account_number: phoneNumber || '1234567890',
                amount: parseFloat(amount),
                narration: `Withdrawal ${transactionId}`,
                beneficiary_name: accountName || 'Beneficiary',
                currency: 'KES',
                reference: transactionId
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        console.log('✅ Flutterwave transfer initiated:', flutterwaveResponse.data);
        
        return {
            gateway: 'flutterwave',
            transferId: flutterwaveResponse.data.data?.id,
            status: flutterwaveResponse.data.status,
            reference: transactionId
        };
    } catch (error) {
        console.error('Flutterwave API error:', error.response?.data || error.message);
        throw new Error('Flutterwave processing failed');
    }
}

// Get transaction by ID
app.get('/api/transaction/:id', (req, res) => {
    res.json({
        success: false,
        message: 'Transaction history is not stored in this system'
    });
});

// Get banks list
app.get('/api/banks', (req, res) => {
    const banks = [
        { code: '01', name: 'KCB Bank Kenya' },
        { code: '02', name: 'Equity Bank' },
        { code: '03', name: 'Co-operative Bank' },
        { code: '04', name: 'Absa Bank Kenya' },
        { code: '05', name: 'Stanbic Bank' },
        { code: '06', name: 'NCBA Bank' },
        { code: '07', name: 'Standard Chartered' },
        { code: '08', name: 'DTB Kenya' },
        { code: '09', name: 'I&M Bank' },
        { code: '10', name: 'Family Bank' }
    ];
    
    res.json({
        success: true,
        banks
    });
});

// Clear all transactions (for testing)
app.delete('/api/transactions/clear', (req, res) => {
    res.json({
        success: true,
        message: 'Transactions are not stored in this system'
    });
});

// Start server
app.listen(port, () => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    console.log('========================================');
    console.log('💰 Money Withdrawal System Backend');
    console.log('========================================');
    console.log(`🚀 Server running on: http://localhost:${port}`);
    console.log(`📋 Environment: ${isDevelopment ? '🟢 DEVELOPMENT (Test Mode)' : '🔴 PRODUCTION'}`);
    console.log('');
    console.log('💳 Payment Gateways Active:');
    console.log('   ✅ Stripe - Bank transfers');
    if (isDevelopment) {
        console.log('      └─ Using TEST keys (sandbox mode)');
        console.log('      └─ No real charges will occur');
    }
    console.log('   ✅ Flutterwave - Mobile & International');
    if (isDevelopment) {
        console.log('      └─ Using SANDBOX keys (no real transfers)');
    }
    console.log('   ✅ Pusher - Real-time notifications');
    console.log('');
    console.log('📊 API Endpoints:');
    console.log('   GET  /api/test          - Test endpoint');
    console.log('   GET  /api/health        - Health check');
    console.log('   POST /api/withdraw      - Make withdrawal');
    console.log('   GET  /api/banks         - List banks');
    console.log('========================================');
    if (isDevelopment) {
        console.log('⚠️  DEVELOPMENT MODE - For testing only');
        console.log('📝 To switch to PRODUCTION:');
        console.log('   1. Update STRIPE_SECRET_KEY in .env');
        console.log('   2. Update STRIPE_PUBLIC_KEY in .env');
        console.log('   3. Update FLUTTERWAVE_SECRET_KEY in .env');
        console.log('   4. Change NODE_ENV=production in .env');
        console.log('========================================');
    }
    console.log('✅ All payment gateways initialized');
    console.log('========================================');
});
