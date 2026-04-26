# MSCE Learn Migration Status

This document provides an overview of all database migrations for the MSCE Learn platform and their current status.

## Migration Files

### 1. Initial Schema (`20240101000000_initial_schema.sql`)

**Status**: ✅ Applied  
**Description**: Complete initial database schema with all core tables, RLS policies, indexes, triggers, and cron jobs.

**Components**:
- **Tables**: profiles, courses, videos, enrollments, payments, progress, audit_log, feature_flags, rate_limits
- **Types**: payment_status, user_role enums
- **Indexes**: Performance indexes for all tables
- **RLS Policies**: Row Level Security for all tables
- **Triggers**: Auto-profile creation, payment protection, audit logging, timestamp updates
- **Cron Jobs**: Payment expiration, rate limit cleanup
- **Views**: active_enrollments, course_stats
- **Seed Data**: Feature flags initial values

### 2. Rate Limits Enhancement (`20240101000007_rate_limits.sql`)

**Status**: ✅ Applied  
**Description**: Enhanced rate limiting table with proper structure and RLS policies.

**Components**:
- **Table**: rate_limits (updated structure)
- **Indexes**: Performance indexes for rate limiting
- **RLS Policies**: Service role only access
- **Cron Job**: Rate limit cleanup every 5 minutes

### 3. Analytics Updates (`20240101000008_analytics_updates.sql`)

**Status**: 🆕 Ready to Apply  
**Description**: Comprehensive analytics and monitoring enhancements for business intelligence.

**Components**:
- **Table Enhancements**: 
  - videos: added `published` column
  - enrollments: added `status` column
  - progress: added `created_at`, `completed_at` columns
  - payments: added `phone_number`, `network` columns
  - audit_log: added `action`, `resource`, `resource_id`, `details` columns
- **New Indexes**: Analytics performance indexes
- **Enhanced RLS Policies**: Service role access for analytics
- **Analytics Views**: 
  - weekly_revenue
  - student_engagement
  - course_performance
  - video_performance
  - payment_analytics
- **Functions**: 
  - detect_mobile_network()
  - update_progress_timestamps()
  - update_analytics_summary()
- **Cron Jobs**:
  - update-enrollment-statuses
  - cleanup-audit-logs
  - update-analytics-summary
- **Summary Table**: analytics_summary for quick metrics

## Database Schema Overview

### Core Tables

| Table | Purpose | Key Features |
|-------|---------|--------------|
| `profiles` | User profiles extending auth.users | Role-based access, phone numbers |
| `courses` | Course catalog | Pricing, publishing status, subjects |
| `videos` | Video lessons | HLS paths, ordering, preview flags |
| `enrollments` | Student enrollments | Expiration tracking, status management |
| `payments` | Payment transactions | Status tracking, network detection |
| `progress` | Learning progress | Completion tracking, watch time |
| `audit_log` | System audit trail | Comprehensive logging, security |
| `feature_flags` | Feature toggles | Dynamic feature control |
| `rate_limits` | API rate limiting | Request throttling |
| `analytics_summary` | Quick analytics | Pre-computed metrics |

### Analytics Views

| View | Purpose | Key Metrics |
|------|---------|-------------|
| `weekly_revenue` | Revenue trends | Weekly revenue, payment counts |
| `student_engagement` | User activity | Enrollment, completion, engagement |
| `course_performance` | Course analytics | Revenue, completion, enrollment |
| `video_performance` | Video analytics | Views, completion, drop-off |
| `payment_analytics` | Payment insights | Daily revenue, network split |
| `active_enrollments` | Current enrollments | Active student access |
| `course_stats` | Course statistics | Comprehensive course data |

### Security Features

- **Row Level Security**: All tables have RLS policies
- **Service Role Access**: Analytics functions require service role
- **Audit Logging**: Comprehensive activity tracking
- **Rate Limiting**: API protection against abuse
- **Data Validation**: Database-level constraints

## Migration Status Check

### Quick Check Script

```bash
# Check migration status
./scripts/check-migrations.sh --check

# Apply pending migrations
./scripts/check-migrations.sh --apply

# Full verification
./scripts/check-migrations.sh --full
```

### Manual Verification

```sql
-- Check applied migrations
SELECT * FROM schema_migrations ORDER BY version;

-- Verify tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS status
SELECT tablename, rowlevelsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Verify indexes
SELECT indexname FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;
```

## Analytics Features

### Revenue Analytics
- **Daily/Weekly Revenue**: Time-based revenue tracking
- **Course Performance**: Revenue by course
- **Network Analysis**: Airtel Money vs TNM Mpamba
- **Payment Health**: Success rates and processing times

### Student Analytics
- **Registration Metrics**: New user acquisition
- **Conversion Rates**: Registration to paid conversion
- **Engagement Tracking**: Lesson completion, watch time
- **Churn Analysis**: Enrollment non-renewal patterns

### Content Analytics
- **Video Performance**: Most watched, completion rates
- **Course Effectiveness**: Student success metrics
- **Drop-off Analysis**: Where students stop watching
- **Content Gaps**: Underperforming areas

### System Analytics
- **Performance Metrics**: API response times, error rates
- **Usage Patterns**: Peak times, user behavior
- **Security Events**: Failed logins, suspicious activity
- **Resource Usage**: Storage, bandwidth consumption

## Performance Optimizations

### Database Indexes
- **Query Performance**: Optimized for common analytics queries
- **Foreign Keys**: Proper indexing for joins
- **Time-based Queries**: Indexes on date columns
- **Full-text Search**: Content search capabilities

### Materialized Views
- **Pre-computed Metrics**: Fast analytics access
- **Scheduled Refresh**: Automated updates
- **Query Optimization**: Reduced computation overhead

### Caching Strategy
- **Summary Tables**: Quick access to key metrics
- **Incremental Updates**: Efficient data refresh
- **Cache Invalidation**: Smart cache management

## Monitoring and Maintenance

### Automated Jobs
- **Data Cleanup**: Old audit log removal
- **Status Updates**: Enrollment expiration handling
- **Metric Updates**: Analytics summary refresh
- **Rate Limit Cleanup**: Expired entry removal

### Health Checks
- **Migration Status**: Automated verification
- **Schema Validation**: Structure integrity checks
- **Performance Monitoring**: Query performance tracking
- **Security Audits**: RLS policy verification

## Troubleshooting

### Common Issues

#### Migration Failures
```bash
# Check migration status
./scripts/check-migrations.sh --check

# Apply specific migration
psql $SUPABASE_URL -f supabase/migrations/20240101000008_analytics_updates.sql

# Record migration manually
INSERT INTO schema_migrations (version) VALUES ('20240101000008_analytics_updates.sql');
```

#### Missing Tables
```sql
-- Verify table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'analytics_summary'
);

-- Recreate if missing
-- Run the specific migration file
```

#### RLS Issues
```sql
-- Check RLS status
SELECT tablename, rowlevelsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Enable RLS if disabled
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

#### Performance Issues
```sql
-- Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;

-- Rebuild indexes if needed
REINDEX INDEX CONCURRENTLY index_name;
```

## Best Practices

### Migration Management
- **Version Control**: All migrations in version control
- **Backward Compatibility**: Maintain compatibility during updates
- **Testing**: Test migrations in staging environment
- **Rollback Plans**: Have rollback procedures ready

### Performance Monitoring
- **Query Analysis**: Regular performance reviews
- **Index Optimization**: Add indexes as needed
- **Cache Management**: Monitor cache effectiveness
- **Resource Planning**: Plan for growth

### Security Maintenance
- **RLS Reviews**: Regular policy audits
- **Access Control**: Monitor service role usage
- **Audit Logs**: Review security events
- **Data Privacy**: Ensure compliance requirements

## Future Enhancements

### Planned Migrations
- **Advanced Analytics**: Machine learning insights
- **Real-time Metrics**: Live dashboard updates
- **Mobile Analytics**: App usage tracking
- **Integration APIs**: Third-party analytics tools

### Scalability Improvements
- **Partitioning**: Table partitioning for large datasets
- **Read Replicas**: Analytics query optimization
- **Data Archiving**: Historical data management
- **Performance Tuning**: Ongoing optimization

## Migration Commands Reference

### Environment Setup
```bash
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_KEY="your-service-role-key"
```

### Migration Operations
```bash
# Check status
./scripts/check-migrations.sh

# Apply all migrations
./scripts/check-migrations.sh --apply

# Verify schema
./scripts/check-migrations.sh --verify

# Full check with interactive prompts
./scripts/check-migrations.sh --full
```

### Direct Database Access
```bash
# Connect to database
psql $SUPABASE_URL

# Run migration file
psql $SUPABASE_URL -f migration_file.sql

# Check specific table
psql $SUPABASE_URL -c "\d table_name"
```

## Support and Documentation

### Resources
- **Migration Guide**: This document
- **Database Schema**: Initial schema file
- **Analytics Guide**: Analytics documentation
- **Troubleshooting**: Common issues and solutions

### Getting Help
- **Issue Tracking**: Create GitHub issues for problems
- **Community Support**: Developer forums and discussions
- **Documentation**: Comprehensive guides and references
- **Code Review**: Peer review for migration changes

The MSCE Learn migration system ensures reliable database schema management with comprehensive analytics capabilities, security features, and performance optimizations.
