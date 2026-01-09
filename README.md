# Money Withdrawal System - Backend

A Node.js/Express backend for processing withdrawal transactions with integrated payment gateways.

## Features

✅ **Payment Gateway Integrations:**
- Stripe (Bank transfers)
- Flutterwave (Mobile & International transfers)
- Pusher (Real-time notifications)

✅ **Functionality:**
- RESTful API endpoints for withdrawals
- Support for bank transfers and M-Pesa
- Real-time transaction notifications
- Development and production modes
- Configurable amount limits (KES 100 - 1,000,000)

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory with the following variables:

```env
PORT=5000
NODE_ENV=development

# Stripe Keys
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLIC_KEY=pk_test_xxxxx

# Flutterwave Keys
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_xxxxx
FLUTTERWAVE_SECRET_HASH=xxxxx

# Pusher Keys
PUSHER_APP_ID=xxxxx
PUSHER_KEY=xxxxx
PUSHER_SECRET=xxxxx
PUSHER_CLUSTER=ap4

# Optional - SUDO API
SUDO_API_KEY=xxxxx
SUDO_VAULT_ID=xxxxx
```

## Running

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Endpoints

### Test Endpoints
- `GET /api/test` - Test if backend is running
- `GET /api/health` - Health check

### Main Endpoints
- `POST /api/withdraw` - Process withdrawal
- `GET /api/banks` - Get list of banks
- `GET /api/transactions` - Get transaction history (returns empty in dev mode)

### Withdraw Request Body

```json
{
  "amount": 1000,
  "withdrawalMethod": "bank",
  "paymentMethod": "stripe",
  "accountName": "John Doe",
  "accountNumber": "1234567890",
  "bankCode": "01"
}
```

## Environment Modes

### Development Mode
- Test/Sandbox API keys
- No real transactions
- Safe for testing and development

### Production Mode
- Requires live API keys
- Real transactions processed
- Proper error handling and logging required

## Dependencies

- `express` - Web framework
- `cors` - Cross-origin requests
- `dotenv` - Environment variables
- `axios` - HTTP client
- `stripe` - Stripe payment processor
- `pusher` - Real-time notifications
- `nodemon` - Auto-restart during development

## Security Notes

⚠️ **Important:**
- Never commit `.env` file to version control
- Use environment variables in production
- Keep API keys secure
- Use HTTPS in production
- Implement rate limiting
- Add authentication for production

## Switching to Production

1. Get live API keys from:
   - Stripe: https://dashboard.stripe.com/apikeys
   - Flutterwave: https://dashboard.flutterwave.com/settings/api

2. Update `.env`:
   ```env
   NODE_ENV=production
   STRIPE_SECRET_KEY=sk_live_xxxxx
   STRIPE_PUBLIC_KEY=pk_live_xxxxx
   FLUTTERWAVE_SECRET_KEY=FLWSECK_LIVE_xxxxx
   ```

3. Deploy to production server

## Error Handling

All endpoints return JSON responses with status indicators:

```json
{
  "success": true/false,
  "message": "Description of result",
  "transactionId": "TXN_xxxxx",
  "reference": "REF_xxxxx"
}
```

## License

ISC

## Author

Tech-GE
