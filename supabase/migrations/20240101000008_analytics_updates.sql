-- Analytics and Monitoring Updates
-- Migration: 20240101000008_analytics_updates.sql

-- Add missing columns for better analytics
ALTER TABLE videos ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE;
ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled'));
ALTER TABLE progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Update enrollments status based on expiration
UPDATE enrollments SET status = 'expired' WHERE expires_at < NOW();

-- Add phone_number to payments for network analysis
ALTER TABLE payments ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published);
CREATE INDEX IF NOT EXISTS idx_videos_course_published ON videos(course_id, published);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_status ON enrollments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_progress_created_at ON progress(created_at);
CREATE INDEX IF NOT EXISTS idx_progress_completed_at ON progress(completed_at);
CREATE INDEX IF NOT EXISTS idx_progress_user_completed ON progress(user_id, completed);
CREATE INDEX IF NOT EXISTS idx_payments_phone ON payments(phone_number);
CREATE INDEX IF NOT EXISTS idx_payments_created_status ON payments(created_at, status);

-- Update RLS policies for analytics
-- Allow service role full access for analytics
CREATE POLICY IF NOT EXISTS "Service role full access to videos" ON videos
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role full access to progress" ON progress
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role full access to payments" ON payments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY IF NOT EXISTS "Service role full access to enrollments" ON enrollments
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enhanced video access policy for analytics
CREATE POLICY IF NOT EXISTS "Published videos are public" ON videos
  FOR SELECT USING (published = TRUE AND is_preview = TRUE);

CREATE POLICY IF NOT EXISTS "Users can access enrolled course videos" ON videos
  FOR SELECT USING (
    published = TRUE AND (
      is_preview = TRUE OR
      EXISTS (
        SELECT 1 FROM enrollments e 
        WHERE e.user_id = auth.uid() 
        AND e.course_id = videos.course_id 
        AND e.status = 'active' 
        AND e.expires_at > NOW()
      )
    )
  );

-- Update progress tracking trigger
CREATE OR REPLACE FUNCTION update_progress_timestamps()
RETURNS TRIGGER AS $$
BEGIN
  -- Update completed_at when marking as completed
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Set created_at if not set
  IF NEW.created_at IS NULL THEN
    NEW.created_at = NOW();
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_progress_trigger ON progress;

-- Create the trigger
CREATE TRIGGER update_progress_trigger
  BEFORE INSERT OR UPDATE ON progress
  FOR EACH ROW
  EXECUTE FUNCTION update_progress_timestamps();

-- Create analytics views for better performance

-- Weekly revenue view
CREATE OR REPLACE VIEW weekly_revenue AS
SELECT 
  DATE_TRUNC('week', created_at) as week_start,
  DATE_TRUNC('week', created_at) + INTERVAL '6 days' as week_end,
  SUM(CASE WHEN status = 'paid' THEN amount_mwk ELSE 0 END) as paid_revenue,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payments,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
  COUNT(*) as total_payments
FROM payments
GROUP BY DATE_TRUNC('week', created_at)
ORDER BY week_start DESC;

-- Student engagement view
CREATE OR REPLACE VIEW student_engagement AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.created_at as registration_date,
  COUNT(DISTINCT e.course_id) as enrolled_courses,
  COUNT(DISTINCT CASE WHEN e.status = 'active' AND e.expires_at > NOW() THEN e.course_id END) as active_courses,
  COUNT(DISTINCT pr.video_id) as lessons_started,
  COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN pr.video_id END) as lessons_completed,
  COALESCE(SUM(pr.seconds_watched), 0) as total_seconds_watched,
  COALESCE(AVG(pr.seconds_watched), 0) as avg_seconds_per_lesson,
  MAX(pr.created_at) as last_activity,
  CASE WHEN EXISTS(SELECT 1 FROM payments pay WHERE pay.user_id = p.id AND pay.status = 'paid') THEN TRUE ELSE FALSE END as is_paid_user
FROM profiles p
LEFT JOIN enrollments e ON p.id = e.user_id
LEFT JOIN progress pr ON p.id = pr.user_id
GROUP BY p.id, p.full_name, p.created_at;

-- Course performance view
CREATE OR REPLACE VIEW course_performance AS
SELECT 
  c.id as course_id,
  c.title,
  c.subject,
  c.grade,
  c.price_mwk,
  COUNT(DISTINCT v.id) as total_videos,
  COUNT(DISTINCT CASE WHEN v.published = TRUE THEN v.id END) as published_videos,
  COUNT(DISTINCT e.user_id) as total_enrollments,
  COUNT(DISTINCT CASE WHEN e.status = 'active' AND e.expires_at > NOW() THEN e.user_id END) as active_enrollments,
  COUNT(DISTINCT CASE WHEN e.expires_at <= NOW() THEN e.user_id END) as expired_enrollments,
  COALESCE(SUM(CASE WHEN pay.status = 'paid' THEN pay.amount_mwk ELSE 0 END), 0) as total_revenue,
  COUNT(DISTINCT CASE WHEN pay.status = 'paid' THEN pay.user_id END) as paying_students,
  COUNT(DISTINCT pr.video_id) as lessons_started,
  COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN pr.video_id END) as lessons_completed,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN pr.video_id END) > 0 AND COUNT(DISTINCT pr.video_id) > 0
    THEN ROUND((COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN pr.video_id END)::decimal / COUNT(DISTINCT pr.video_id)) * 100, 2)
    ELSE 0
  END as completion_rate
FROM courses c
LEFT JOIN videos v ON c.id = v.course_id
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN payments pay ON c.id = pay.course_id AND pay.user_id = e.user_id
LEFT JOIN progress pr ON v.id = pr.video_id
GROUP BY c.id, c.title, c.subject, c.grade, c.price_mwk;

-- Video performance view
CREATE OR REPLACE VIEW video_performance AS
SELECT 
  v.id as video_id,
  v.title,
  v.lesson_order,
  v.duration_seconds,
  v.is_preview,
  v.published,
  c.title as course_title,
  c.subject,
  COUNT(DISTINCT pr.user_id) as total_views,
  COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN pr.user_id END) as completed_views,
  COALESCE(AVG(pr.seconds_watched), 0) as avg_seconds_watched,
  CASE 
    WHEN COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN pr.user_id END) > 0 AND COUNT(DISTINCT pr.user_id) > 0
    THEN ROUND((COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN pr.user_id END)::decimal / COUNT(DISTINCT pr.user_id)) * 100, 2)
    ELSE 0
  END as completion_rate,
  CASE 
    WHEN COUNT(DISTINCT pr.user_id) > 0
    THEN ROUND(((COUNT(DISTINCT pr.user_id) - COUNT(DISTINCT CASE WHEN pr.completed = TRUE THEN pr.user_id END))::decimal / COUNT(DISTINCT pr.user_id)) * 100, 2)
    ELSE 0
  END as drop_off_rate,
  MAX(pr.created_at) as last_viewed
FROM videos v
JOIN courses c ON v.course_id = c.id
LEFT JOIN progress pr ON v.id = pr.video_id
GROUP BY v.id, v.title, v.lesson_order, v.duration_seconds, v.is_preview, v.published, c.title, c.subject;

-- Payment analytics view
CREATE OR REPLACE VIEW payment_analytics AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_payments,
  COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_payments,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
  COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_mwk ELSE 0 END), 0) as daily_revenue,
  COALESCE(AVG(CASE WHEN status = 'paid' THEN EXTRACT(EPOCH FROM (updated_at - created_at)) ELSE NULL END), 0) as avg_confirmation_seconds,
  COUNT(DISTINCT user_id) as unique_payers,
  COUNT(DISTINCT CASE WHEN phone_number LIKE '088%' OR phone_number LIKE '099%' OR phone_number LIKE '098%' THEN user_id END) as airtel_users,
  COUNT(DISTINCT CASE WHEN phone_number LIKE '095%' OR phone_number LIKE '096%' OR phone_number LIKE '097%' OR phone_number LIKE '091%' OR phone_number LIKE '090%' THEN user_id END) as tnm_users
FROM payments
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Update audit log structure for better analytics
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS resource TEXT;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS resource_id UUID;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS details JSONB;

-- Create indexes for audit log analytics
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource_id ON audit_log(resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_details ON audit_log USING GIN(details);

-- Update RLS for audit log
CREATE POLICY IF NOT EXISTS "Service role full access to audit_log" ON audit_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function for mobile money network detection
CREATE OR REPLACE FUNCTION detect_mobile_network(phone_number TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone_number IS NULL OR phone_number = '' THEN
    RETURN 'Unknown';
  END IF;
  
  -- Clean the phone number (remove non-digits)
  phone_number := REGEXP_REPLACE(phone_number, '[^0-9]', '', 'g');
  
  -- Airtel Money prefixes (Malawi)
  IF phone_number ~ '^(088|099|098)' THEN
    RETURN 'Airtel Money';
  END IF;
  
  -- TNM Mpamba prefixes (Malawi)
  IF phone_number ~ '^(095|096|097|091|090)' THEN
    RETURN 'TNM Mpamba';
  END IF;
  
  RETURN 'Unknown';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add computed column for network detection
ALTER TABLE payments ADD COLUMN IF NOT EXISTS network TEXT GENERATED ALWAYS AS (detect_mobile_network(phone_number)) STORED;

-- Create index on network
CREATE INDEX IF NOT EXISTS idx_payments_network ON payments(network);

-- Create additional cron jobs for analytics

-- Update enrollment statuses daily
SELECT cron.schedule(
  'update-enrollment-statuses',
  '0 2 * * *', -- Daily at 2 AM
  $$
    UPDATE enrollments 
    SET status = 'expired' 
    WHERE status = 'active' AND expires_at < NOW();
  $$
);

-- Clean up old audit logs (keep 90 days)
SELECT cron.schedule(
  'cleanup-audit-logs',
  '0 3 * * *', -- Daily at 3 AM
  $$
    DELETE FROM audit_log 
    WHERE created_at < NOW() - INTERVAL '90 days';
  $$
);

-- Update course statistics
SELECT cron.schedule(
  'update-course-stats',
  '0 1 * * *', -- Daily at 1 AM
  $$
    -- Refresh materialized views if they exist
    -- This helps maintain performance for analytics queries
    BEGIN
      PERFORM pg_relisalive('pg_stat_statements');
    EXCEPTION WHEN undefined_object THEN
      -- pg_stat_statements not available, skip
    END;
  $$
);

-- Add comments for documentation
COMMENT ON TABLE weekly_revenue IS 'Weekly revenue breakdown for analytics';
COMMENT ON TABLE student_engagement IS 'Student engagement metrics for analytics';
COMMENT ON TABLE course_performance IS 'Course performance metrics for analytics';
COMMENT ON TABLE video_performance IS 'Video performance metrics for analytics';
COMMENT ON TABLE payment_analytics IS 'Payment analytics with network breakdown';
COMMENT ON FUNCTION detect_mobile_network IS 'Detects mobile money network from phone number';

-- Grant necessary permissions for analytics
GRANT SELECT ON weekly_revenue TO service_role;
GRANT SELECT ON student_engagement TO service_role;
GRANT SELECT ON course_performance TO service_role;
GRANT SELECT ON video_performance TO service_role;
GRANT SELECT ON payment_analytics TO service_role;

-- Update existing rate_limits table to match the new structure
ALTER TABLE rate_limits DROP COLUMN IF EXISTS expires_at;
ALTER TABLE rate_limits ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour');

-- Update the rate limits cleanup job
SELECT cron.unschedule('cleanup-rate-limits');

SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/5 * * * *', -- Every 5 minutes
  $$
    DELETE FROM rate_limits 
    WHERE expires_at < NOW();
  $$
);

-- Create a summary table for quick analytics access
CREATE TABLE IF NOT EXISTS analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, metric_name)
);

-- Add indexes for analytics summary
CREATE INDEX IF NOT EXISTS idx_analytics_summary_date ON analytics_summary(date);
CREATE INDEX IF NOT EXISTS idx_analytics_summary_metric ON analytics_summary(metric_name);

-- Add RLS for analytics summary
ALTER TABLE analytics_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Service role full access to analytics_summary" ON analytics_summary
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create function to update analytics summary
CREATE OR REPLACE FUNCTION update_analytics_summary()
RETURNS void AS $$
BEGIN
  -- Update daily revenue summary
  INSERT INTO analytics_summary (date, metric_name, metric_value, metadata)
  SELECT 
    DATE(created_at) as date,
    'daily_revenue' as metric_name,
    COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_mwk ELSE 0 END), 0) as metric_value,
    json_build_object(
      'paid_payments', COUNT(CASE WHEN status = 'paid' THEN 1 END),
      'failed_payments', COUNT(CASE WHEN status = 'failed' THEN 1 END),
      'pending_payments', COUNT(CASE WHEN status = 'pending' THEN 1 END)
    ) as metadata
  FROM payments
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY DATE(created_at)
  ON CONFLICT (date, metric_name) 
  DO UPDATE SET 
    metric_value = EXCLUDED.metric_value,
    metadata = EXCLUDED.metadata,
    created_at = NOW();
    
  -- Update daily registrations summary
  INSERT INTO analytics_summary (date, metric_name, metric_value, metadata)
  SELECT 
    DATE(created_at) as date,
    'daily_registrations' as metric_name,
    COUNT(*) as metric_value,
    json_build_object(
      'paid_users', COUNT(CASE WHEN EXISTS(SELECT 1 FROM payments p WHERE p.user_id = profiles.id AND p.status = 'paid') THEN 1 END)
    ) as metadata
  FROM profiles
  WHERE DATE(created_at) = CURRENT_DATE
  GROUP BY DATE(created_at)
  ON CONFLICT (date, metric_name) 
  DO UPDATE SET 
    metric_value = EXCLUDED.metric_value,
    metadata = EXCLUDED.metadata,
    created_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule analytics summary update
SELECT cron.schedule(
  'update-analytics-summary',
  '*/30 * * * *', -- Every 30 minutes
  $$
    SELECT update_analytics_summary();
  $$
);

-- Add comment
COMMENT ON TABLE analytics_summary IS 'Daily summary metrics for quick analytics access';
