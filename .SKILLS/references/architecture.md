# Architecture & Security Reference — MSCE Learn

This file is the security constitution for the project. Every decision here
is intentional and must not be bypassed without a documented reason.

---

## Core security principles (never violate these)

1. **Never trust the frontend.** All access control, payment verification, and
   enrollment checks happen on the backend only — no exceptions.
2. **user_id always from JWT.** Never accept user_id from request body. Always
   extract from the verified JWT via `supabase.auth.getUser(token)`.
3. **Price always from DB.** Never accept payment amounts from the frontend.
   Always fetch course price from the database before calling PayChangu.
4. **Webhook must verify twice.** HMAC signature check AND PayChangu API
   re-fetch before granting any access.
5. **Idempotency on all payment state changes.** Check existing status before
   every write. The DB unique constraint on `tx_ref` is the hard backstop.
6. **Audit log everything.** Every money event writes to `audit_log`. That
   table is append-only — no updates, no deletes, even by service_role.
7. **RLS on every table.** No exceptions. Deny by default, allow explicitly.
8. **Signed URLs only.** Raw video paths never leave the backend.

---

## Three-layer defence model

Every money operation is protected by three independent layers. Each layer
assumes the one above it can fail or be compromised.

```
Layer 1 — Application code (Edge Functions)
  • JWT verification
  • Input validation (Zod)
  • Idempotency check
  • HMAC signature verification
  • PayChangu API re-fetch
  ↓ (if code has a bug, layer 2 catches it)

Layer 2 — Database constraints + triggers
  • UNIQUE constraint on tx_ref
  • CHECK constraints (amount > 0, valid status)
  • prevent_payment_rollback() trigger
  • RLS policies per table
  ↓ (if DB is breached, layer 3 catches it)

Layer 3 — Audit log
  • Append-only, no delete even for service_role
  • Trigger-based — cannot be skipped by app code
  • Full payload snapshot on every state change
  • Used for dispute resolution and forensics
```

---

## Reusable security helpers

### requireAuth — verify JWT on every protected endpoint

```typescript
// supabase/functions/_shared/auth.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'

export async function requireAuth(
  req: Request,
  supabase: SupabaseClient
): Promise<User> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPError(401, 'Missing or invalid Authorization header')
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    throw new HTTPError(401, 'Invalid or expired token')
  }
  return user // identity is verified — safe to use user.id
}

export async function requireAdmin(
  user: User,
  supabase: SupabaseClient
): Promise<void> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    throw new HTTPError(403, 'Admin access required')
  }
}

export class HTTPError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}
```

### requireEnrollment — check access before every video request

```typescript
// supabase/functions/_shared/enrollment.ts
export async function requireEnrollment(
  userId: string,
  courseId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id, expires_at')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .gt('expires_at', new Date().toISOString()) // not expired
    .maybeSingle()

  if (!enrollment) {
    // Check if they ever had access (expired vs never enrolled)
    const { data: expired } = await supabase
      .from('enrollments')
      .select('expires_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle()

    throw new HTTPError(403, expired ? 'Access expired' : 'Not enrolled')
  }
}
```

### validateInput — Zod validation wrapper

```typescript
// supabase/functions/_shared/validate.ts
import { z, ZodSchema } from 'https://esm.sh/zod@3'
import { HTTPError } from './auth.ts'

export async function validateInput<T>(
  req: Request,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await req.json().catch(() => {
    throw new HTTPError(400, 'Invalid JSON body')
  })
  const result = schema.safeParse(body)
  if (!result.success) {
    throw new HTTPError(400, 'Validation failed: ' + result.error.message)
  }
  return result.data
}

// Schemas for each endpoint
export const CreatePaymentSchema = z.object({
  course_id: z.string().uuid('course_id must be a valid UUID'),
})

export const VideoProgressSchema = z.object({
  video_id:        z.string().uuid(),
  seconds_watched: z.number().int().min(0).max(86400),
})

export const GetVideoUrlSchema = z.object({
  video_id:  z.string().uuid(),
  course_id: z.string().uuid(),
})
```

### logAudit — write to audit log

```typescript
// supabase/functions/_shared/audit.ts
export async function logAudit(
  supabase: SupabaseClient,
  eventType: string,
  userId: string | null,
  payload: Record<string, unknown>
): Promise<void> {
  await supabase.from('audit_log').insert({
    event_type: eventType,
    user_id:    userId,
    payload:    { ...payload, logged_at: new Date().toISOString() }
  })
  // Never throw on audit failure — log to console as fallback
  .then(({ error }) => {
    if (error) console.error('[AUDIT FAIL]', error.message, { eventType, payload })
  })
}

// Event type constants — use these, never raw strings
export const AUDIT = {
  PAYMENT_CREATED:        'payment_created',
  PAYMENT_PAID:           'payment_paid',
  PAYMENT_FAILED:         'payment_failed',
  PAYMENT_MISMATCH:       'payment_mismatch',
  WEBHOOK_SIG_FAIL:       'webhook_signature_failed',
  ACCESS_GRANTED:         'access_granted',
  ACCESS_DENIED:          'access_denied',
  ENROLLMENT_EXPIRED:     'enrollment_expired',
  DUPLICATE_WEBHOOK:      'duplicate_webhook',
  INVALID_AMOUNT:         'invalid_amount',
  SYSTEM_ERROR:           'system_error',
} as const
```

---

## Standard Edge Function template

Every Edge Function must follow this structure — no exceptions:

```typescript
// supabase/functions/[function-name]/index.ts
import { createClient } from '@supabase/supabase-js'
import { corsHeaders }   from '../_shared/cors.ts'
import { requireAuth }   from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AUDIT } from '../_shared/audit.ts'
import { HTTPError }     from '../_shared/auth.ts'
import { z }             from 'https://esm.sh/zod@3'

// 1. Define input schema
const Schema = z.object({
  course_id: z.string().uuid(),
})

Deno.serve(async (req) => {
  // 2. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(req) })
  }

  // 3. Create Supabase client (pooled port 6543)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { db: { schema: 'public' }, auth: { persistSession: false } }
  )

  try {
    // 4. Verify auth — always first
    const user = await requireAuth(req, supabase)

    // 5. Validate input — always second
    const input = await validateInput(req, Schema)

    // 6. Business logic here
    // ...

    // 7. Audit log success
    await logAudit(supabase, AUDIT.ACCESS_GRANTED, user.id, { ...input })

    // 8. Return success
    return Response.json(
      { data: { success: true } },
      { headers: corsHeaders(req) }
    )

  } catch (err) {
    // 9. Handle errors — never leak internals
    if (err instanceof HTTPError) {
      return Response.json(
        { error: err.message },
        { status: err.status, headers: corsHeaders(req) }
      )
    }
    // Unexpected error — log internally, generic message to client
    console.error('[UNEXPECTED ERROR]', err)
    await logAudit(supabase, AUDIT.SYSTEM_ERROR, null, {
      function: req.url,
      message: err instanceof Error ? err.message : String(err)
    }).catch(() => {}) // never throw from error handler
    return Response.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500, headers: corsHeaders(req) }
    )
  }
})
```

---

## CORS configuration

```typescript
// supabase/functions/_shared/cors.ts
const ALLOWED_ORIGINS = [
  'https://mscelearn.mw',
  'https://www.mscelearn.mw',
  'https://msce-learn.vercel.app',   // staging
  ...(Deno.env.get('EXTRA_ORIGINS')?.split(',') ?? []) // dev overrides
]

export function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0]

  return {
    'Access-Control-Allow-Origin':  allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age':       '86400',
    'Strict-Transport-Security':    'max-age=63072000; includeSubDomains',
    'X-Content-Type-Options':       'nosniff',
    'X-Frame-Options':              'DENY',
  }
}
```

---

## Database security — full SQL block

```sql
-- ── AUDIT LOG ────────────────────────────────────────────────────
CREATE TABLE public.audit_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  user_id    UUID,
  payload    JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
-- No policies = complete block for anon + user keys
REVOKE DELETE ON audit_log FROM service_role; -- append-only

-- ── PAYMENT STATUS TRIGGER ───────────────────────────────────────
-- Prevents paid → pending/failed rollback
CREATE OR REPLACE FUNCTION prevent_payment_rollback()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'paid' AND NEW.status != 'paid' THEN
    RAISE EXCEPTION
      'Cannot reverse completed payment. tx_ref: %', OLD.tx_ref;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_status_guard
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION prevent_payment_rollback();

-- ── PAYMENT AUDIT TRIGGER ────────────────────────────────────────
CREATE OR REPLACE FUNCTION log_payment_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.audit_log (event_type, user_id, payload)
  VALUES (
    'payment_status_changed',
    NEW.user_id,
    jsonb_build_object(
      'tx_ref',      NEW.tx_ref,
      'old_status',  OLD.status,
      'new_status',  NEW.status,
      'amount_mwk',  NEW.amount_mwk,
      'course_id',   NEW.course_id,
      'changed_at',  NOW()
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER payment_audit
  AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_payment_change();

-- ── DB CONSTRAINTS ───────────────────────────────────────────────
ALTER TABLE payments
  ADD CONSTRAINT amount_positive  CHECK (amount_mwk > 0),
  ADD CONSTRAINT status_valid     CHECK (status IN ('pending','paid','failed')),
  ADD CONSTRAINT tx_ref_unique    UNIQUE (tx_ref);

ALTER TABLE enrollments
  ADD CONSTRAINT expires_after_created CHECK (expires_at > created_at),
  ADD CONSTRAINT max_90_days
    CHECK (expires_at <= created_at + INTERVAL '90 days'),
  ADD CONSTRAINT one_per_user_course UNIQUE (user_id, course_id);

-- ── PENDING PAYMENT EXPIRY (pg_cron) ────────────────────────────
SELECT cron.schedule('expire-pending-payments', '0 * * * *', $$
  UPDATE public.payments
  SET    status = 'failed', updated_at = NOW()
  WHERE  status = 'pending'
    AND  created_at < NOW() - INTERVAL '2 hours';
$$);
```

---

## Rate limiting table

```sql
-- Simple rate limiting store
CREATE TABLE public.rate_limits (
  key        TEXT PRIMARY KEY,
  count      INTEGER DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Clean up expired entries hourly
SELECT cron.schedule('clean-rate-limits', '30 * * * *', $$
  DELETE FROM public.rate_limits WHERE expires_at < NOW();
$$);
```

---

## Environment variables — full list

```bash
# Set via: supabase secrets set KEY=value

# Supabase (auto-available in Edge Functions)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...      # NEVER in frontend

# PayChangu
PAYCHANGU_SECRET_KEY=pk_live_...
PAYCHANGU_WEBHOOK_SECRET=whsec_...

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=msce-learn-videos
R2_PUBLIC_URL=https://videos.mscelearn.mw

# App
APP_URL=https://mscelearn.mw
EXTRA_ORIGINS=http://localhost:5173   # dev only
```

---

## Pre-launch security checklist

Run through all of these before going live:

**Payments (CRITICAL)**
- [ ] `tx_ref` has UNIQUE constraint in DB
- [ ] Idempotency check in webhook before every grant
- [ ] HMAC verification using `timingSafeEqual`
- [ ] PayChangu API re-fetch on every webhook
- [ ] Amount always fetched from DB — never from request body
- [ ] `prevent_payment_rollback` trigger active

**Database (CRITICAL)**
- [ ] RLS enabled on payments, enrollments, progress, profiles, audit_log
- [ ] Service role key confirmed absent from all frontend code
- [ ] `audit_log` has no DELETE permission even for service_role
- [ ] All CHECK constraints applied

**Video (CRITICAL)**
- [ ] Videos bucket set to private in Supabase Storage
- [ ] Signed URLs expire at ≤ 600 seconds
- [ ] Enrollment re-checked on every `get-video-url` call
- [ ] Raw `r2_playlist_path` never returned to frontend

**Auth (CRITICAL)**
- [ ] `requireAuth` used in every protected Edge Function
- [ ] `user_id` sourced from JWT in every write operation
- [ ] `requireAdmin` used in every admin Edge Function

**API Layer (HIGH)**
- [ ] Zod validation on every endpoint
- [ ] CORS restricted to production domain
- [ ] No stack traces or raw errors returned to client
- [ ] HTTPS + HSTS headers configured in vercel.json
