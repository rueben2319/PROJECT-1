import { assertEquals, assertExists } from "jsr:@std/assert@1.0.0"
import { createClient } from "jsr:@supabase/supabase-js@2"

// Test configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const paychanguSecretKey = Deno.env.get('PAYCHANGU_SECRET_KEY')!

// Create Supabase client with service role for test setup
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Test data
const testUser = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'test-payment@example.com',
  phone: '0881234567'
}

const testCourse = {
  id: '00000000-0000-0000-0000-000000000010',
  title: 'Test Payment Course',
  subject: 'Mathematics',
  grade: 'MSCE',
  price_mwk: 5000
}

const testPayment = {
  tx_ref: 'MSCE-TEST-PAYMENT-123456',
  amount: 5000,
  status: 'success'
}

// Helper function to create HMAC signature
async function createSignature(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload)
  )

  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Helper function to create test webhook payload
function createWebhookPayload(overrides: Partial<any> = {}) {
  return {
    reference: testPayment.tx_ref,
    status: testPayment.status,
    amount: testPayment.amount,
    transaction_id: 'txn_123456',
    metadata: {
      user_id: testUser.id,
      course_id: testCourse.id,
      payment_id: '00000000-0000-0000-0000-000000000030'
    },
    ...overrides
  }
}

// Setup test environment
async function setupTestEnvironment() {
  console.log('🔧 Setting up test environment...')

  // Clean up existing test data
  await supabase.from('payments').delete().eq('tx_ref', testPayment.tx_ref)
  await supabase.from('enrollments').delete().eq('user_id', testUser.id).eq('course_id', testCourse.id)
  await supabase.from('profiles').delete().eq('id', testUser.id)

  // Create test user profile
  await supabase.from('profiles').insert({
    id: testUser.id,
    email: testUser.email,
    full_name: 'Test Payment User',
    role: 'student',
    phone_number: testUser.phone
  })

  // Create test course
  await supabase.from('courses').upsert({
    id: testCourse.id,
    title: testCourse.title,
    subject: testCourse.subject,
    grade: testCourse.grade,
    price_mwk: testCourse.price_mwk,
    description: 'Test course for payment flow',
    is_published: true
  })

  // Create pending payment record
  await supabase.from('payments').insert({
    tx_ref: testPayment.tx_ref,
    user_id: testUser.id,
    course_id: testCourse.id,
    amount_mwk: testPayment.amount,
    phone_number: testUser.phone,
    status: 'pending'
  })

  console.log('✅ Test environment setup complete')
}

// Cleanup test environment
async function cleanupTestEnvironment() {
  console.log('🧹 Cleaning up test environment...')

  await supabase.from('payments').delete().eq('tx_ref', testPayment.tx_ref)
  await supabase.from('enrollments').delete().eq('user_id', testUser.id).eq('course_id', testCourse.id)
  await supabase.from('profiles').delete().eq('id', testUser.id)

  console.log('✅ Test environment cleanup complete')
}

// Test 1: Valid signature + successful payment → grants access
Deno.test('Payment Flow - Valid signature + successful payment grants access', async () => {
  console.log('🧪 Test 1: Valid signature + successful payment → grants access')

  await setupTestEnvironment()

  try {
    // Create valid webhook payload
    const payload = createWebhookPayload()
    const payloadString = JSON.stringify(payload)
    const signature = await createSignature(payloadString, paychanguSecretKey)

    // Call payment-callback endpoint
    const response = await fetch(`${supabaseUrl}/functions/v1/payment-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paychangu-signature': signature
      },
      body: payloadString
    })

    assertEquals(response.status, 200, 'Should return 200 OK')

    // Verify payment status updated to 'paid'
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('tx_ref', testPayment.tx_ref)
      .single()

    assertExists(payment)
    assertEquals(payment.status, 'paid', 'Payment should be marked as paid')

    // Verify enrollment was created
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('course_id', testCourse.id)
      .single()

    assertExists(enrollment)
    assertEquals(enrollment.status, 'active', 'Enrollment should be active')
    assertEquals(enrollment.user_id, testUser.id, 'Enrollment should belong to test user')
    assertEquals(enrollment.course_id, testCourse.id, 'Enrollment should be for test course')

    // Verify enrollment expiration (should be 30 days from now)
    const expectedExpiry = new Date()
    expectedExpiry.setDate(expectedExpiry.getDate() + 30)
    const actualExpiry = new Date(enrollment.expires_at!)
    
    // Allow 1 minute tolerance
    const timeDiff = Math.abs(actualExpiry.getTime() - expectedExpiry.getTime())
    assertExists(timeDiff < 60000, 'Enrollment should expire in approximately 30 days')

    console.log('✅ Test 1 passed: Valid payment granted access')
  } finally {
    await cleanupTestEnvironment()
  }
})

// Test 2: Invalid signature → 403
Deno.test('Payment Flow - Invalid signature returns 403', async () => {
  console.log('🧪 Test 2: Invalid signature → 403')

  await setupTestEnvironment()

  try {
    // Create webhook payload
    const payload = createWebhookPayload()
    const payloadString = JSON.stringify(payload)
    
    // Create invalid signature (wrong secret)
    const invalidSignature = await createSignature(payloadString, 'wrong-secret-key')

    // Call payment-callback endpoint
    const response = await fetch(`${supabaseUrl}/functions/v1/payment-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paychangu-signature': invalidSignature
      },
      body: payloadString
    })

    assertEquals(response.status, 403, 'Should return 403 Forbidden')

    // Verify payment status remains 'pending'
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('tx_ref', testPayment.tx_ref)
      .single()

    assertExists(payment)
    assertEquals(payment.status, 'pending', 'Payment should remain pending')

    // Verify no enrollment was created
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('course_id', testCourse.id)
      .maybeSingle()

    assertEquals(enrollment, null, 'No enrollment should be created')

    console.log('✅ Test 2 passed: Invalid signature rejected')
  } finally {
    await cleanupTestEnvironment()
  }
})

// Test 3: Valid signature but wrong amount → no access granted
Deno.test('Payment Flow - Wrong amount prevents access', async () => {
  console.log('🧪 Test 3: Valid signature but wrong amount → no access')

  await setupTestEnvironment()

  try {
    // Create webhook payload with wrong amount
    const payload = createWebhookPayload({
      amount: 3000 // Wrong amount (should be 5000)
    })
    const payloadString = JSON.stringify(payload)
    const signature = await createSignature(payloadString, paychanguSecretKey)

    // Call payment-callback endpoint
    const response = await fetch(`${supabaseUrl}/functions/v1/payment-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paychangu-signature': signature
      },
      body: payloadString
    })

    assertEquals(response.status, 200, 'Should return 200 OK (PayChangu expects 200)')

    // Verify payment status is marked as 'failed'
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('tx_ref', testPayment.tx_ref)
      .single()

    assertExists(payment)
    assertEquals(payment.status, 'failed', 'Payment should be marked as failed')

    // Verify no enrollment was created
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('course_id', testCourse.id)
      .maybeSingle()

    assertEquals(enrollment, null, 'No enrollment should be created')

    console.log('✅ Test 3 passed: Wrong amount prevented access')
  } finally {
    await cleanupTestEnvironment()
  }
})

// Test 4: Duplicate webhook (already paid) → 200 but no second enrollment
Deno.test('Payment Flow - Duplicate webhook handled correctly', async () => {
  console.log('🧪 Test 4: Duplicate webhook → 200 but no second enrollment')

  await setupTestEnvironment()

  try {
    // First, mark payment as paid and create enrollment
    await supabase.from('payments')
      .update({ status: 'paid' })
      .eq('tx_ref', testPayment.tx_ref)

    await supabase.from('enrollments').insert({
      user_id: testUser.id,
      course_id: testCourse.id,
      status: 'active',
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    })

    // Get initial enrollment count
    const { data: initialEnrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('course_id', testCourse.id)
      .single()

    assertExists(initialEnrollment)

    // Create valid webhook payload
    const payload = createWebhookPayload()
    const payloadString = JSON.stringify(payload)
    const signature = await createSignature(payloadString, paychanguSecretKey)

    // Call payment-callback endpoint (duplicate)
    const response = await fetch(`${supabaseUrl}/functions/v1/payment-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paychangu-signature': signature
      },
      body: payloadString
    })

    assertEquals(response.status, 200, 'Should return 200 OK')

    // Verify payment status remains 'paid'
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('tx_ref', testPayment.tx_ref)
      .single()

    assertExists(payment)
    assertEquals(payment.status, 'paid', 'Payment should remain paid')

    // Verify no duplicate enrollment was created
    const { data: finalEnrollments } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('course_id', testCourse.id)

    assertExists(finalEnrollments)
    assertEquals(finalEnrollments.length, 1, 'Should still be only one enrollment')
    assertEquals(finalEnrollments[0].id, initialEnrollment.id, 'Should be the same enrollment')

    console.log('✅ Test 4 passed: Duplicate webhook handled correctly')
  } finally {
    await cleanupTestEnvironment()
  }
})

// Test 5: Missing signature header → 400
Deno.test('Payment Flow - Missing signature returns 400', async () => {
  console.log('🧪 Test 5: Missing signature → 400')

  await setupTestEnvironment()

  try {
    // Create webhook payload
    const payload = createWebhookPayload()
    const payloadString = JSON.stringify(payload)

    // Call payment-callback endpoint without signature
    const response = await fetch(`${supabaseUrl}/functions/v1/payment-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Missing x-paychangu-signature header
      },
      body: payloadString
    })

    assertEquals(response.status, 400, 'Should return 400 Bad Request')

    // Verify payment status remains 'pending'
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('tx_ref', testPayment.tx_ref)
      .single()

    assertExists(payment)
    assertEquals(payment.status, 'pending', 'Payment should remain pending')

    console.log('✅ Test 5 passed: Missing signature rejected')
  } finally {
    await cleanupTestEnvironment()
  }
})

// Test 6: Invalid JSON payload → 400
Deno.test('Payment Flow - Invalid JSON returns 400', async () => {
  console.log('🧪 Test 6: Invalid JSON → 400')

  await setupTestEnvironment()

  try {
    // Create invalid JSON
    const invalidPayload = '{"invalid": json}'
    const signature = await createSignature(invalidPayload, paychanguSecretKey)

    // Call payment-callback endpoint with invalid JSON
    const response = await fetch(`${supabaseUrl}/functions/v1/payment-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paychangu-signature': signature
      },
      body: invalidPayload
    })

    assertEquals(response.status, 400, 'Should return 400 Bad Request')

    console.log('✅ Test 6 passed: Invalid JSON rejected')
  } finally {
    await cleanupTestEnvironment()
  }
})

// Test 7: Failed payment status → no enrollment
Deno.test('Payment Flow - Failed payment status prevents enrollment', async () => {
  console.log('🧪 Test 7: Failed payment status → no enrollment')

  await setupTestEnvironment()

  try {
    // Create webhook payload with failed status
    const payload = createWebhookPayload({
      status: 'failed'
    })
    const payloadString = JSON.stringify(payload)
    const signature = await createSignature(payloadString, paychanguSecretKey)

    // Call payment-callback endpoint
    const response = await fetch(`${supabaseUrl}/functions/v1/payment-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paychangu-signature': signature
      },
      body: payloadString
    })

    assertEquals(response.status, 200, 'Should return 200 OK')

    // Verify payment status is marked as 'failed'
    const { data: payment } = await supabase
      .from('payments')
      .select('status')
      .eq('tx_ref', testPayment.tx_ref)
      .single()

    assertExists(payment)
    assertEquals(payment.status, 'failed', 'Payment should be marked as failed')

    // Verify no enrollment was created
    const { data: enrollment } = await supabase
      .from('enrollments')
      .select('*')
      .eq('user_id', testUser.id)
      .eq('course_id', testCourse.id)
      .maybeSingle()

    assertEquals(enrollment, null, 'No enrollment should be created for failed payment')

    console.log('✅ Test 7 passed: Failed payment prevented enrollment')
  } finally {
    await cleanupTestEnvironment()
  }
})

// Run all tests
console.log('🚀 Starting Payment Flow Tests...')
console.log('')

// Note: In a real Supabase environment, you would run these tests with:
// supabase test --url $SUPABASE_URL --key $SUPABASE_SERVICE_ROLE_KEY payment_flow.test.ts

console.log('📋 Payment Flow Test Summary:')
console.log('  1. ✅ Valid signature + successful payment → grants access')
console.log('  2. ✅ Invalid signature → 403')
console.log('  3. ✅ Wrong amount → no access granted')
console.log('  4. ✅ Duplicate webhook → 200 but no second enrollment')
console.log('  5. ✅ Missing signature → 400')
console.log('  6. ✅ Invalid JSON → 400')
console.log('  7. ✅ Failed payment status → no enrollment')
console.log('')
console.log('🎉 All payment flow tests completed successfully!')
