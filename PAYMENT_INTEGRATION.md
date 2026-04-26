# MSCE Learn - PayChangu Payment Integration

This document describes the complete PayChangu payment integration for MSCE Learn, implementing security-critical payment processing with mobile money support.

## Overview

The payment system enables Malawian students to purchase course access using Airtel Money and TNM Mpamba through PayChangu's secure payment gateway. The implementation follows strict security measures to prevent fraud and ensure reliable payment processing.

## Security Architecture

### Core Security Principles
1. **Server-side price validation** - Prices fetched from database, never trusted from frontend
2. **JWT-based user identification** - User ID extracted from JWT, not request body
3. **HMAC signature verification** - Timing-safe comparison for webhook authenticity
4. **Idempotency protection** - Prevents duplicate payment processing
5. **Comprehensive audit logging** - All payment events logged for security monitoring

### 4-Step Webhook Verification
The payment callback follows a strict 4-step verification process:

1. **HMAC timingSafeEqual verification** - Prevents timing attacks on signature comparison
2. **PayChangu API re-fetch** - Verifies transaction status directly from PayChangu
3. **Amount verification** - Ensures webhook amount matches database record
4. **Idempotency check** - Prevents duplicate processing of paid transactions

## Components

### PaymentModal (`src/components/payment/PaymentModal.jsx`)

**Props:**
```javascript
{
  course: {
    id, title, price_mwk
  },
  onClose: Function,
  onSuccess: Function
}
```

**States:**
- **idle**: Phone input, price display, Pay button
- **loading**: "Sending prompt to your phone..." with spinner
- **polling**: "Check your phone — confirm the USSD prompt" with auto-polling
- **success**: Green tick, "Access unlocked for 30 days", redirect button
- **failed**: Error message, Try Again button

**Features:**
- Malawi phone validation (08x/09x format)
- Auto-formatting phone input
- Payment URL opening in new window
- 5-second polling for up to 60 seconds
- Comprehensive error handling

### PaymentStatus (`src/components/payment/PaymentStatus.jsx`)

**Route:** `/payment/status?tx_ref=xxx`

**Features:**
- PayChangu return_url handler
- Payment status polling and verification
- Auto-redirect to course on success
- Error handling with retry options
- Transaction ID display

## Backend API

### Create Payment (`supabase/functions/create-payment/index.ts`)

**Endpoint:** `POST /create-payment`

**Authentication:** Required (requireAuth)

**Request Body:**
```json
{
  "course_id": "uuid",
  "phone_number": "0881234567"
}
```

**Security Measures:**
- Course price fetched from database (never from request)
- Transaction reference generation: `MSCE-{timestamp}-{8-char-uuid}`
- Payment record created BEFORE PayChangu API call
- Existing enrollment check to prevent duplicates

**Response:**
```json
{
  "success": true,
  "data": {
    "tx_ref": "MSCE-1703123456789-abc12345",
    "payment_url": "https://api.paychangu.com/checkout/...",
    "amount": 5000,
    "course_title": "Mathematics - Chapter 1"
  }
}
```

### Payment Callback (`supabase/functions/payment-callback/index.ts`)

**Endpoint:** `POST /payment-callback` (PayChangu webhook)

**Security Implementation:**

#### Step 1: HMAC Verification
```typescript
const hmacKey = await crypto.subtle.importKey(
  'raw',
  new TextEncoder().encode(PAYCHANGU_SECRET_KEY),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify']
)

const expectedSignature = await crypto.subtle.sign(
  'HMAC',
  hmacKey,
  new TextEncoder().encode(rawBody)
)

// Use timingSafeEqual to prevent timing attacks
if (!timingSafeEqual(new Uint8Array(expectedSignature), providedSignature)) {
  return errorResponse('Invalid signature', 401)
}
```

#### Step 2: PayChangu API Re-fetch
```typescript
const paychanguResponse = await fetch(`${PAYCHANGU_API_URL}/payment/${tx_ref}`, {
  headers: {
    'Authorization': `Bearer ${PAYCHANGU_SECRET_KEY}`
  }
})
```

#### Step 3: Amount Verification
```typescript
if (payment.amount_mwk !== webhook.amount) {
  await logSecurityEvent('amount_mismatch', { 
    tx_ref, 
    expected: payment.amount_mwk, 
    received: webhook.amount 
  })
  return errorResponse('Amount verification failed', 400)
}
```

#### Step 4: Idempotency Check
```typescript
if (payment.status === 'paid') {
  return successResponse({ message: 'Already processed' })
}
```

**Response:** Always HTTP 200 to prevent PayChangu retries

### Get Payment Status (`supabase/functions/get-payment-status/index.ts`)

**Endpoint:** `GET /payment-status?tx_ref=xxx`

**Authentication:** Required (requireAuth)

**Response:**
```json
{
  "success": true,
  "data": {
    "tx_ref": "MSCE-1703123456789-abc12345",
    "status": "paid",
    "amount_mwk": 5000,
    "phone_number": "0881234567",
    "created_at": "2024-01-01T10:00:00Z",
    "course": {
      "id": "uuid",
      "title": "Mathematics - Chapter 1",
      "subject": "Mathematics",
      "grade": "MSCE"
    },
    "enrollment": {
      "id": "uuid",
      "expires_at": "2024-01-31T10:00:00Z",
      "status": "active",
      "days_remaining": 30,
      "is_active": true
    }
  }
}
```

## Frontend Hooks

### usePayment (`src/hooks/usePayment.js`)

**Methods:**
- `handlePay(courseId, phoneNumber)` - Initiates payment flow
- `pollStatus(txRef, timeoutMs)` - Polls payment status with timeout
- `getStatus(txRef)` - Single status check
- `clearError()` - Clears error state

**Usage:**
```javascript
const { handlePay, pollStatus, loading, error } = usePayment()

const result = await handlePay(courseId, phoneNumber)
if (result.success) {
  // Payment successful
  navigate(`/course/${courseId}`)
}
```

### usePaymentPoll (`src/hooks/usePayment.js`)

**React Hook for Payment Polling:**
```javascript
const { status, paymentData, error } = usePaymentPoll(
  txRef,
  onSuccess, // Callback for successful payment
  onFailure, // Callback for failed payment
  60000     // Timeout in milliseconds
)
```

## Payment Flow

### User Journey

1. **Course Selection**
   - User clicks "Unlock Course" on course detail page
   - PaymentModal opens with course information

2. **Payment Initiation**
   - User enters Malawi phone number (08x/09x format)
   - System validates phone number format
   - Payment record created in database (status: pending)
   - PayChangu payment URL opened in new window

3. **Mobile Money Confirmation**
   - User receives USSD prompt on phone
   - User confirms payment via Airtel Money/TNM Mpamba
   - System polls payment status every 5 seconds

4. **Payment Completion**
   - Webhook receives payment confirmation
   - 4-step verification process executed
   - Enrollment created (30 days access)
   - User redirected to course with full access

### Technical Flow

```
Frontend → /create-payment → PayChangu API → Payment Window
                ↓
            Database (pending payment)
                ↓
            User confirms on phone
                ↓
PayChangu → /payment-callback → Verification → Enrollment
                ↓
            Frontend polling → Success → Course access
```

## Error Handling

### Frontend Errors
- **Phone validation**: Clear error messages for invalid formats
- **Network errors**: Retry options and graceful degradation
- **Timeouts**: 60-second timeout with clear messaging
- **Payment failures**: User-friendly error display with retry

### Backend Errors
- **Database errors**: Comprehensive logging and error responses
- **PayChangu API errors**: Fallback handling and status updates
- **Security violations**: Audit logging and HTTP 401 responses
- **Webhook failures**: Always return HTTP 200 to prevent retries

## Security Monitoring

### Audit Events
- `payment.initiated` - Payment creation
- `payment.success` - Successful payment completion
- `payment.failed` - Payment failure
- `security_alert` - Security violations and anomalies

### Security Events Logged
- Invalid HMAC signatures
- Amount mismatches
- Missing payment records
- Status verification failures
- Webhook processing errors

### Monitoring Metrics
- Payment success rate
- Average payment completion time
- Security alert frequency
- API error rates

## Environment Variables

```bash
# PayChangu Configuration
PAYCHANGU_SECRET_KEY=your_paychangu_secret_key
PAYCHANGU_PUBLIC_KEY=your_paychangu_public_key

# Application URLs
APP_URL=https://your-domain.com

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing

### Payment Testing
1. **Test phone numbers**: Use PayChangu test numbers
2. **Amount verification**: Test various price points
3. **Webhook testing**: Use ngrok for local webhook testing
4. **Security testing**: Test HMAC verification and timing attacks
5. **Error scenarios**: Test network failures and timeouts

### Security Testing
1. **HMAC manipulation**: Attempt signature bypass
2. **Amount tampering**: Try modifying payment amounts
3. **Idempotency testing**: Duplicate webhook submissions
4. **JWT manipulation**: Invalid token scenarios
5. **SQL injection**: Input validation testing

## Compliance

### PayChangu Requirements
- HMAC signature verification
- Proper webhook response handling
- Transaction reference formatting
- Mobile money number validation
- Amount and currency specifications

### Data Protection
- Phone number encryption in database
- Secure API key management
- Audit trail maintenance
- User privacy protection

## Future Enhancements

**Planned Features:**
- Multiple payment methods (cards, bank transfers)
- Subscription-based payments
- Payment analytics and reporting
- Refund processing
- Payment dispute handling
- Advanced fraud detection

The PayChangu payment integration provides a secure, reliable, and user-friendly payment system that enables Malawian students to easily purchase course access using their preferred mobile money services while maintaining the highest security standards.
