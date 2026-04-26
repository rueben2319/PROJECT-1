# MSCE Learn Analytics Guide

This guide covers the comprehensive analytics and monitoring system for MSCE Learn, providing business intelligence, operational insights, and performance metrics.

## Overview

The MSCE Learn analytics system provides real-time insights into business performance, user engagement, content effectiveness, and system health. The system is designed to help administrators make data-driven decisions and identify opportunities for growth and optimization.

## Analytics Architecture

### Data Sources

1. **Payment Data**: Transaction records, revenue tracking, payment method analysis
2. **User Data**: Registration patterns, conversion rates, engagement metrics
3. **Content Data**: Video performance, completion rates, drop-off analysis
4. **System Data**: API performance, error rates, response times
5. **Audit Data**: Security events, admin actions, system changes

### Data Processing

- **Real-time Analytics**: Live dashboard with current metrics
- **Weekly Reports**: Comprehensive business intelligence reports
- **Historical Trends**: Long-term pattern analysis
- **Predictive Analytics**: Churn prediction and revenue forecasting

## Analytics Dashboard (`/admin/analytics`)

### Key Metrics Overview

#### Revenue Metrics
- **Total Revenue**: Weekly revenue with week-over-week comparison
- **Revenue by Day**: Daily revenue breakdown for trend analysis
- **Revenue by Course**: Top-performing courses identification
- **Revenue by Network**: Airtel Money vs TNM Mpamba split

#### Student Metrics
- **New Registrations**: Weekly new user acquisition
- **Conversion Rate**: Registration to paid user conversion
- **Churn Rate**: Enrollment non-renewal percentage
- **Active Students**: Most engaged users identification

#### Content Metrics
- **Most Watched Lessons**: Popular content identification
- **Completion Rates**: Course completion analysis
- **Drop-off Points**: Lesson engagement analysis
- **Engagement Patterns**: User behavior insights

#### Payment Health
- **Failed Payment Rate**: Payment processing success rate
- **Confirmation Time**: Average webhook processing time
- **Stuck Payments**: Pending payments requiring attention

### Visualizations

#### Charts and Graphs
- **Bar Charts**: Revenue by day and course
- **Progress Bars**: Completion rates and engagement metrics
- **Trend Indicators**: Week-over-week changes with color coding
- **Status Indicators**: Health metrics with color-coded alerts

#### Data Tables
- **Top Students**: Most active users with engagement metrics
- **Course Performance**: Completion rates with student counts
- **Payment Issues**: Stuck payments with resolution status

## Analytics API (`/api/admin/analytics`)

### Endpoint Overview

**Method**: `GET`  
**Authentication**: Admin role required  
**Response**: JSON with comprehensive analytics data

### Response Structure

```json
{
  "report_period": {
    "current_week": {
      "start": "2024-01-20T00:00:00Z",
      "end": "2024-01-27T00:00:00Z"
    },
    "last_week": {
      "start": "2024-01-13T00:00:00Z",
      "end": "2024-01-20T00:00:00Z"
    }
  },
  "generated_at": "2024-01-27T10:00:00Z",
  "revenue": {
    "total_this_week": 150000,
    "total_last_week": 120000,
    "change_percentage": 25.0,
    "by_day": [
      {"date": "2024-01-20", "revenue": 20000},
      {"date": "2024-01-21", "revenue": 25000}
    ],
    "by_course": [
      {"course": "Mathematics Basics", "amount": 50000},
      {"course": "Biology Fundamentals", "amount": 40000}
    ],
    "by_network": [
      {"network": "Airtel Money", "amount": 90000},
      {"network": "TNM Mpamba", "amount": 60000}
    ]
  },
  "students": {
    "new_registrations_this_week": 45,
    "total_registered": 1250,
    "total_paid_users": 187,
    "conversion_rate": 15.0,
    "churn_rate": 12.5,
    "expiring_enrollments_next_7_days": 23,
    "most_active_students": [
      {
        "user_id": "uuid",
        "lessons_completed": 15,
        "unique_courses": 3
      }
    ]
  },
  "content": {
    "most_watched_lessons": [
      {
        "video_id": "uuid",
        "title": "Introduction to Algebra",
        "course": "Mathematics Basics",
        "play_count": 234
      }
    ],
    "average_completion_rates": [
      {
        "course": "Mathematics Basics",
        "completion_rate": 75.0,
        "total_students": 50,
        "completed_students": 38
      }
    ],
    "drop_off_point": {
      "video_id": "uuid",
      "title": "Advanced Algebra",
      "course": "Mathematics Basics",
      "lesson_order": 8,
      "total_views": 45,
      "completion_rate": 35.0,
      "drop_off_rate": 65.0
    }
  },
  "payment_health": {
    "failed_payment_rate": 3.5,
    "average_confirmation_time_seconds": 25,
    "stuck_pending_payments": 2,
    "stuck_payment_details": [
      {
        "payment_id": "uuid",
        "tx_ref": "MSCE-1234567890",
        "stuck_hours": 2.5,
        "course": "Mathematics Basics"
      }
    ]
  }
}
```

### Performance Considerations

- **Parallel Queries**: Multiple analytics queries run simultaneously
- **Data Caching**: Results cached for 5 minutes to reduce database load
- **Optimized Queries**: Efficient SQL with proper indexing
- **Error Handling**: Graceful fallback for missing data

## Business Intelligence

### Revenue Analysis

#### Revenue Trends
- **Week-over-Week Growth**: Revenue growth percentage calculation
- **Seasonal Patterns**: Monthly and quarterly revenue trends
- **Course Performance**: Revenue contribution by course
- **Payment Method Analysis**: Network preference and reliability

#### Revenue Optimization
- **Pricing Strategy**: Course pricing based on performance
- **Promotion Planning**: Targeted promotions for underperforming courses
- **Network Partnerships**: Negotiation data for payment providers
- **Revenue Forecasting**: Predictive models for future revenue

### Student Analytics

#### Acquisition Metrics
- **Registration Sources**: How users discover the platform
- **Conversion Funnel**: Registration to payment conversion analysis
- **Geographic Analysis**: Student location and network preferences
- **Device Analytics**: Mobile vs desktop usage patterns

#### Engagement Metrics
- **Active Users**: Daily, weekly, monthly active users
- **Session Duration**: Average time spent on platform
- **Course Progression**: How students progress through content
- **Repeat Engagement**: Return visit patterns and frequency

#### Retention Analysis
- **Churn Prediction**: Identify at-risk students
- **Renewal Patterns**: When and why students renew
- **Drop-off Analysis**: Where and why students disengage
- **Success Factors**: What makes students successful

### Content Analytics

#### Content Performance
- **Popular Content**: Most watched lessons and courses
- **Engagement Quality**: Completion rates and time spent
- **Content Gaps**: Subjects or topics with low engagement
- **Quality Metrics**: Video performance and technical issues

#### Content Optimization
- **Lesson Length**: Optimal video duration analysis
- **Content Structure**: Most effective lesson organization
- **Teaching Methods**: What teaching approaches work best
- **Improvement Areas**: Content that needs enhancement

## Operational Monitoring

### Daily Operations

#### Payment Health Monitoring
- **Pending Payments**: Stuck payment identification and resolution
- **Failed Payments**: Payment failure rate monitoring
- **Confirmation Time**: Webhook processing performance
- **Revenue Tracking**: Daily revenue reconciliation

#### System Health
- **API Performance**: Response time and error rate monitoring
- **Database Performance**: Query optimization and indexing
- **Storage Usage**: Video storage and capacity planning
- **User Activity**: Platform usage patterns and peaks

### Weekly Operations

#### Business Review
- **Revenue Analysis**: Weekly revenue performance review
- **Student Metrics**: Registration and engagement trends
- **Content Performance**: Course and lesson performance
- **Issue Resolution**: Problem identification and resolution

#### Strategic Planning
- **Growth Initiatives**: Data-driven growth strategies
- **Content Planning**: Content development priorities
- **Marketing Optimization**: Campaign effectiveness analysis
- **Resource Allocation**: Budget and resource planning

### Monthly Operations

#### Strategic Review
- **Monthly Performance**: Comprehensive monthly analysis
- **Trend Analysis**: Long-term trend identification
- **Goal Tracking**: Progress against business objectives
- **Competitive Analysis**: Market position and opportunities

#### System Maintenance
- **Performance Optimization**: System performance improvements
- **Capacity Planning**: Resource scaling and optimization
- **Security Review**: Security audit and improvements
- **Backup and Recovery**: Data protection verification

## Monitoring Playbook Integration

### Daily Checks (5 minutes)

The analytics dashboard supports daily monitoring with:

1. **Revenue Overview**: Quick revenue health check
2. **Student Activity**: Registration and engagement metrics
3. **Payment Health**: Payment processing status
4. **System Status**: Platform health indicators

### Weekly Reviews (15 minutes)

Comprehensive weekly analysis includes:

1. **Revenue Report**: Detailed revenue analysis and trends
2. **Student Engagement**: Conversion and churn analysis
3. **Content Performance**: Course and lesson effectiveness
4. **Operational Health**: System and payment health

### Monthly Reviews (30 minutes)

Strategic monthly analysis provides:

1. **Business Intelligence**: Comprehensive business metrics
2. **Trend Analysis**: Long-term pattern identification
3. **Strategic Planning**: Data-driven decision making
4. **Performance Optimization**: System and content improvements

## Troubleshooting

### Common Analytics Issues

#### Data Discrepancies
- **Missing Data**: Check data collection processes
- **Incorrect Metrics**: Verify calculation methods
- **Timing Issues**: Check data synchronization
- **Data Quality**: Validate data integrity

#### Performance Issues
- **Slow Loading**: Optimize database queries
- **Memory Issues**: Implement data pagination
- **Cache Problems**: Verify caching strategies
- **Network Issues**: Check API connectivity

### Data Validation

#### Revenue Validation
```sql
-- Verify revenue calculations
SELECT 
  DATE(created_at) as date,
  SUM(amount_mwk) as daily_revenue,
  COUNT(*) as payment_count
FROM payments 
WHERE status = 'paid' 
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

#### Student Metrics Validation
```sql
-- Verify conversion rates
SELECT 
  COUNT(DISTINCT p.id) as total_users,
  COUNT(DISTINCT CASE WHEN pay.id IS NOT NULL THEN p.id END) as paid_users,
  (COUNT(DISTINCT CASE WHEN pay.id IS NOT NULL THEN p.id END)::float / 
   COUNT(DISTINCT p.id)::float * 100) as conversion_rate
FROM profiles p
LEFT JOIN payments pay ON p.id = pay.user_id AND pay.status = 'paid';
```

#### Content Performance Validation
```sql
-- Verify completion rates
SELECT 
  c.title as course_title,
  COUNT(v.id) as total_videos,
  COUNT(DISTINCT CASE WHEN pr.completed THEN pr.user_id END) as completed_students,
  COUNT(DISTINCT pr.user_id) as total_students,
  (COUNT(DISTINCT CASE WHEN pr.completed THEN pr.user_id END)::float / 
   COUNT(DISTINCT pr.user_id)::float * 100) as completion_rate
FROM courses c
LEFT JOIN videos v ON c.id = v.course_id
LEFT JOIN progress pr ON v.id = pr.video_id
WHERE v.published = true
GROUP BY c.id, c.title
ORDER BY completion_rate DESC;
```

## Custom Analytics

### Adding New Metrics

1. **Data Collection**: Add data collection to relevant Edge Functions
2. **Database Queries**: Create optimized SQL queries
3. **API Endpoint**: Add metrics to analytics API
4. **Dashboard Integration**: Display metrics in dashboard

### Custom Reports

1. **Define Requirements**: Specify report requirements
2. **Data Modeling**: Design data structure
3. **Implementation**: Develop report logic
4. **Testing**: Validate report accuracy

### Third-Party Integration

1. **Analytics Tools**: Google Analytics, Mixpanel, Amplitude
2. **Business Intelligence**: Tableau, Power BI, Looker
3. **Monitoring Tools**: Datadog, New Relic, Grafana
4. **Alerting Systems**: PagerDuty, Slack, Email notifications

## Data Privacy and Security

### Data Protection
- **Anonymization**: User data anonymized in analytics
- **Retention**: Data retention policies implemented
- **Access Control**: Role-based access to analytics
- **Compliance**: GDPR and privacy regulation compliance

### Security Measures
- **Authentication**: Admin authentication required
- **Authorization**: Role-based access control
- **Audit Trail**: Analytics access logged
- **Data Encryption**: Sensitive data encrypted

## Future Enhancements

### Planned Features

1. **Predictive Analytics**: Churn prediction and revenue forecasting
2. **Real-time Alerts**: Automated alerting for anomalies
3. **Custom Dashboards**: User-configurable dashboard views
4. **Mobile Analytics**: Mobile app analytics integration

### Advanced Analytics

1. **Machine Learning**: Pattern recognition and prediction
2. **A/B Testing**: Feature effectiveness testing
3. **Cohort Analysis**: User behavior cohort analysis
4. **Funnel Analysis**: Conversion funnel optimization

## Best Practices

### Data Quality
1. **Validation**: Regular data validation and cleaning
2. **Documentation**: Clear data definitions and calculations
3. **Testing**: Automated testing of analytics calculations
4. **Monitoring**: Data quality monitoring and alerts

### Performance Optimization
1. **Caching**: Implement intelligent caching strategies
2. **Query Optimization**: Optimize database queries
3. **Indexing**: Proper database indexing
4. **Resource Management**: Efficient resource utilization

### User Experience
1. **Loading Performance**: Fast dashboard loading
2. **Visual Design**: Clear and intuitive visualizations
3. **Interactivity**: Interactive charts and filters
4. **Accessibility**: Accessible design for all users

The MSCE Learn analytics system provides comprehensive insights for data-driven decision making, helping optimize business performance, enhance user experience, and drive sustainable growth.
