-- Initial schema for MSCE Learn platform
-- Migration: 20240101000000_initial_schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed');
CREATE TYPE user_role AS ENUM ('user', 'admin');

-- Create tables
-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade TEXT NOT NULL,
  price_mwk DECIMAL(10,2) NOT NULL CHECK (price_mwk > 0),
  description TEXT,
  preview_video_id UUID,
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
CREATE TABLE videos (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  r2_playlist_path TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  lesson_order INTEGER NOT NULL,
  is_preview BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL CHECK (expires_at > created_at),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id),
  CHECK (expires_at <= created_at + INTERVAL '90 days')
);

-- Payments table
CREATE TABLE payments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  amount_mwk DECIMAL(10,2) NOT NULL CHECK (amount_mwk > 0),
  status payment_status NOT NULL,
  tx_ref TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Progress table
CREATE TABLE progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE NOT NULL,
  seconds_watched INTEGER DEFAULT 0 CHECK (seconds_watched >= 0),
  completed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);

-- Audit log table (append-only)
CREATE TABLE audit_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature flags table
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Rate limits table
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add foreign key constraint for preview_video_id after both tables exist
ALTER TABLE courses 
ADD CONSTRAINT fk_preview_video 
FOREIGN KEY (preview_video_id) REFERENCES videos(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_courses_subject ON courses(subject);
CREATE INDEX idx_courses_grade ON courses(grade);
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_videos_course ON videos(course_id);
CREATE INDEX idx_videos_order ON videos(course_id, lesson_order);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_expires ON enrollments(expires_at);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_tx_ref ON payments(tx_ref);
CREATE INDEX idx_progress_user ON progress(user_id);
CREATE INDEX idx_progress_video ON progress(video_id);
CREATE INDEX idx_audit_log_event ON audit_log(event_type);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_rate_limits_expires ON rate_limits(expires_at);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Courses policies
CREATE POLICY "Published courses are viewable by everyone" ON courses
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "Admins have full access to courses" ON courses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Videos policies
CREATE POLICY "Preview videos are viewable by everyone" ON videos
  FOR SELECT USING (is_preview = TRUE);

CREATE POLICY "Enrolled users can view course videos" ON videos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments 
      WHERE enrollments.user_id = auth.uid() 
        AND enrollments.course_id = videos.course_id 
        AND enrollments.expires_at > NOW()
    )
  );

CREATE POLICY "Admins have full access to videos" ON videos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Enrollments policies
CREATE POLICY "Users can view own enrollments" ON enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage enrollments" ON enrollments
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Payments policies
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role can manage payments" ON payments
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Progress policies
CREATE POLICY "Users can manage own progress" ON progress
  FOR ALL USING (user_id = auth.uid());

-- Audit log policies (NO client access)
-- No policies = no access for any client key, only service_role

-- Feature flags policies
CREATE POLICY "Admins can manage feature flags" ON feature_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Rate limits policies
CREATE POLICY "Service role can manage rate limits" ON rate_limits
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- Functions and Triggers

-- Function to prevent payment rollback
CREATE OR REPLACE FUNCTION prevent_payment_rollback()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'paid' AND NEW.status IN ('pending', 'failed') THEN
    RAISE EXCEPTION 'Cannot rollback paid payment to %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log payment changes
CREATE OR REPLACE FUNCTION log_payment_change()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (event_type, user_id, payload)
  VALUES (
    'payment.status_changed',
    NEW.user_id,
    jsonb_build_object(
      'payment_id', NEW.id,
      'old_status', OLD.status,
      'new_status', NEW.status,
      'amount_mwk', NEW.amount_mwk,
      'tx_ref', NEW.tx_ref
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-create profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(new.raw_user_meta_data->>'email', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers

-- Prevent payment rollback
CREATE TRIGGER prevent_payment_rollback_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION prevent_payment_rollback();

-- Log payment changes
CREATE TRIGGER log_payment_change_trigger
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION log_payment_change();

-- Auto-create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- PG_CRON Jobs

-- Expire pending payments older than 2 hours
SELECT cron.schedule(
  'expire-pending-payments',
  '0 * * * *', -- Every hour
  $$
    UPDATE payments 
    SET status = 'failed', updated_at = NOW()
    WHERE status = 'pending' 
      AND created_at < NOW() - INTERVAL '2 hours'
  $$
);

-- Clean expired rate limits every 30 minutes
SELECT cron.schedule(
  'clean-rate-limits',
  '*/30 * * * *', -- Every 30 minutes
  $$
    DELETE FROM rate_limits 
    WHERE expires_at < NOW()
  $$
);

-- Seed feature flags
INSERT INTO feature_flags (key, enabled, description) VALUES
  ('registrations_open', TRUE, 'Allow new user registrations'),
  ('free_previews', TRUE, 'Enable free video previews'),
  ('sms_renewal_reminders', FALSE, 'Send SMS reminders for renewals'),
  ('maintenance_mode', FALSE, 'Put site in maintenance mode'),
  ('airtel_money', TRUE, 'Enable Airtel Money payments'),
  ('tnm_mpamba', TRUE, 'Enable TNM Mpamba payments');

-- Create views for common queries

-- Active enrollments view
CREATE VIEW active_enrollments AS
SELECT 
  e.*,
  c.title as course_title,
  c.subject,
  c.grade,
  p.full_name as user_name
FROM enrollments e
JOIN courses c ON e.course_id = c.id
JOIN profiles p ON e.user_id = p.id
WHERE e.expires_at > NOW();

-- Course statistics view
CREATE VIEW course_stats AS
SELECT 
  c.id,
  c.title,
  c.subject,
  c.grade,
  c.price_mwk,
  COUNT(DISTINCT e.id) as enrollment_count,
  COUNT(DISTINCT CASE WHEN e.expires_at > NOW() THEN e.id END) as active_enrollments,
  COUNT(DISTINCT v.id) as video_count,
  COALESCE(SUM(p.amount_mwk), 0) as total_revenue
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN videos v ON c.id = v.course_id
LEFT JOIN payments p ON c.id = p.course_id AND p.status = 'paid'
GROUP BY c.id, c.title, c.subject, c.grade, c.price_mwk;
