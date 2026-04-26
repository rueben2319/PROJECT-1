# Database Reference — MSCE Learn

PostgreSQL via Supabase. RLS is enabled on every table without exception.

---

## Complete schema

```sql
-- ── USERS ─────────────────────────────────────────────────────────
-- Managed by Supabase Auth. Do not store passwords here.
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  full_name   text,
  phone       text,
  role        text not null default 'student' check (role in ('student', 'admin')),
  created_at  timestamptz default now()
);

-- ── COURSES ───────────────────────────────────────────────────────
create table public.courses (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  subject            text not null,       -- e.g. 'Mathematics'
  grade              text not null,       -- 'MSCE' or 'JCE'
  description        text,
  price_mwk          integer not null,    -- price in Malawian Kwacha
  preview_video_id   uuid,               -- FK to videos, set after insert
  is_published       boolean default false,
  created_at         timestamptz default now()
);

-- ── VIDEOS ────────────────────────────────────────────────────────
create table public.videos (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid references public.courses(id) on delete cascade,
  title            text not null,
  r2_playlist_path text not null,   -- path to .m3u8 in R2, NEVER sent to frontend
  duration_seconds integer,
  lesson_order     integer not null default 0,
  is_preview       boolean default false,
  created_at       timestamptz default now()
);

-- ── ENROLLMENTS ───────────────────────────────────────────────────
create table public.enrollments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  course_id   uuid references public.courses(id) on delete cascade,
  expires_at  timestamptz not null,    -- now() + interval '30 days'
  created_at  timestamptz default now(),
  unique(user_id, course_id)           -- one enrollment per user per course
);

-- ── PAYMENTS ──────────────────────────────────────────────────────
create table public.payments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade,
  course_id   uuid references public.courses(id),
  amount_mwk  integer not null,
  status      text not null default 'pending'
                check (status in ('pending', 'paid', 'failed')),
  tx_ref      text unique not null,    -- PayChangu transaction reference
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── PROGRESS ──────────────────────────────────────────────────────
create table public.progress (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade,
  video_id        uuid references public.videos(id) on delete cascade,
  seconds_watched integer default 0,
  completed       boolean default false,
  updated_at      timestamptz default now(),
  unique(user_id, video_id)
);
```

---

## Row-Level Security policies

Apply these immediately after creating each table. Never skip RLS.

```sql
-- Enable RLS on all tables
alter table public.profiles    enable row level security;
alter table public.courses     enable row level security;
alter table public.videos      enable row level security;
alter table public.enrollments enable row level security;
alter table public.payments    enable row level security;
alter table public.progress    enable row level security;

-- PROFILES: users read/update only their own profile
create policy "profiles_own" on public.profiles
  for all using (auth.uid() = id);

-- COURSES: anyone can read published courses
create policy "courses_read_published" on public.courses
  for select using (is_published = true);

-- COURSES: admins can do everything
create policy "courses_admin_all" on public.courses
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- VIDEOS: students can see videos for courses they are enrolled in
create policy "videos_enrolled_read" on public.videos
  for select using (
    is_preview = true  -- preview always visible
    or
    exists (
      select 1 from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = videos.course_id
        and e.expires_at > now()
    )
  );

-- ENROLLMENTS: users see only their own
create policy "enrollments_own" on public.enrollments
  for select using (auth.uid() = user_id);

-- PAYMENTS: users see only their own
create policy "payments_own" on public.payments
  for select using (auth.uid() = user_id);

-- PROGRESS: users read/write only their own
create policy "progress_own" on public.progress
  for all using (auth.uid() = user_id);
```

---

## Common queries

### Check if user is enrolled (use in every protected endpoint)
```sql
select id, expires_at
from public.enrollments
where user_id = $1
  and course_id = $2
  and expires_at > now()
limit 1;
-- Returns row = enrolled. No row = not enrolled or expired.
```

### Fetch course list with enrollment status for a user
```sql
select
  c.*,
  case when e.id is not null then true else false end as is_enrolled,
  e.expires_at
from public.courses c
left join public.enrollments e
  on e.course_id = c.id
  and e.user_id = $1          -- auth.uid()
  and e.expires_at > now()
where c.is_published = true
order by c.subject, c.grade;
```

### Fetch lessons for a course (includes completion status)
```sql
select
  v.id,
  v.title,
  v.duration_seconds,
  v.lesson_order,
  v.is_preview,
  coalesce(p.completed, false) as completed,
  coalesce(p.seconds_watched, 0) as seconds_watched
from public.videos v
left join public.progress p
  on p.video_id = v.id and p.user_id = $1
where v.course_id = $2
order by v.lesson_order;
```

### Save or update watch progress (upsert)
```sql
insert into public.progress (user_id, video_id, seconds_watched, completed)
values ($1, $2, $3, $3 >= $4 * 0.9)   -- completed if watched 90%+
on conflict (user_id, video_id)
do update set
  seconds_watched = excluded.seconds_watched,
  completed = excluded.completed,
  updated_at = now();
```

### Admin: revenue summary
```sql
select
  date_trunc('day', created_at) as day,
  count(*) filter (where status = 'paid') as paid_count,
  sum(amount_mwk) filter (where status = 'paid') as revenue_mwk
from public.payments
where created_at > now() - interval '30 days'
group by 1
order by 1 desc;
```

---

## Migration naming convention

```
supabase/migrations/
  20240101000000_initial_schema.sql
  20240102000000_add_rls_policies.sql
  20240115000000_add_preview_flag_to_videos.sql
```

Always use `supabase migration new <description>` to create migrations.
Never edit the database directly in production.
