-- MSCE Learn RLS Policy Tests
-- Tests Row Level Security policies for all critical tables

-- Setup test users and data
\set VERBOSITY verbose

-- Create test users
DO $$
DECLARE
  student_a_id UUID;
  student_b_id UUID;
  admin_id UUID;
BEGIN
  -- Create test users
  INSERT INTO auth.users (id, email, created_at)
  VALUES 
    ('00000000-0000-0000-0000-000000000001', 'student-a@test.com', NOW()),
    ('00000000-0000-0000-0000-000000000002', 'student-b@test.com', NOW()),
    ('00000000-0000-0000-0000-000000000003', 'admin@test.com', NOW())
  ON CONFLICT (id) DO NOTHING;
  
  -- Create corresponding profiles
  INSERT INTO profiles (id, email, full_name, role, phone_number, created_at)
  VALUES 
    ('00000000-0000-0000-0000-000000000001', 'student-a@test.com', 'Student A', 'student', '0881234567', NOW()),
    ('00000000-0000-0000-0000-000000000002', 'student-b@test.com', 'Student B', 'student', '0991234567', NOW()),
    ('00000000-0000-0000-0000-000000000003', 'admin@test.com', 'Admin User', 'admin', '0889876543', NOW())
  ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;
END $$;

-- Create test courses
INSERT INTO courses (id, title, subject, grade, price_mwk, description, is_published, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000010', 'Test Mathematics', 'Mathematics', 'MSCE', 5000, 'Test course', true, NOW()),
  ('00000000-0000-0000-0000-000000000011', 'Test Biology', 'Biology', 'MSCE', 3000, 'Test course', true, NOW()),
  ('00000000-0000-0000-0000-000000000012', 'Unpublished Course', 'Chemistry', 'MSCE', 4000, 'Unpublished', false, NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test videos
INSERT INTO videos (id, course_id, title, r2_playlist_path, duration_seconds, is_preview, published, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000010', 'Preview Video', 'courses/mathematics/preview/playlist.m3u8', 600, true, true, NOW()),
  ('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000010', 'Paid Video 1', 'courses/mathematics/lesson1/playlist.m3u8', 1200, false, true, NOW()),
  ('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-000000000011', 'Biology Preview', 'courses/biology/preview/playlist.m3u8', 900, true, true, NOW()),
  ('00000000-0000-0000-0000-000000000023', '00000000-0000-0000-0000-000000000011', 'Biology Paid', 'courses/biology/lesson1/playlist.m3u8', 1800, false, true, NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test payments
INSERT INTO payments (id, tx_ref, user_id, course_id, amount_mwk, phone_number, status, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000030', 'MSCE-1234567890-abc123', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 5000, '0881234567', 'paid', NOW()),
  ('00000000-0000-0000-0000-000000000031', 'MSCE-1234567891-def456', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 3000, '0991234567', 'paid', NOW()),
  ('00000000-0000-0000-0000-000000000032', 'MSCE-1234567892-ghi789', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 3000, '0881234567', 'pending', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test enrollments
INSERT INTO enrollments (id, user_id, course_id, status, expires_at, created_at)
VALUES 
  ('00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 'active', NOW() + INTERVAL '30 days', NOW()),
  ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000011', 'active', NOW() + INTERVAL '30 days', NOW()),
  ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'expired', NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- Create test audit logs
INSERT INTO audit_log (action, resource, resource_id, user_id, details, created_at)
VALUES 
  ('user.login', 'user', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '{"ip": "127.0.0.1"}', NOW()),
  ('payment.success', 'payment', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000001', '{"amount": 5000}', NOW()),
  ('course.access_granted', 'enrollment', '00000000-0000-0000-0000-000000000040', '00000000-0000-0000-0000-000000000001', '{"course": "Mathematics"}', NOW())
ON CONFLICT DO NOTHING;

-- =================================================================
-- TEST 1: payments table RLS policies
-- =================================================================

-- Test 1.1: Student A cannot SELECT payments belonging to Student B
\set student_a_auth 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZHR5eGRiem5zYXl0cGduc210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMjUyNTEsImV4cCI6MjA5MjgwMTI1MX0.iY_nzUYCABvXMZ-Y_5fsFsHNXujP9c7MnuMQ5yYem44'
\set student_b_id '00000000-0000-0000-0000-000000000002'

SELECT 'Test 1.1: Student A cannot SELECT Student B payments' as test_name;
SELECT count(*) as unauthorized_payments
FROM payments 
WHERE user_id = :student_b_id;

-- Expected: 0 rows (Student A cannot see Student B's payments)

-- Test 1.2: Student A can SELECT their own payments
\set student_a_id '00000000-0000-0000-0000-000000000001'

SELECT 'Test 1.2: Student A can SELECT their own payments' as test_name;
SELECT count(*) as own_payments
FROM payments 
WHERE user_id = :student_a_id;

-- Expected: 2 rows (Student A can see their own payments)

-- Test 1.3: Student A cannot INSERT payments
SELECT 'Test 1.3: Student A cannot INSERT payments' as test_name;
-- This should fail with RLS policy violation
INSERT INTO payments (tx_ref, user_id, course_id, amount_mwk, phone_number, status)
VALUES ('MSCE-test-insert', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000010', 5000, '0881234567', 'pending');

-- Expected: Permission denied

-- Test 1.4: Student A cannot UPDATE payments
SELECT 'Test 1.4: Student A cannot UPDATE payments' as test_name;
-- This should fail with RLS policy violation
UPDATE payments 
SET status = 'failed' 
WHERE user_id = :student_a_id AND id = '00000000-0000-0000-0000-000000000030';

-- Expected: Permission denied

-- =================================================================
-- TEST 2: enrollments table RLS policies
-- =================================================================

-- Test 2.1: Student A cannot SELECT enrollments belonging to Student B
SELECT 'Test 2.1: Student A cannot SELECT Student B enrollments' as test_name;
SELECT count(*) as unauthorized_enrollments
FROM enrollments 
WHERE user_id = :student_b_id;

-- Expected: 0 rows (Student A cannot see Student B's enrollments)

-- Test 2.2: Student A can SELECT their own enrollments
SELECT 'Test 2.2: Student A can SELECT their own enrollments' as test_name;
SELECT count(*) as own_enrollments
FROM enrollments 
WHERE user_id = :student_a_id;

-- Expected: 2 rows (Student A can see their own enrollments)

-- Test 2.3: Student A cannot INSERT enrollments directly
SELECT 'Test 2.3: Student A cannot INSERT enrollments' as test_name;
-- This should fail with RLS policy violation
INSERT INTO enrollments (user_id, course_id, status, expires_at)
VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000011', 'active', NOW() + INTERVAL '30 days');

-- Expected: Permission denied

-- =================================================================
-- TEST 3: videos table RLS policies
-- =================================================================

-- Test 3.1: Unauthenticated user can SELECT is_preview = true videos
SELECT 'Test 3.1: Unauthenticated can SELECT preview videos' as test_name;
SELECT count(*) as preview_videos
FROM videos 
WHERE is_preview = true AND published = true;

-- Expected: 2 rows (preview videos are accessible to everyone)

-- Test 3.2: Unauthenticated user cannot SELECT non-preview videos
SELECT 'Test 3.2: Unauthenticated cannot SELECT non-preview videos' as test_name;
SELECT count(*) as paid_videos
FROM videos 
WHERE is_preview = false AND published = true;

-- Expected: 0 rows (non-preview videos require enrollment)

-- Test 3.3: Student with valid enrollment can SELECT all videos for that course
SELECT 'Test 3.3: Student with enrollment can SELECT all course videos' as test_name;
SELECT count(*) as enrolled_course_videos
FROM videos 
WHERE course_id = '00000000-0000-0000-0000-000000000010' AND published = true;

-- Expected: 2 rows (Student A has active enrollment in Mathematics)

-- Test 3.4: Student with expired enrollment cannot SELECT non-preview videos
SELECT 'Test 3.4: Student with expired enrollment cannot SELECT non-preview videos' as test_name;
SELECT count(*) as expired_enrollment_videos
FROM videos 
WHERE course_id = '00000000-0000-0000-0000-000000000011' AND is_preview = false AND published = true;

-- Expected: 0 rows (Student A's enrollment in Biology is expired)

-- Test 3.5: Student cannot SELECT videos for course they are not enrolled in
SELECT 'Test 3.5: Student cannot SELECT videos for unenrolled course' as test_name;
-- Create a course Student A is not enrolled in
INSERT INTO courses (id, title, subject, grade, price_mwk, description, is_published, created_at)
VALUES ('00000000-0000-0000-0000-000000000013', 'Physics Course', 'Physics', 'MSCE', 6000, 'Physics course', true, NOW())
ON CONFLICT DO NOTHING;

INSERT INTO videos (id, course_id, title, r2_playlist_path, duration_seconds, is_preview, published, created_at)
VALUES ('00000000-0000-0000-0000-000000000024', '00000000-0000-0000-0000-000000000013', 'Physics Video', 'courses/physics/lesson1/playlist.m3u8', 1500, false, true, NOW())
ON CONFLICT DO NOTHING;

SELECT count(*) as unenrolled_videos
FROM videos 
WHERE course_id = '00000000-0000-0000-0000-000000000013' AND published = true;

-- Expected: 0 rows (Student A not enrolled in Physics)

-- =================================================================
-- TEST 4: audit_log table RLS policies
-- =================================================================

-- Test 4.1: Student cannot SELECT any audit_log rows
SELECT 'Test 4.1: Student cannot SELECT audit_log' as test_name;
SELECT count(*) as audit_rows
FROM audit_log;

-- Expected: 0 rows (students cannot access audit log)

-- Test 4.2: Student cannot INSERT to audit_log
SELECT 'Test 4.2: Student cannot INSERT audit_log' as test_name;
-- This should fail with RLS policy violation
INSERT INTO audit_log (action, resource, resource_id, user_id, details)
VALUES ('test.action', 'test.resource', 'test-id', '00000000-0000-0000-0000-000000000001', '{"test": true}');

-- Expected: Permission denied

-- Test 4.3: Admin cannot DELETE from audit_log
-- Switch to admin context for this test
\set admin_auth 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmZHR5eGRiem5zYXl0cGduc210Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIyNTI1MSwiZXhwIjoyMDkyODAxMjUxfQ.cIb9Dkx2F8YqL8Z7J4XQ2hQhN8W3vK9R2mS6tT7uV8w'

SELECT 'Test 4.3: Admin cannot DELETE audit_log' as test_name;
-- This should fail with RLS policy violation
DELETE FROM audit_log WHERE action = 'user.login';

-- Expected: Permission denied (audit_log is append-only)

-- =================================================================
-- TEST 5: profiles table RLS policies
-- =================================================================

-- Test 5.1: Student A cannot SELECT Student B's profile
SELECT 'Test 5.1: Student A cannot SELECT Student B profile' as test_name;
SELECT count(*) as other_profiles
FROM profiles 
WHERE id = :student_b_id;

-- Expected: 0 rows (Student A cannot see Student B's profile)

-- Test 5.2: Student A can SELECT their own profile
SELECT 'Test 5.2: Student A can SELECT their own profile' as test_name;
SELECT count(*) as own_profile
FROM profiles 
WHERE id = :student_a_id;

-- Expected: 1 row (Student A can see their own profile)

-- Test 5.3: Student A can UPDATE their own profile
SELECT 'Test 5.3: Student A can UPDATE their own profile' as test_name;
UPDATE profiles 
SET full_name = 'Updated Name A', phone_number = '0887654321'
WHERE id = :student_a_id;

-- Expected: Success (Student A can update their own profile)

-- Test 5.4: Student A cannot UPDATE Student B's profile
SELECT 'Test 5.4: Student A cannot UPDATE Student B profile' as test_name;
-- This should fail with RLS policy violation
UPDATE profiles 
SET full_name = 'Hacked Name B'
WHERE id = :student_b_id;

-- Expected: Permission denied

-- =================================================================
-- CLEANUP TEST DATA
-- =================================================================

-- Clean up test data (only if running in test environment)
DO $$
BEGIN
  -- Remove test audit logs
  DELETE FROM audit_log WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
  
  -- Remove test enrollments
  DELETE FROM enrollments WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
  
  -- Remove test payments
  DELETE FROM payments WHERE user_id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');
  
  -- Remove test videos
  DELETE FROM videos WHERE id LIKE '00000000-0000-0000-0000-00000000002%';
  
  -- Remove test courses
  DELETE FROM courses WHERE id LIKE '00000000-0000-0000-0000-00000000001%';
  
  -- Remove test profiles
  DELETE FROM profiles WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
  
  -- Remove test users
  DELETE FROM auth.users WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003');
END $$;

SELECT 'RLS Policy Tests Completed' as status;
