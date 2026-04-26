# Payments Reference — MSCE Learn

All payments go through PayChangu, which aggregates Airtel Money and TNM Mpamba.
Never trust the frontend for payment confirmation. Only the webhook grants access.

---

## Payment flow (8 steps)

```
1. Student taps "Unlock course"
2. Frontend calls POST /create-payment (backend)
3. Backend calls PayChangu API → gets payment URL / USSD trigger
4. Backend saves payment record: status = 'pending'
5. PayChangu sends USSD push to student's phone
6. Student confirms on handset
7. PayChangu calls POST /payment-callback (your webhook)
8. Backend verifies → updates status = 'paid' → creates enrollment
```

---

## Create payment endpoint

```javascript
// supabase/functions/create-payment/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'public' }, auth: { persistSession: false } }
  )

  const { course_id } = await req.json()
  const authHeader = req.headers.get('Authorization')!
  const { data: { user } } = await supabase.auth.getUser(
    authHeader.replace('Bearer ', '')
  )
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch course price
  const { data: course } = await supabase
    .from('courses')
    .select('id, title, price_mwk')
    .eq('id', course_id)
    .single()
  if (!course) return Response.json({ error: 'Course not found' }, { status: 404 })

  // Generate unique transaction reference
  const tx_ref = `MSCE-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`

  // Save pending payment record BEFORE calling PayChangu
  await supabase.from('payments').insert({
    user_id: user.id,
    course_id,
    amount_mwk: course.price_mwk,
    status: 'pending',
    tx_ref
  })

  // Call PayChangu API
  const pcRes = await fetch('https://api.paychangu.com/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('PAYCHANGU_SECRET_KEY')}`
    },
    body: JSON.stringify({
      amount: course.price_mwk,
      currency: 'MWK',
      tx_ref,
      callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-callback`,
      return_url: `${Deno.env.get('APP_URL')}/payment/status?tx_ref=${tx_ref}`,
      customization: {
        title: 'MSCE Learn',
        description: `Unlock: ${course.title}`
      }
    })
  })

  const pcData = await pcRes.json()
  if (!pcRes.ok) {
    await supabase.from('payments').update({ status: 'failed' }).eq('tx_ref', tx_ref)
    return Response.json({ error: 'Payment initiation failed' }, { status: 502 })
  }

  return Response.json({ data: { payment_url: pcData.data?.link, tx_ref } })
})
```

---

## Webhook endpoint (most critical)

```javascript
// supabase/functions/payment-callback/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { hmac } from 'https://esm.sh/fast-hmac@1'

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const body = await req.text()

  // ── Step 1: Verify webhook signature ─────────────────────────────
  const sig = req.headers.get('x-paychangu-signature')
  const expected = hmac('sha256', Deno.env.get('PAYCHANGU_WEBHOOK_SECRET')!, body)
  if (sig !== expected) {
    console.error('Invalid webhook signature')
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(body)
  const { tx_ref, status } = payload

  // ── Step 2: Re-fetch from PayChangu API (never trust payload alone) ─
  const verifyRes = await fetch(`https://api.paychangu.com/verify-payment/${tx_ref}`, {
    headers: { 'Authorization': `Bearer ${Deno.env.get('PAYCHANGU_SECRET_KEY')}` }
  })
  const verified = await verifyRes.json()

  if (verified.data?.status !== 'successful') {
    await supabase.from('payments')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('tx_ref', tx_ref)
    return new Response('OK', { status: 200 }) // always 200 to PayChangu
  }

  // ── Step 3: Check amount matches ──────────────────────────────────
  const { data: payment } = await supabase
    .from('payments')
    .select('*, courses(price_mwk)')
    .eq('tx_ref', tx_ref)
    .single()

  if (!payment) return new Response('OK', { status: 200 })
  if (verified.data.amount !== payment.courses.price_mwk) {
    console.error(`Amount mismatch: expected ${payment.courses.price_mwk}, got ${verified.data.amount}`)
    return new Response('OK', { status: 200 })
  }

  // ── Step 4: Idempotency check ─────────────────────────────────────
  if (payment.status === 'paid') {
    return new Response('Already processed', { status: 200 })
  }

  // ── Step 5: Grant access ──────────────────────────────────────────
  await supabase.from('payments')
    .update({ status: 'paid', updated_at: new Date().toISOString() })
    .eq('tx_ref', tx_ref)

  await supabase.from('enrollments').upsert({
    user_id: payment.user_id,
    course_id: payment.course_id,
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  }, { onConflict: 'user_id,course_id' })

  console.log(`Access granted: user=${payment.user_id} course=${payment.course_id}`)
  return new Response('OK', { status: 200 })
})
```

---

## Rules — never break these

- Always return HTTP 200 to PayChangu even on errors (otherwise they retry endlessly)
- Always verify the HMAC signature before processing anything
- Always re-fetch from PayChangu API — never trust the webhook payload status alone
- Always check amount matches the expected course price
- Always check idempotency (`status === 'paid'`) before granting access
- The `pending` record must be saved BEFORE calling PayChangu, not after

---

## Payment status polling (frontend)

After redirecting the student back from PayChangu, poll for status:

```javascript
// Poll every 3 seconds, max 10 attempts
async function pollPaymentStatus(tx_ref) {
  for (let i = 0; i < 10; i++) {
    const { data } = await supabase
      .from('payments')
      .select('status')
      .eq('tx_ref', tx_ref)
      .single()

    if (data?.status === 'paid') return 'paid'
    if (data?.status === 'failed') return 'failed'
    await new Promise(r => setTimeout(r, 3000))
  }
  return 'timeout'
}
```

---

## Test credentials (PayChangu sandbox)

```bash
# Sandbox base URL
https://api.paychangu.com  # same URL, use test keys

# Test phone numbers (Airtel sandbox)
0881234567  # always succeeds
0889999999  # always fails (insufficient funds)

# Set test keys in Supabase secrets:
supabase secrets set PAYCHANGU_SECRET_KEY=sk_test_...
supabase secrets set PAYCHANGU_WEBHOOK_SECRET=whsec_test_...
```
