# Admin Dashboard Reference — MSCE Learn

The admin dashboard is a single protected web interface that gives the admin
full visibility and control over every aspect of the platform. It is accessible
only to users with `role = 'admin'` in the `profiles` table.

---

## Dashboard sections (7 panels)

| Panel | Route | Purpose |
|-------|-------|---------|
| Command Centre | `/admin` | Live overview — revenue, enrollments, recent transactions, activity feed |
| Payment Monitor | `/admin/payments` | All transactions, manual grant/fail, network breakdown, bestsellers |
| Student Management | `/admin/users` | Student list, profile drill-down, manual access grant, renewal campaigns |
| Content Management | `/admin/content` | Upload courses and lessons, set pricing, publish/unpublish |
| Configuration | `/admin/config` | PayChangu keys, access rules, feature flags |
| Security Centre | `/admin/security` | Threat alerts, security controls, manual security actions |
| Audit Log | `/admin/audit` | Immutable append-only event log, CSV export |

---

## Access control — admin routes

```typescript
// src/components/auth/AdminRoute.jsx
import { Navigate }   from 'react-router-dom'
import { useAuth }    from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { Spinner }    from '../ui/Spinner'

export function AdminRoute({ children }) {
  const { user, loading }             = useAuth()
  const { profile, loading: profLoad } = useProfile(user?.id)

  if (loading || profLoad) return <Spinner />
  if (!user)                return <Navigate to="/login" replace />
  if (profile?.role !== 'admin') return <Navigate to="/" replace />
  return children
}

// Usage in router:
// <Route path="/admin/*" element={<AdminRoute><AdminShell /></AdminRoute>} />
```

---

## Stats queries (Command Centre)

```typescript
// supabase/functions/admin-stats/index.ts
// Returns all dashboard stat cards in one call

export async function getAdminStats(supabase: SupabaseClient) {

  const [revenue, enrollments, pending, expiring] = await Promise.all([

    // Total revenue last 30 days
    supabase.from('payments')
      .select('amount_mwk')
      .eq('status', 'paid')
      .gte('created_at', new Date(Date.now() - 30*24*60*60*1000).toISOString()),

    // Active enrollments
    supabase.from('enrollments')
      .select('id', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString()),

    // Pending payments
    supabase.from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),

    // Expiring in 3 days
    supabase.from('enrollments')
      .select('id', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString())
      .lt('expires_at', new Date(Date.now() + 3*24*60*60*1000).toISOString()),
  ])

  return {
    revenue_mwk:          revenue.data?.reduce((s, r) => s + r.amount_mwk, 0) ?? 0,
    active_enrollments:   enrollments.count ?? 0,
    pending_payments:     pending.count ?? 0,
    expiring_in_3_days:   expiring.count ?? 0,
  }
}
```

---

## Revenue chart query (last 7 days)

```sql
SELECT
  DATE_TRUNC('day', created_at AT TIME ZONE 'Africa/Blantyre') AS day,
  COUNT(*)                                   AS transaction_count,
  COALESCE(SUM(amount_mwk), 0)              AS revenue_mwk
FROM public.payments
WHERE status     = 'paid'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY 1
ORDER BY 1 ASC;
```

---

## Payment Monitor — manual grant / fail

Admin can manually grant or fail a stuck pending payment.
This must go through the backend — never direct DB writes from the frontend.

```typescript
// supabase/functions/admin-payment-action/index.ts
const ActionSchema = z.object({
  tx_ref: z.string(),
  action: z.enum(['grant', 'fail']),
})

Deno.serve(async (req) => {
  const supabase = createClient(URL, SERVICE_KEY, { auth: { persistSession: false } })
  const user     = await requireAuth(req, supabase)
  await requireAdmin(user, supabase)  // throws 403 if not admin

  const { tx_ref, action } = await validateInput(req, ActionSchema)

  const { data: payment } = await supabase
    .from('payments')
    .select('*, courses(price_mwk)')
    .eq('tx_ref', tx_ref)
    .eq('status', 'pending')  // only pending payments can be acted on
    .single()

  if (!payment) {
    return Response.json({ error: 'Pending payment not found' }, { status: 404 })
  }

  if (action === 'grant') {
    // Update payment + create enrollment in one transaction
    await supabase.from('payments')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('tx_ref', tx_ref)

    await supabase.from('enrollments').upsert({
      user_id:    payment.user_id,
      course_id:  payment.course_id,
      expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
    }, { onConflict: 'user_id,course_id' })

    await logAudit(supabase, 'admin_manual_grant', user.id, {
      tx_ref, payment_user_id: payment.user_id, admin_id: user.id
    })
  }

  if (action === 'fail') {
    await supabase.from('payments')
      .update({ status: 'failed', updated_at: new Date().toISOString() })
      .eq('tx_ref', tx_ref)

    await logAudit(supabase, 'admin_manual_fail', user.id, { tx_ref, admin_id: user.id })
  }

  return Response.json({ data: { success: true, action } })
})
```

---

## Student Management queries

### Student list with enrollment summary
```sql
SELECT
  p.id,
  p.full_name,
  p.phone,
  p.created_at,
  COUNT(e.id) FILTER (WHERE e.expires_at > NOW()) AS active_enrollments,
  MAX(pr.updated_at)                               AS last_active
FROM public.profiles p
LEFT JOIN public.enrollments e ON e.user_id = p.id
LEFT JOIN public.progress    pr ON pr.user_id = p.id
WHERE p.role = 'student'
GROUP BY p.id
ORDER BY last_active DESC NULLS LAST;
```

### Students expiring in N days (renewal campaign)
```sql
SELECT
  p.full_name,
  p.phone,
  c.title        AS course_title,
  e.expires_at
FROM public.enrollments e
JOIN public.profiles p ON p.id = e.user_id
JOIN public.courses  c ON c.id = e.course_id
WHERE e.expires_at BETWEEN NOW() AND NOW() + INTERVAL '3 days'
ORDER BY e.expires_at ASC;
```

### Admin: manually grant access to a student
```typescript
// Same admin-payment-action endpoint with action = 'grant'
// OR a dedicated admin-grant-access endpoint:

await supabase.from('enrollments').upsert({
  user_id:    targetUserId,   // chosen from student list
  course_id:  courseId,
  expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
}, { onConflict: 'user_id,course_id' })

await logAudit(supabase, 'admin_manual_grant', adminUser.id, {
  target_user_id: targetUserId,
  course_id,
  reason: 'manual_admin_action'
})
```

---

## Content Management

### Create a course
```typescript
// supabase/functions/admin-create-course/index.ts
const CourseSchema = z.object({
  title:       z.string().min(3).max(100),
  subject:     z.string().min(2),
  grade:       z.enum(['MSCE', 'JCE']),
  price_mwk:   z.number().int().min(100).max(50000),
  description: z.string().optional(),
})

const { data: course } = await supabase
  .from('courses')
  .insert({
    ...input,
    is_published: false,  // always draft first — admin publishes manually
  })
  .select()
  .single()
```

### Publish / unpublish a course
```typescript
// supabase/functions/admin-publish-course/index.ts
await supabase.from('courses')
  .update({ is_published: input.publish })
  .eq('id', input.course_id)

await logAudit(supabase, input.publish ? 'course_published' : 'course_unpublished',
  user.id, { course_id: input.course_id })
```

### Upload a lesson (video processing flow)
```
1. Admin selects MP4 file in the dashboard
2. Frontend calls POST /admin-get-upload-url → backend returns a signed
   Cloudflare R2 upload URL (PUT, expires 15 min)
3. Frontend uploads directly to R2 using that URL (no file passes through backend)
4. On upload complete, frontend calls POST /admin-process-video
5. Backend queues FFmpeg processing job:
   - Compress to 720p H.264 + faststart
   - Split into HLS chunks (10s each)
   - Store at: courses/{course-slug}/{lesson-slug}/playlist.m3u8
6. Backend saves video record to DB:
   - r2_playlist_path = courses/{slug}/{lesson}/playlist.m3u8
   - is_preview = false (admin toggles to true for preview lessons)
7. Admin sees "Processing" → "Ready" status in dashboard
```

---

## Configuration panel

### Feature flags table
```sql
CREATE TABLE public.feature_flags (
  key         TEXT PRIMARY KEY,
  enabled     BOOLEAN DEFAULT TRUE,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_by  UUID REFERENCES auth.users(id)
);

-- Seed with defaults
INSERT INTO public.feature_flags (key, enabled, description) VALUES
  ('registrations_open',     TRUE,  'Allow new student registrations'),
  ('free_previews',          TRUE,  'Show preview lessons to non-enrolled students'),
  ('sms_renewal_reminders',  FALSE, 'Auto-send SMS 3 days before enrollment expires'),
  ('maintenance_mode',       FALSE, 'Show maintenance page to all students'),
  ('airtel_money',           TRUE,  'Accept Airtel Money payments'),
  ('tnm_mpamba',             TRUE,  'Accept TNM Mpamba payments');
```

### Read a feature flag (backend)
```typescript
async function isEnabled(flag: string, supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('key', flag)
    .single()
  return data?.enabled ?? false
}

// Usage:
if (!(await isEnabled('registrations_open', supabase))) {
  return Response.json({ error: 'Registrations are currently closed' }, { status: 403 })
}
```

### Update a feature flag (admin only)
```typescript
await requireAdmin(user, supabase)
await supabase.from('feature_flags')
  .update({ enabled: input.enabled, updated_at: new Date().toISOString(), updated_by: user.id })
  .eq('key', input.key)
await logAudit(supabase, 'feature_flag_changed', user.id, { flag: input.key, enabled: input.enabled })
```

### PayChangu config (stored as Supabase secrets — never in DB)
```bash
# Admin changes API keys via CLI — never stored in a DB table
supabase secrets set PAYCHANGU_SECRET_KEY=pk_live_new_key
supabase secrets set PAYCHANGU_WEBHOOK_SECRET=whsec_new_secret
# Deploy Edge Functions to pick up new secrets
supabase functions deploy payment-callback
supabase functions deploy create-payment
```

---

## Security Centre

### Security event queries
```sql
-- Failed logins last 24h
SELECT
  payload->>'ip'  AS ip_address,
  COUNT(*)        AS attempts,
  MAX(created_at) AS last_attempt
FROM public.audit_log
WHERE event_type = 'login_failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY 1
ORDER BY 2 DESC;

-- Webhook signature failures
SELECT *
FROM public.audit_log
WHERE event_type = 'webhook_signature_failed'
ORDER BY created_at DESC
LIMIT 20;

-- Payment mismatches (potential fraud)
SELECT *
FROM public.audit_log
WHERE event_type = 'payment_mismatch'
ORDER BY created_at DESC;
```

### Terminate all sessions (emergency)
```typescript
// supabase/functions/admin-terminate-sessions/index.ts
// Requires: admin role
await supabase.auth.admin.signOut(targetUserId) // single user

// Nuclear option — all sessions (use with caution):
// This is done via Supabase dashboard → Auth → Users → Sign out all
// Or rotate the JWT secret in project settings (invalidates ALL tokens)
await logAudit(supabase, 'admin_terminate_all_sessions', user.id, {
  reason: input.reason,
  admin_id: user.id
})
```

### Block an IP address
```sql
-- Add to rate_limits with a far-future expiry
INSERT INTO public.rate_limits (key, count, expires_at)
VALUES (
  'block:41.78.92.14',
  999,  -- above any threshold
  NOW() + INTERVAL '30 days'
) ON CONFLICT (key) DO UPDATE
  SET count = 999, expires_at = NOW() + INTERVAL '30 days';
```

---

## Audit Log panel

### All events query
```sql
SELECT
  a.id,
  a.event_type,
  a.created_at,
  p.full_name   AS user_name,
  a.payload
FROM public.audit_log a
LEFT JOIN public.profiles p ON p.id = a.user_id
ORDER BY a.created_at DESC
LIMIT 100;
```

### Export to CSV (admin Edge Function)
```typescript
// supabase/functions/admin-export-audit/index.ts
const { data } = await supabase
  .from('audit_log')
  .select('created_at, event_type, user_id, payload')
  .order('created_at', { ascending: false })
  .limit(10000)

const csv = [
  'timestamp,event_type,user_id,payload',
  ...data.map(r =>
    `${r.created_at},${r.event_type},${r.user_id ?? ''},${JSON.stringify(r.payload)}`
  )
].join('\n')

return new Response(csv, {
  headers: {
    'Content-Type':        'text/csv',
    'Content-Disposition': 'attachment; filename="audit_log.csv"',
  }
})
```

---

## Renewal campaign (SMS)

```typescript
// supabase/functions/admin-send-renewal-sms/index.ts
// Fetches students expiring in N days and sends SMS via a gateway

const expiringStudents = await supabase
  .from('enrollments')
  .select('profiles(full_name, phone), courses(title), expires_at')
  .gt('expires_at', new Date().toISOString())
  .lt('expires_at', new Date(Date.now() + 3*24*60*60*1000).toISOString())

for (const enrollment of expiringStudents.data ?? []) {
  const name   = enrollment.profiles.full_name.split(' ')[0]
  const course = enrollment.courses.title
  const days   = Math.ceil(
    (new Date(enrollment.expires_at).getTime() - Date.now()) / (1000*60*60*24)
  )
  const message =
    `Hi ${name}, your MSCE Learn access to ${course} expires in ${days} day(s). ` +
    `Open the app to renew and keep learning!`

  // Send via your SMS provider (e.g. Africa's Talking, Tnm SMS API)
  await sendSMS(enrollment.profiles.phone, message)
}

await logAudit(supabase, 'renewal_sms_sent', user.id, {
  count: expiringStudents.data?.length ?? 0
})
```

---

## Admin UI colour conventions (matches dashboard)

```
Background:        #0A0E1A  (deep navy)
Surface:           #111827  (card background)
Surface raised:    #1A2235  (table rows, inputs)
Border:            #1F2D45  (all borders)

Teal (success):    #0F6E56 / #1A9E7A
Amber (warning):   #D97706 / #FBBF24
Red (danger):      #DC2626
Blue (info):       #1D4ED8

Text:              #E2E8F0
Muted text:        #64748B
Monospace:         JetBrains Mono
Display:           Syne

Badge — PAID:      teal border, teal bg dim
Badge — PENDING:   amber border, amber bg dim
Badge — FAILED:    red border, red bg dim
Badge — LIVE:      teal (same as paid)
Badge — DRAFT:     amber (same as pending)
```

---

## Admin routes summary

```
/admin                   → Command Centre (stats, charts, recent transactions, live log)
/admin/payments          → Payment Monitor (all transactions, manual actions)
/admin/users             → Student Management (list, profile, grant access, SMS)
/admin/content           → Content Management (courses, lessons, upload, publish)
/admin/config            → Configuration (PayChangu, access rules, feature flags)
/admin/security          → Security Centre (alerts, controls, manual actions)
/admin/audit             → Audit Log (all events, CSV export)
```

All routes wrapped in `<AdminRoute>` — unauthenticated or non-admin users
are redirected to `/login` or `/` respectively.
