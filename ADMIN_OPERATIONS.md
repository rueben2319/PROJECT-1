# MSCE Learn - Admin Operation Panels

This document describes the three admin operation panels for MSCE Learn: Payment Monitor, Student Management, and Content Management. These panels provide comprehensive tools for managing payments, students, and educational content.

## Overview

The admin operation panels extend the Command Centre with specialized interfaces for day-to-day administrative tasks. Each panel features real-time data, interactive controls, and comprehensive audit logging for security and compliance.

## Payment Monitor (`/admin/payments`)

### Features

#### Alert System
- **Old Payment Detection**: Alerts for payments pending > 30 minutes
- **Visual Indicators**: Amber warning banner with count
- **Action Required**: Highlights payments needing attention

#### Statistics Cards
- **Today's Revenue**: MWK + USD equivalent with growth indicators
- **Month Revenue**: Current month performance tracking
- **Pending Count**: Real-time pending payment monitoring
- **Failed Rate**: Payment failure percentage analysis

#### Transaction Management
- **Comprehensive Table**: All payment transactions with full details
- **Status Badges**: Color-coded payment status (PAID/PENDING/FAILED)
- **Manual Actions**: Grant/Fail buttons for pending payments
- **Confirmation Dialogs**: Safety confirmations for critical actions

#### Analytics
- **Revenue by Network**: Airtel Money vs TNM Mpamba breakdown
- **Top Selling Courses**: Revenue performance by course
- **Progress Visualization**: Horizontal progress bars for metrics

### Payment Actions

#### Grant Payment
```javascript
// API Call
POST /api/admin/payment-action
{
  "tx_ref": "MSCE-1703123456789-abc12345",
  "action": "grant"
}
```

**Effects:**
- Updates payment status to 'paid'
- Creates 30-day enrollment for student
- Logs admin manual grant action
- Sends access confirmation to student

#### Fail Payment
```javascript
// API Call
POST /api/admin/payment-action
{
  "tx_ref": "MSCE-1703123456789-abc12345",
  "action": "fail"
}
```

**Effects:**
- Updates payment status to 'failed'
- No enrollment created
- Logs admin manual fail action
- Maintains audit trail

### Security Features
- **Role Enforcement**: Admin-only access
- **Action Confirmation**: Dialog confirmations for critical actions
- **Audit Logging**: All manual actions logged with admin ID
- **Status Validation**: Only pending payments can be modified

## Student Management (`/admin/users`)

### Features

#### Student Statistics
- **Total Students**: Overall registered user count
- **Active Today**: Students active in last 24 hours
- **Expiring Soon**: Students with access expiring in 3 days
- **Never Paid**: Free trial users for conversion targeting

#### Search & Filtering
- **Real-time Search**: Name, phone, email filtering
- **Instant Results**: Live filtering without page refresh
- **Multiple Fields**: Search across student data fields

#### Student Profiles
- **Detailed Information**: Complete student data display
- **Enrollment History**: All course enrollments with expiry dates
- **Activity Tracking**: Last active and engagement metrics
- **Status Management**: Visual status indicators

#### Manual Grant Access
- **Course Selection**: Dropdown of available courses
- **Student Selection**: Choose from registered students
- **Duration Options**: 7/30/90/365 day access periods
- **Instant Activation**: Immediate course access

#### Renewal Campaigns
- **Expiring Students**: Filter by days until expiry
- **SMS Reminders**: Bulk SMS sending for renewals
- **Campaign Analytics**: Track renewal campaign effectiveness

### Grant Access Flow

#### Manual Grant Form
```javascript
// API Call
POST /api/admin/grant-access
{
  "student_id": "uuid",
  "course_id": "uuid", 
  "days": 30
}
```

**Process:**
1. Select student from dropdown
2. Choose course to grant access
3. Set access duration
4. Confirm and submit
5. Instant enrollment creation

#### Renewal SMS Campaign
```javascript
// API Call
POST /api/admin/send-renewal-sms
{
  "days": 7
}
```

**Features:**
- Target students expiring in N days
- Personalized SMS messages
- Bulk sending capability
- Campaign tracking

### Data Privacy
- **Secure Access**: Admin-only student data access
- **Minimal Exposure**: Only necessary data displayed
- **Audit Trail**: All access and modifications logged
- **Compliance**: Data protection best practices

## Content Management (`/admin/content`)

### Features

#### Course Creation
- **Comprehensive Form**: Title, subject, grade, price, description
- **Subject Dropdown**: 10 MSCE/JCE subjects available
- **Grade Selection**: MSCE or JCE level designation
- **Draft Status**: All courses start as draft for review

#### Video Upload
- **Course Selection**: Choose target course for video
- **Lesson Details**: Title, order number, preview status
- **Path Input**: R2 playlist path from video processing
- **Processing Notes**: FFmpeg/HLS processing instructions

#### Course Management
- **Published Courses**: Complete course listing
- **Status Control**: Publish/unpublish toggle
- **Enrollment Tracking**: Student count per course
- **Edit Capabilities**: Course modification options

### Course Creation Process

#### Step 1: Create Course
```javascript
// API Call
POST /api/admin/create-course
{
  "title": "Mathematics - Algebra Basics",
  "subject": "Mathematics", 
  "grade": "MSCE",
  "price_mwk": 5000,
  "description": "Complete algebra fundamentals..."
}
```

**Validation:**
- Unique title checking
- Required field validation
- Price validation (> 0)
- Grade and subject validation

#### Step 2: Add Video Lessons
```javascript
// API Call
POST /api/admin/upload-video
{
  "course_id": "uuid",
  "title": "Lesson 1: Variables and Expressions",
  "lesson_order": 1,
  "is_preview": false,
  "r2_playlist_path": "courses/mathematics/algebra-basics/playlist.m3u8"
}
```

**Requirements:**
- Video processed with FFmpeg + HLS
- R2 playlist path from processing script
- Lesson order for sequence
- Preview flag for free lessons

#### Step 3: Publish Course
```javascript
// API Call
POST /api/admin/publish-course
{
  "course_id": "uuid",
  "publish": true
}
```

**Effects:**
- Course becomes visible to students
- Enrollment enabled
- Public listing activation

### Video Processing Integration

#### FFmpeg Processing
```bash
# Process video before upload
./scripts/process-video.sh input.mp4 mathematics algebra-basics
```

#### R2 Upload
- **HLS Format**: Adaptive streaming ready
- **Chunked Segments**: 10-second video chunks
- **Playlist Path**: Copy from script output
- **Immediate Availability**: Instant streaming after upload

#### Processing Notes
- **720p Resolution**: Optimized for streaming
- **H.264 Codec**: Wide compatibility
- **AAC Audio**: Standard audio format
- **Fast Start**: Metadata optimization

## Backend APIs

### Payment Action API
**Endpoint**: `POST /api/admin/payment-action`

**Security:**
- Admin authentication required
- Pending status validation
- Transaction verification
- Comprehensive audit logging

**Response:**
```json
{
  "success": true,
  "action": "granted",
  "message": "Payment granted and enrollment created",
  "enrollment_expires_at": "2024-02-20T10:00:00Z"
}
```

### Course Creation API
**Endpoint**: `POST /api/admin/create-course`

**Validation:**
- Title uniqueness check
- Required field validation
- Grade and subject enums
- Price validation

**Response:**
```json
{
  "success": true,
  "course": {
    "id": "uuid",
    "title": "Mathematics - Algebra Basics",
    "subject": "Mathematics",
    "grade": "MSCE",
    "price_mwk": 5000,
    "is_published": false
  },
  "message": "Course created successfully (draft status)"
}
```

### Course Publishing API
**Endpoint**: `POST /api/admin/publish-course`

**Features:**
- Publish/unpublish toggle
- Status change tracking
- Audit event logging
- Immediate effect

## Security & Compliance

### Access Control
- **Admin Role Required**: All endpoints require admin role
- **JWT Authentication**: Secure token validation
- **Input Validation**: Zod schema validation
- **Error Handling**: No sensitive data exposure

### Audit Logging
- **Action Tracking**: All admin actions logged
- **User Attribution**: Admin ID in all logs
- **Detail Recording**: Complete context preservation
- **Security Events**: Suspicious activity monitoring

### Data Protection
- **Principle of Least Privilege**: Minimal necessary access
- **Secure Storage**: Encrypted sensitive data
- **Audit Trails**: Complete modification history
- **Compliance Ready**: Data protection standards

## User Experience

### Interface Design
- **Dark Theme**: Consistent with admin dashboard
- **Responsive Layout**: Mobile-friendly design
- **Loading States**: Professional skeleton loading
- **Error Handling**: Clear error messages

### Interactive Elements
- **Real-time Updates**: Live data without refresh
- **Confirmation Dialogs**: Safety for critical actions
- **Progress Indicators**: Visual feedback for operations
- **Success Messages**: Clear completion confirmation

### Performance
- **Parallel Loading**: Multiple API calls simultaneously
- **Efficient Queries**: Optimized database operations
- **Caching Strategy**: Appropriate data caching
- **Smooth Transitions**: CSS animations for UX

## Integration Points

### Payment System
- **PayChangu Integration**: Mobile money processing
- **Status Synchronization**: Real-time payment updates
- **Revenue Analytics**: Comprehensive financial tracking
- **Network Analytics**: Mobile money provider breakdown

### Student System
- **Profile Integration**: Complete student data access
- **Enrollment Management**: Course access control
- **Communication**: SMS campaign integration
- **Activity Tracking**: User engagement metrics

### Content System
- **Video Pipeline**: FFmpeg processing integration
- **R2 Storage**: Cloudflare R2 video storage
- **Course Catalog**: Public course listing
- **Enrollment Flow**: Student course access

## Monitoring & Analytics

### Payment Metrics
- **Revenue Tracking**: Daily/monthly revenue
- **Success Rates**: Payment completion percentages
- **Network Performance**: Mobile money provider analytics
- **Processing Times**: Payment processing efficiency

### Student Analytics
- **Enrollment Trends**: Course popularity tracking
- **Retention Rates**: Student engagement metrics
- **Revenue Per Student**: Average revenue analysis
- **Conversion Rates**: Free to paid conversion

### Content Performance
- **Course Popularity**: Enrollment by course
- **Video Engagement**: Lesson completion rates
- **Revenue Generation**: Course financial performance
- **Content Gap Analysis**: Subject coverage metrics

The admin operation panels provide comprehensive tools for managing all aspects of the MSCE Learn platform, from payment processing to student management and content creation, with robust security, audit logging, and excellent user experience.
