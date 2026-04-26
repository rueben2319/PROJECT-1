---
name: msce-learn
description: >
  Master reference skill for the MSCE Learn platform — a Malawi-based MSCE/JCE
  video learning web app. Use this skill for ANY task related to this project:
  writing code (frontend or backend), designing database queries, building
  payment flows, handling video delivery, security decisions, architecture
  choices, UI components, or writing documentation. Trigger whenever the user
  mentions MSCE Learn, the Malawi edtech app, PayChangu integration, Supabase
  video storage, student enrollment, signed video URLs, or any feature of this
  platform. Also trigger for general questions about the tech stack (React,
  Supabase, Tailwind, HLS streaming) when the user is clearly working on this
  project. When in doubt, load this skill — consistency across the codebase
  depends on it.
---

# MSCE Learn — Master Skill

This skill keeps all code, architecture, and decisions consistent across the
MSCE Learn project. Read the relevant reference file before writing any code.

## What this project is

MSCE Learn is a mobile-first video learning platform for Malawian secondary
school students preparing for MSCE and JCE examinations. Students pay per
course via Airtel Money or TNM Mpamba (through PayChangu), then access
subject-specific video lessons for 30 days.

## Reference files — read the right one first

| Task | Read this file |
|------|---------------|
| Database queries, schema, RLS | `references/database.md` |
| PayChangu payments, webhooks | `references/payments.md` |
| Video upload, HLS, signed URLs | `references/video.md` |
| Frontend components, styling | `references/frontend.md` |
| Architecture, security patterns | `references/architecture.md` |
| Admin dashboard, operations, config | `references/admin.md` |

Always read the relevant reference file **before** writing any code. Multiple
files may apply — read all that are relevant.

---

## Tech stack (always use these, never substitute)

| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | React + Tailwind CSS | Mobile-first, 375px minimum viewport |
| Backend | Supabase Edge Functions (Deno) | Serverless, stateless |
| Database | PostgreSQL via Supabase | RLS enabled on every table |
| Auth | Supabase Auth | JWT sessions, OTP verification |
| Video storage | Cloudflare R2 + HLS | Signed URLs, 10-min expiry |
| Payments | PayChangu API | Aggregates Airtel Money + TNM Mpamba |
| Hosting | Vercel (frontend) + Supabase (backend) | |

---

## Brand identity (always use these values)

```
Primary colour:   #1D4ED8  (deep blue)
Accent colour:    #0F6E56  (teal green)
Background:       #F8FAFC  (off-white)
Text primary:     #1E293B  (near black)
Text muted:       #64748B  (slate)
Border:           #E2E8F0  (light grey)

Typography:       Inter (headings bold, body regular)
Border radius:    8px cards, 20px buttons
Spacing unit:     4px base (Tailwind default)
```

---

## Core rules — never break these

1. **Never trust the frontend.** All access control, payment verification, and
   enrollment checks happen on the backend only.
2. **RLS on every table.** No Supabase table is ever made public without a
   row-level security policy.
3. **Signed URLs only.** Video file paths are never sent to the frontend.
   Only time-limited signed URLs (10 min / 600s) are returned.
4. **Webhook verification always.** PayChangu webhooks must be verified with
   HMAC signature AND re-fetched from the PayChangu API before granting access.
5. **Idempotency on payments.** Before granting access, check if the tx_ref
   has already been processed to prevent double-enrollment.
6. **PgBouncer connection string.** Always use port 6543 (pooled) in Edge
   Functions, never port 5432 (direct).
7. **HLS for all videos.** Never serve raw MP4 files. All videos are processed
   through FFmpeg → HLS chunks → Cloudflare R2.
8. **Mobile-first CSS.** All Tailwind styles start from mobile and scale up
   with `md:` and `lg:` prefixes.

---

## Project folder structure

```
msce-learn/
├── src/
│   ├── components/
│   │   ├── auth/          # LoginForm, RegisterForm, OTPInput
│   │   ├── courses/       # CourseCard, CourseGrid, CourseDetail
│   │   ├── player/        # VideoPlayer, ProgressBar, LessonList
│   │   ├── payment/       # PaymentModal, PaymentStatus
│   │   └── ui/            # Button, Badge, Card, Spinner (shared)
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Course.jsx
│   │   ├── Watch.jsx
│   │   ├── Profile.jsx
│   │   └── Admin.jsx
│   ├── hooks/
│   │   ├── useAuth.js     # Supabase auth state
│   │   ├── useEnrollment.js
│   │   └── useProgress.js
│   ├── lib/
│   │   ├── supabase.js    # Supabase client (port 6543)
│   │   └── api.js         # Typed fetch wrappers
│   └── styles/
│       └── index.css
├── supabase/
│   ├── functions/         # Edge Functions
│   │   ├── create-payment/
│   │   ├── payment-callback/
│   │   └── get-video-url/
│   └── migrations/        # SQL migration files
└── scripts/
    └── process-video.sh   # FFmpeg → HLS pipeline
```

---

## Environment variables

```bash
# .env (never commit this file)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...          # safe for frontend (RLS enforces access)

# Supabase Edge Function secrets (set via supabase secrets set)
PAYCHANGU_SECRET_KEY=pk_live_...
PAYCHANGU_WEBHOOK_SECRET=whsec_...
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=msce-learn-videos
R2_PUBLIC_URL=https://videos.mscelearn.mw
```

---

## Quick reference — common patterns

### Supabase client (always use pooled port)
```javascript
// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
// Edge Functions use service role key + port 6543 — see references/architecture.md
```

### Protected route pattern
```jsx
// Always check enrollment server-side, use this only for UI gating
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" />
  return children
}
```

### Standard API response shape
```javascript
// All Edge Functions return this shape
{ data: {...} | null, error: string | null }
```

### Tailwind component conventions
```jsx
// Cards
<div className="bg-white rounded-lg border border-slate-200 p-4">

// Primary button
<button className="bg-blue-700 text-white rounded-2xl px-6 py-3 font-medium
                   hover:bg-blue-800 active:scale-95 transition-all">

// Accent / success button  
<button className="bg-teal-700 text-white rounded-2xl px-6 py-3 font-medium">

// Locked badge
<span className="bg-slate-100 text-slate-600 text-xs font-medium px-2 py-1 rounded-full">
  Locked
</span>

// Unlocked badge
<span className="bg-teal-50 text-teal-700 text-xs font-medium px-2 py-1 rounded-full">
  Enrolled
</span>
```
