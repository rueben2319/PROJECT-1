# MSCE Learn - Admin System Panels

This document describes the three system panels for the MSCE Learn admin dashboard: System Configuration, Security Centre, and Audit Log. These panels provide comprehensive control over system settings, security monitoring, and audit trail management.

## Overview

The system panels extend the admin dashboard with essential system administration capabilities, including configuration management, security monitoring, and comprehensive audit logging. These panels provide granular control over platform settings while maintaining security and compliance standards.

## System Configuration (`/admin/config`)

### Features

#### PayChangu Settings
- **API Key Management**: Masked API key with show/hide toggle
- **Webhook Secret**: Secure webhook secret management
- **Webhook URL**: Read-only URL with copy functionality
- **Sandbox Mode**: Toggle with amber warning for test environment
- **Redeploy Notice**: Alert for Edge Function redeployment requirement

#### Access & Pricing Rules
- **Default Access Duration**: Configurable enrollment period (default: 30 days)
- **Pending Payment Expiry**: Auto-cancel timeframe (default: 2 hours)
- **Signed URL Expiry**: Video URL expiration (default: 600 seconds)
- **Lesson Completion Threshold**: Completion percentage (default: 90%)
- **Renewal Reminder**: Days before expiry for SMS reminders (default: 3 days)

#### Feature Flags
- **Real-time Toggles**: Immediate effect on system behavior
- **Maintenance Mode**: Red confirmation dialog for safety
- **Service Controls**: Individual service enable/disable
- **Feature Management**: Granular feature availability control

### Configuration Management

#### PayChangu Integration
```javascript
// API Configuration
{
  apiKey: "sk_live_...",           // Masked display
  webhookSecret: "whsec_...",     // Masked display
  webhookUrl: "https://...",      // Read-only
  sandboxMode: false               // Toggle with warning
}
```

#### Feature Flags
```javascript
// Available Feature Flags
{
  registrations_open: true,        // User registration
  free_previews: true,            // Preview lessons
  sms_renewal_reminders: true,    // SMS campaigns
  maintenance_mode: false,        // System maintenance
  airtel_money: true,              // Airtel Money payments
  tnm_mpamba: true                 // TNM Mpamba payments
}
```

### Security Considerations
- **API Key Protection**: Masked display with toggle visibility
- **Configuration Validation**: Input validation for all settings
- **Audit Logging**: All configuration changes logged
- **Maintenance Safety**: Confirmation dialog for critical changes

## Security Centre (`/admin/security`)

### Features

#### Threat Monitoring
- **Alert Banner**: Active threat detection with severity indicators
- **Security Statistics**: Real-time security metrics
- **Event Tracking**: Recent security events with color coding
- **Threshold Detection**: Automatic alerts for suspicious activity

#### Security Controls Display
- **Rate Limiting**: Brute force attack prevention
- **Webhook Signature Check**: PayChangu verification
- **PayChangu Re-verification**: Double payment verification
- **Audit Logging**: Complete security event logging
- **Signed URL Expiry**: Time-limited access control

#### Manual Security Actions
- **Terminate Sessions**: Force logout all users
- **Expire Stale Payments**: Cancel old pending payments
- **Export Audit Log**: CSV download for analysis
- **Email Security Report**: Automated security reporting

### Security Metrics

#### Real-time Statistics
- **Failed Logins (24h)**: Authentication failure tracking
- **Webhook Sig Failures**: Payment verification issues
- **Payment Mismatches**: Amount verification problems
- **Active Sessions**: Current user session count

#### Threat Detection
```javascript
// Threat Thresholds
{
  failedLogins24h: 10,     // Alert threshold
  webhookSigFailures: 5,   // Warning threshold
  paymentMismatches: 3,     // Alert threshold
  activeSessions: 'count'  // Monitoring metric
}
```

#### Security Events
- **Color-coded Events**: Visual threat level indicators
- **Event Classification**: Failed login, webhook issues, payment problems
- **User Attribution**: Track security events by user
- **Timestamp Tracking**: Precise event timing

### Security Actions

#### Session Management
```javascript
// Terminate All Sessions
POST /api/admin/terminate-sessions
{
  "confirm": true
}
```

**Effects:**
- Invalidates all user tokens
- Forces logout including admin
- Requires re-authentication
- Immediate security effect

#### Payment Cleanup
```javascript
// Expire Stale Payments
POST /api/admin/expire-stale-payments
{
  "hours": 2
}
```

**Effects:**
- Cancels old pending payments
- Frees up stuck transactions
- Maintains payment system health
- Automatic cleanup process

## Audit Log (`/admin/audit`)

### Features

#### Audit Trail Management
- **Append-Only Log**: Immutable audit records
- **Comprehensive Events**: All system actions tracked
- **Filtering System**: Event type and date range filtering
- **Pagination System**: Efficient large dataset handling

#### Event Types
- **User Actions**: Login, logout, registration
- **Payment Events**: Initiated, success, failed
- **Course Events**: Access granted, completion
- **Admin Actions**: All administrative operations
- **Security Events**: Failed logins, signature failures

#### Export Capabilities
- **CSV Export**: Filtered data download
- **Date Range**: Custom time period selection
- **Event Filtering**: Specific event type export
- **Large Dataset**: 10,000 record limit

### Audit Event Structure

#### Event Data Model
```javascript
// Audit Event
{
  id: "uuid",
  created_at: "2024-01-20T10:00:00Z",
  action: "payment.success",
  user_id: "uuid",
  details: {
    tx_ref: "MSCE-...",
    amount_mwk: 5000,
    course_id: "uuid"
  }
}
```

#### Event Categories
- **Authentication**: Login, logout, registration events
- **Payments**: All payment-related activities
- **Courses**: Course access and completion
- **Admin**: Administrative actions and changes
- **Security**: Failed attempts and security issues

### Filtering and Search

#### Event Type Filter
```javascript
// Available Event Types
[
  'user.login', 'user.logout', 'user.register',
  'payment.initiated', 'payment.success', 'payment.failed',
  'course.access_granted', 'course.completed',
  'admin.login', 'admin.stats_viewed', 'admin.manual_grant',
  'login_failed', 'webhook_signature_failed', 'payment_mismatch',
  'feature_flag_changed', 'course_created', 'course_published'
]
```

#### Date Range Filtering
- **Start Date**: Filter events from specific date
- **End Date**: Limit events to specific date range
- **Real-time Updates**: Immediate filter application
- **Pagination Reset**: Filters reset pagination

### Export Functionality

#### CSV Export Format
```csv
created_at,event_type,user_id,details
2024-01-20T10:00:00Z,payment.success,user-123,"{""tx_ref"":""MSCE-..."",""amount_mwk"":5000}"
2024-01-20T10:01:00Z,course.access_granted,user-123,"{""course_id"":""course-..."",""expires_at"":""...""}"
```

#### Export Features
- **Large Dataset Support**: Up to 10,000 records
- **Filtered Export**: Only filtered events exported
- **Timestamp Format**: ISO 8601 standard
- **Detail Serialization**: JSON details in CSV format

## Backend APIs

### Feature Flag API
**Endpoint**: `PATCH /api/admin/feature-flag`

**Security:**
- Admin authentication required
- Input validation with Zod schema
- Audit logging for all changes
- Immediate system effect

```typescript
// Request Body
{
  "key": "maintenance_mode",
  "enabled": false
}
```

### Export Audit API
**Endpoint**: `GET /api/admin/export-audit`

**Features:**
- CSV format response
- Query parameter filtering
- 10,000 record limit
- Proper HTTP headers for download

```typescript
// Query Parameters
?event_type=payment.success&start_date=2024-01-01&end_date=2024-01-31
```

### Security Stats API
**Endpoint**: `GET /api/admin/security-stats`

**Metrics:**
- Failed login attempts (24 hours)
- Webhook signature failures
- Payment verification mismatches
- Active user sessions

```typescript
// Response
{
  "failed_logins_24h": 15,
  "webhook_sig_failures": 2,
  "payment_mismatches": 1,
  "active_sessions": 247
}
```

## Security & Compliance

### Access Control
- **Admin Role Required**: All endpoints require admin authentication
- **JWT Verification**: Secure token validation
- **Input Validation**: Comprehensive input sanitization
- **Audit Trail**: Complete action logging

### Data Protection
- **Sensitive Data**: Masked display for credentials
- **Immutable Logs**: Append-only audit trail
- **Secure Export**: Controlled data export
- **Configuration Security**: Validated setting changes

### Compliance Features
- **Audit Requirements**: Complete audit trail
- **Data Retention**: Configurable log retention
- **Access Logging**: All administrative actions
- **Change Tracking**: Configuration change history

## User Experience

### Interface Design
- **Dark Theme**: Consistent with admin dashboard
- **Organized Layout**: Logical section grouping
- **Clear Indicators**: Visual status and threat indicators
- **Responsive Design**: Mobile-friendly interface

### Interactive Elements
- **Real-time Updates**: Live configuration changes
- **Confirmation Dialogs**: Safety for critical actions
- **Progress Indicators**: Loading and operation feedback
- **Success Messages**: Clear completion notifications

### Error Handling
- **Validation Messages**: Clear input validation feedback
- **Operation Feedback**: Success/error state indicators
- **Recovery Options**: Retry and recovery mechanisms
- **User Guidance**: Helpful error messages

## Monitoring & Analytics

### Configuration Tracking
- **Change History**: All configuration modifications
- **Feature Performance**: Feature flag usage statistics
- **System Health**: Configuration impact monitoring
- **Change Impact**: System behavior analysis

### Security Analytics
- **Trend Analysis**: Security event patterns
- **Threat Intelligence**: Attack pattern recognition
- **User Behavior**: Suspicious activity detection
- **System Health**: Overall security posture

### Audit Analytics
- **Event Volume**: Audit log growth tracking
- **User Activity**: User engagement metrics
- **System Usage**: Platform utilization statistics
- **Compliance Reporting**: Regulatory requirement tracking

## Integration Points

### Payment System
- **PayChangu Settings**: Payment gateway configuration
- **Security Monitoring**: Payment threat detection
- **Audit Integration**: Payment event logging
- **Configuration Sync**: Payment system settings

### User System
- **Access Control**: User access configuration
- **Session Management**: Security session controls
- **Authentication**: Login security settings
- **User Analytics**: User behavior tracking

### Content System
- **Feature Control**: Content availability settings
- **Access Rules**: Content access configuration
- **Audit Integration**: Content change tracking
- **Performance Monitoring**: System impact analysis

## Best Practices

### Configuration Management
- **Change Documentation**: Record all configuration changes
- **Testing Protocol**: Test configuration changes in staging
- **Backup Strategy**: Configuration backup procedures
- **Rollback Planning**: Configuration rollback procedures

### Security Management
- **Regular Monitoring**: Continuous security monitoring
- **Incident Response**: Security incident procedures
- **Threat Assessment**: Regular security assessment
- **Compliance Review**: Security compliance verification

### Audit Management
- **Regular Review**: Periodic audit log review
- **Retention Policy**: Log retention policy management
- **Export Procedures**: Secure audit export procedures
- **Analysis Tools**: Audit analysis and reporting

The system panels provide comprehensive control over MSCE Learn platform configuration, security, and audit management with robust protection, complete audit trails, and excellent administrative user experience.
