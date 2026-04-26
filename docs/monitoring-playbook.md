# MSCE Learn Monitoring Playbook

This guide provides comprehensive monitoring procedures for MSCE Learn administrators, covering daily, weekly, and monthly checks, troubleshooting procedures, and escalation paths.

## 📅 Monitoring Schedule

### Daily Checks (5 minutes)

#### 1. Payment Health Dashboard
**Access**: `/admin` → Command Centre → Payment Status

**What to Check**:
- [ ] **Pending Payments**: Count and age of pending payments
  - **Normal**: < 10 pending payments
  - **Warning**: 10-20 pending payments
  - **Critical**: > 20 pending payments
- [ ] **Failed Payment Rate**: Percentage of failed payments
  - **Normal**: < 5%
  - **Warning**: 5-10%
  - **Critical**: > 10%
- [ ] **New Registrations**: Daily new user signups
  - **Normal**: 5-50 per day
  - **Warning**: < 5 or > 100
  - **Critical**: 0 or > 200

**Quick Actions**:
```bash
# Check stuck payments (API)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/admin/analytics" | jq '.payment_health.stuck_pending_payments'

# Check recent registrations
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/admin/stats" | jq '.new_users_today'
```

#### 2. System Health
**What to Check**:
- [ ] **API Response Time**: Quick test of key endpoints
- [ ] **Error Rate**: Check for unusual error spikes
- [ ] **Database Connections**: Monitor connection pool usage

**Health Check Commands**:
```bash
# API health check
curl -I "$API_URL/health"

# Database connection check
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/admin/health" | jq '.database.connections'
```

### Weekly Checks (15 minutes)

#### 1. Revenue Report Review
**Access**: `/admin/analytics`

**What to Review**:
- [ ] **Revenue Trends**: Week-over-week revenue change
  - **Good**: > 10% growth
  - **Warning**: 0-10% growth or slight decline
  - **Critical**: > 10% decline
- [ ] **Revenue by Network**: Airtel vs TNM Mpamba split
  - **Normal**: 60/40 to 40/60 split
  - **Warning**: > 80/20 split (investigate network issues)
- [ ] **Revenue by Course**: Top performing courses
  - **Action**: Promote high-performing courses
  - **Action**: Investigate underperforming courses

#### 2. Student Engagement Analysis
**What to Review**:
- [ ] **Conversion Rate**: Registered → Paid users
  - **Good**: > 15%
  - **Warning**: 10-15%
  - **Critical**: < 10%
- [ ] **Churn Rate**: Non-renewed enrollments
  - **Good**: < 20%
  - **Warning**: 20-30%
  - **Critical**: > 30%
- [ ] **Expiring Enrollments**: Students with expiring access
  - **Action**: Send renewal reminders 7 days before expiry
  - **Action**: Monitor renewal campaign effectiveness

#### 3. Content Performance Review
**What to Review**:
- [ ] **Most Watched Lessons**: Popular content identification
  - **Action**: Create more similar content
  - **Action**: Feature popular lessons
- [ ] **Completion Rates**: Course completion analysis
  - **Good**: > 60% average
  - **Warning**: 40-60%
  - **Critical**: < 40%
- [ ] **Drop-off Points**: Where students stop watching
  - **Action**: Improve problematic lessons
  - **Action**: Add engagement hooks at drop-off points

#### 4. Payment System Health
**What to Review**:
- [ ] **Payment Confirmation Time**: Average webhook processing time
  - **Good**: < 30 seconds
  - **Warning**: 30-60 seconds
  - **Critical**: > 60 seconds
- [ ] **Stuck Payments**: Payments pending > 1 hour
  - **Action**: Manual review and intervention
  - **Action**: Contact PayChangu if systematic issues

### Monthly Checks (30 minutes)

#### 1. Security Audit
**What to Review**:
- [ ] **Failed Login Attempts**: Unusual login failure patterns
  - **Check**: `/admin/security` → Failed logins (24h)
  - **Action**: Block suspicious IPs
  - **Action**: Enable additional security measures
- [ ] **Webhook Signature Failures**: Invalid webhook attempts
  - **Check**: `/admin/security` → Webhook sig failures
  - **Action**: Investigate systematic issues
  - **Action**: Update webhook secrets if compromised
- [ ] **Admin Activity**: Review admin action logs
  - **Check**: `/admin/audit` → Admin actions
  - **Action**: Verify all actions are authorized
  - **Action**: Investigate any unusual admin activity

#### 2. System Maintenance
**What to Review**:
- [ ] **Database Performance**: Slow query analysis
  ```sql
  SELECT query, mean_time, calls 
  FROM pg_stat_statements 
  WHERE mean_time > 100 
  ORDER BY mean_time DESC 
  LIMIT 10;
  ```
- [ ] **Storage Usage**: Video storage and database size
  - **Check**: Cloudflare R2 usage
  - **Check**: Database size growth
  - **Action**: Plan storage expansion if needed
- [ ] **Backup Verification**: Confirm backup integrity
  - **Action**: Test restore process
  - **Action**: Verify backup schedules

#### 3. Dependency Updates
**What to Review**:
- [ ] **Package Updates**: Check for security updates
  ```bash
  npm audit
  deno check --remote
  ```
- [ ] **Edge Function Updates**: Review function performance
  - **Check**: Function execution times
  - **Action**: Optimize slow functions
  - **Action**: Update dependencies

#### 4. Business Metrics Review
**What to Review**:
- [ ] **Monthly Revenue**: Total and by payment method
- [ ] **User Growth**: Registration and paid user trends
- [ ] **Content ROI**: Revenue per course investment
- [ ] **Customer Acquisition Cost**: Marketing spend vs. new users

## 🚨 Troubleshooting Guide

### Payment Issues

#### Payment Stuck in Pending Status
**Symptoms**: Payment created but not confirmed after 1+ hours

**Immediate Actions**:
1. **Check Payment Status**:
   ```bash
   curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "$API_URL/admin/payments?status=pending"
   ```

2. **Verify Webhook Receipt**:
   ```sql
   SELECT * FROM audit_log 
   WHERE action = 'payment_callback' 
   AND created_at > NOW() - INTERVAL '2 hours'
   ORDER BY created_at DESC;
   ```

3. **Check PayChangu Status**:
   - Verify payment status in PayChangu dashboard
   - Check for webhook delivery issues

**Resolution Steps**:
1. **Manual Confirmation**: If payment is successful in PayChangu:
   ```sql
   UPDATE payments 
   SET status = 'paid', updated_at = NOW() 
   WHERE tx_ref = 'STUCK_TX_REF';
   
   INSERT INTO enrollments (user_id, course_id, status, expires_at)
   VALUES ('USER_ID', 'COURSE_ID', 'active', NOW() + INTERVAL '30 days');
   ```

2. **Manual Cancellation**: If payment failed:
   ```sql
   UPDATE payments 
   SET status = 'failed', updated_at = NOW() 
   WHERE tx_ref = 'STUCK_TX_REF';
   ```

3. **Contact PayChangu**: If systematic issues persist

**Prevention**:
- Monitor webhook delivery logs
- Set up webhook failure alerts
- Implement automatic retry logic

#### Webhook Not Firing
**Symptoms**: Payments created but no webhook callbacks received

**Diagnosis**:
1. **Check Webhook URL**:
   ```bash
   curl -I "$WEBHOOK_URL"
   ```

2. **Verify Webhook Configuration**:
   - Check PayChangu webhook settings
   - Verify webhook URL is correct
   - Check webhook secret key

3. **Check Server Logs**:
   ```bash
   # Check Edge Function logs
   supabase functions logs payment-callback --limit 50
   ```

**Resolution**:
1. **Update Webhook URL**: If URL is incorrect
2. **Restart Edge Function**: If function is stuck
3. **Contact PayChangu**: If webhook delivery issues

### Video Issues

#### Video Won't Load
**Symptoms**: Video player shows loading but never starts

**Diagnosis**:
1. **Check Video URL Generation**:
   ```bash
   curl -X POST -H "Authorization: Bearer $USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"course_id":"UUID","video_id":"UUID"}' \
     "$API_URL/video-url"
   ```

2. **Verify Video Storage**: Check Cloudflare R2 bucket
3. **Check HLS Playlist**: Verify playlist.m3u8 is accessible

**Resolution**:
1. **Regenerate Signed URL**: If URL expired
2. **Reprocess Video**: If video file corrupted
3. **Check CDN Configuration**: If CDN issues

**Video Processing Commands**:
```bash
# Reprocess video with FFmpeg
./scripts/process-video.sh input.mp4 mathematics algebra-basics

# Update video R2 path in database
UPDATE videos 
SET r2_playlist_path = 'courses/mathematics/algebra-basics/playlist.m3u8'
WHERE id = 'VIDEO_UUID';
```

#### Video Playback Issues
**Symptoms**: Video starts but buffers or stops playing

**Diagnosis**:
1. **Check Network**: Test video loading on different networks
2. **Check Video Encoding**: Verify HLS chunks are accessible
3. **Check CDN Performance**: Monitor CDN response times

**Resolution**:
1. **Optimize Video Encoding**: Lower bitrate if needed
2. **Improve CDN Configuration**: Add edge locations
3. **Implement Adaptive Bitrate**: Multiple quality levels

### Access Issues

#### Student Can't Access Paid Course
**Symptoms**: Student reports unable to access purchased course

**Diagnosis**:
1. **Check Enrollment Status**:
   ```sql
   SELECT * FROM enrollments 
   WHERE user_id = 'STUDENT_ID' AND course_id = 'COURSE_ID';
   ```

2. **Check Payment Status**:
   ```sql
   SELECT * FROM payments 
   WHERE user_id = 'STUDENT_ID' AND course_id = 'COURSE_ID'
   ORDER BY created_at DESC;
   ```

3. **Check Expiration Date**:
   ```sql
   SELECT expires_at, NOW() as current_time 
   FROM enrollments 
   WHERE user_id = 'STUDENT_ID' AND course_id = 'COURSE_ID';
   ```

**Resolution**:
1. **Create Missing Enrollment**: If payment successful but no enrollment:
   ```sql
   INSERT INTO enrollments (user_id, course_id, status, expires_at)
   VALUES ('STUDENT_ID', 'COURSE_ID', 'active', NOW() + INTERVAL '30 days');
   ```

2. **Extend Expired Enrollment**: If enrollment recently expired:
   ```sql
   UPDATE enrollments 
   SET expires_at = NOW() + INTERVAL '30 days' 
   WHERE user_id = 'STUDENT_ID' AND course_id = 'COURSE_ID';
   ```

3. **Manual Payment Confirmation**: If payment stuck:
   ```sql
   UPDATE payments 
   SET status = 'paid' 
   WHERE tx_ref = 'STUCK_TX_REF';
   ```

### Security Issues

#### Suspicious Login Activity Detected
**Symptoms**: Unusual login patterns or failed login spikes

**Immediate Actions**:
1. **Review Security Dashboard**: `/admin/security`
2. **Check Failed Login Locations**:
   ```sql
   SELECT details->>'ip_address' as ip, COUNT(*) as attempts
   FROM audit_log 
   WHERE action = 'login_failed' 
   AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY ip
   ORDER BY attempts DESC;
   ```

3. **Block Suspicious IPs**: If necessary
   ```bash
   # Add to firewall or rate limiting
   # Note: This requires server-level access
   ```

**Resolution**:
1. **Reset Compromised Accounts**: If breach confirmed
2. **Enable Additional Security**: 2FA, email verification
3. **Monitor Activity**: Continue monitoring for patterns

**Prevention**:
- Implement IP-based rate limiting
- Monitor geographic anomalies
- Set up security alerts

## 📞 Escalation Paths

### Payment System Issues

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| **Critical** | < 15 minutes | Payment System Lead → CTO |
| **High** | < 1 hour | Payment System Lead |
| **Medium** | < 4 hours | Admin Team |
| **Low** | < 24 hours | Admin Team |

**Critical Payment Issues**:
- Complete payment system failure
- Revenue loss > $100/hour
- Data breach suspected

**Contacts**:
- **Payment System Lead**: [Name] - [Phone] - [Email]
- **CTO**: [Name] - [Phone] - [Email]
- **PayChangu Support**: [Contact Information]

### Technical Issues

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| **Critical** | < 30 minutes | DevOps Lead → CTO |
| **High** | < 2 hours | DevOps Lead |
| **Medium** | < 8 hours | Development Team |
| **Low** | < 24 hours | Development Team |

**Critical Technical Issues**:
- Complete system outage
- Database corruption
- Security breach
- Data loss

**Contacts**:
- **DevOps Lead**: [Name] - [Phone] - [Email]
- **CTO**: [Name] - [Phone] - [Email]
- **Database Admin**: [Name] - [Phone] - [Email]

### Customer Issues

| Severity | Response Time | Escalation Path |
|----------|---------------|-----------------|
| **Critical** | < 1 hour | Support Lead → Product Manager |
| **High** | < 4 hours | Support Team |
| **Medium** | < 24 hours | Support Team |
| **Low** | < 72 hours | Support Team |

**Critical Customer Issues**:
- Multiple users unable to access paid content
- Payment processing failures affecting multiple users
- Data privacy concerns

**Contacts**:
- **Support Lead**: [Name] - [Phone] - [Email]
- **Product Manager**: [Name] - [Phone] - [Email]

## 📊 Monitoring Tools and Commands

### API Monitoring

```bash
# API Health Check
curl -I "$API_URL/health"

# Response Time Monitoring
curl -w "@curl-format.txt" -o /dev/null -s "$API_URL/courses"

# Error Rate Monitoring
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "$API_URL/admin/stats" | jq '.error_rate'
```

**curl-format.txt**:
```
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
```

### Database Monitoring

```sql
-- Active Connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Slow Queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC 
LIMIT 10;

-- Table Sizes
SELECT schemaname, tablename, 
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Edge Function Monitoring

```bash
# Function Logs
supabase functions logs payment-callback --limit 50

# Function Metrics
supabase functions list

# Function Deployment Status
supabase functions status
```

### System Monitoring

```bash
# Server Resources
df -h
free -h
top -bn1 | head -20

# Network Connections
netstat -an | grep :80 | wc -l
netstat -an | grep :443 | wc -l

# Process Monitoring
ps aux | grep node
ps aux | grep deno
```

## 🚨 Alert Configuration

### Critical Alerts

1. **Payment System Down**
   - **Trigger**: No successful payments for 30 minutes
   - **Action**: Immediate notification to payment team

2. **High Error Rate**
   - **Trigger**: Error rate > 10% for 5 minutes
   - **Action**: Page development team

3. **Database Connection Issues**
   - **Trigger**: Connection pool > 90% utilized
   - **Action**: Database admin notification

4. **Security Breach**
   - **Trigger**: Failed login rate > 20%
   - **Action**: Security team notification

### Warning Alerts

1. **Performance Degradation**
   - **Trigger**: Response time > 2 seconds for 5 minutes
   - **Action**: Development team notification

2. **Storage Usage**
   - **Trigger**: Storage usage > 80%
   - **Action**: Operations team notification

3. **User Activity Spike**
   - **Trigger**: Unusual user activity patterns
   - **Action**: Admin team review

## 📋 Monitoring Checklist Templates

### Daily Monitoring Checklist Template

```
Date: ___________
Monitor: ___________

✅ Payment Health
  - Pending payments: ___ (< 10)
  - Failed rate: ___% (< 5%)
  - New registrations: ___ (5-50)

✅ System Health
  - API response time: ___ms (< 1000ms)
  - Error rate: ___% (< 1%)
  - Database connections: ___% (< 80%)

Issues Found:
- _________________________________________________
- _________________________________________________

Actions Taken:
- _________________________________________________
- _________________________________________________

Escalation Required: Yes/No
If Yes, Contact: _____________________________
```

### Weekly Monitoring Checklist Template

```
Week of: ___________
Monitor: ___________

✅ Revenue Review
  - Revenue change: ___% (> -10%)
  - Network split: Airtel ___%, TNM ___%
  - Top course: ___________

✅ Student Engagement
  - Conversion rate: ___% (> 10%)
  - Churn rate: ___% (< 30%)
  - Expiring enrollments: ___

✅ Content Performance
  - Avg completion rate: ___% (> 40%)
  - Drop-off point: Lesson ___
  - Most popular: ___________

✅ Payment Health
  - Confirmation time: ___s (< 60s)
  - Stuck payments: ___ (< 5)
  - Failed rate: ___% (< 10%)

Trends Identified:
- _________________________________________________
- _________________________________________________

Recommendations:
- _________________________________________________
- _________________________________________________
```

## 🔄 Continuous Improvement

### Monitoring Optimization

1. **Monthly Review**: Assess monitoring effectiveness
2. **Alert Tuning**: Reduce false positives
3. **Dashboard Updates**: Improve visualization
4. **Automation**: Automate routine checks

### Training and Documentation

1. **Team Training**: Monthly monitoring workshops
2. **Documentation Updates**: Keep procedures current
3. **Runbooks**: Create detailed troubleshooting guides
4. **Knowledge Sharing**: Post-incident reviews

### Tool Improvements

1. **Custom Dashboards**: Build specialized views
2. **Automated Reporting**: Schedule report generation
3. **Integration**: Connect monitoring tools
4. **Mobile Access**: Mobile-friendly monitoring

This monitoring playbook ensures MSCE Learn maintains high availability, performance, and security while providing excellent user experience and business insights.
