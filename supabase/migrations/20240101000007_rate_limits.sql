-- Create rate_limits table for API rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_created_at ON rate_limits(key, created_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- Add RLS policies
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role full access to rate_limits" ON rate_limits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Create cron job to clean up old rate limit entries
SELECT cron.schedule(
  'cleanup-rate-limits',
  '*/5 * * * *', -- Every 5 minutes
  $$
    DELETE FROM rate_limits 
    WHERE created_at < NOW() - INTERVAL '1 hour'
  $$
);

-- Add comment
COMMENT ON TABLE rate_limits IS 'Rate limiting table for API endpoint protection';
