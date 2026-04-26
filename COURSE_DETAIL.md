# MSCE Learn - Course Detail Page

This document describes the course detail page system for MSCE Learn, providing students with comprehensive course information and lesson management.

## Overview

The course detail page is the main interface for students to view course content, track progress, and access lessons. It features enrollment status management, lesson completion tracking, and seamless payment integration.

## Components

### LessonRow (`src/components/courses/LessonRow.jsx`)

**Props:**
```javascript
{
  video: {
    id, title, lesson_number, duration_seconds, is_preview
  },
  isEnrolled: Boolean,      // User has active enrollment
  isPreview: Boolean,        // Lesson is free preview
  completed: Boolean,        // User completed this lesson
  onPlay: Function,         // Handle lesson play
  onUnlock: Function        // Handle payment initiation
}
```

**States:**
- **Completed**: Green checkmark with completion status
- **Preview**: Teal "Preview" badge, always playable
- **Locked**: Grey lock icon, prompts payment
- **Enrolled**: Play button on hover, clickable

**Features:**
- Visual status indicators (tick/lock/play icons)
- Duration display (formatted as MM:SS)
- Lesson numbering and title
- Hover effects for interactive lessons
- Responsive touch targets

### CourseDetail (`src/components/courses/CourseDetail.jsx`)

**Props:**
```javascript
{
  course: {
    title, subject, grade, description, price_mwk,
    lesson_count, total_duration_seconds, is_enrolled,
    expires_at, days_remaining
  },
  videos: Array,             // Lesson list with completion data
  isEnrolled: Boolean,
  expiresAt: String,
  daysRemaining: Number,
  onUnlock: Function,        // Handle course enrollment
  onPlayLesson: Function     // Handle lesson playback
}
```

**Sections:**
- **Course Header**: Title, subject, grade, description
- **Statistics Grid**: Lessons, duration, completed, progress %
- **Enrollment Banner**: Status with CTA or renewal options
- **Lesson List**: All lessons with completion status

**Enrollment States:**
- **Not Enrolled**: Price display + "Enroll Now" CTA
- **Enrolled Active**: "✓ Enrolled — X days remaining" 
- **Expired**: "Access Expired — Renew Access" button

## Pages

### Course Page (`src/pages/Course.jsx`)

**Route:** `/course/:id`

**Features:**
- Dynamic course ID from URL parameters
- Course data fetching with error handling
- Loading skeleton states
- Navigation back to course catalogue
- Payment flow integration
- Video player navigation

**Data Flow:**
1. Extract course ID from URL
2. Fetch course data via `/courses/:id` API
3. Process enrollment status and lesson data
4. Handle user interactions (play/unlock)
5. Navigate to payment or video player

## Backend API

### Get Course (`supabase/functions/get-course/index.ts`)

**Endpoint:** `GET /courses/:id`

**Authentication:** Required (requireAuth)

**Response:**
```json
{
  "success": true,
  "data": {
    "course": {
      "id": "uuid",
      "title": "Mathematics - Chapter 1",
      "subject": "Mathematics",
      "grade": "MSCE",
      "description": "Complete course description...",
      "price_mwk": 5000,
      "lesson_count": 15,
      "total_duration_seconds": 3600,
      "is_enrolled": true,
      "expires_at": "2024-12-31T23:59:59Z",
      "days_remaining": 45,
      "completed_count": 8
    },
    "videos": [
      {
        "id": "uuid",
        "title": "Introduction to Algebra",
        "lesson_number": 1,
        "duration_seconds": 180,
        "is_preview": false,
        "completed": true,
        "watch_time_seconds": 180,
        "completed_at": "2024-11-15T10:30:00Z"
      }
    ]
  }
}
```

**SQL Queries:**

1. **Course Details:**
```sql
SELECT * FROM courses 
WHERE id = $course_id AND published = true
```

2. **Enrollment Status:**
```sql
SELECT id, expires_at, status, created_at 
FROM enrollments 
WHERE user_id = $user_id AND course_id = $course_id AND status = 'active'
```

3. **Videos with Progress:**
```sql
SELECT videos.*, progress.* 
FROM videos 
LEFT JOIN progress ON videos.id = progress.video_id AND progress.user_id = $user_id
WHERE videos.course_id = $course_id AND videos.published = true
ORDER BY videos.lesson_order
```

## User Experience Flows

### New Student (Not Enrolled)
1. Lands on course detail page
2. Sees course information and lesson preview
3. Can watch preview lessons (teal badge)
4. Locked lessons show lock icon
5. Clicking locked lesson → PaymentModal
6. After payment → Full course access

### Enrolled Student
1. Sees enrollment status and days remaining
2. All lessons are clickable
3. Completed lessons show green ticks
4. Click any lesson → Navigate to video player
5. Progress tracked automatically
6. Can renew when access expires

### Preview Access
- First lesson often marked as preview
- Preview lessons always accessible
- Teal "Preview" badge for identification
- Helps students evaluate course quality

## Visual Design

### Status Indicators
- **Completed**: Green checkmark in circle
- **Preview**: Teal badge with "Preview" text
- **Locked**: Grey lock icon
- **Playable**: Blue play button (hover state)

### Color Coding
- Subject-specific badges (consistent with catalogue)
- Enrollment status colors (green/red/blue)
- Progress indicators and completion states

### Mobile Optimization
- Touch-friendly lesson rows
- Horizontal scrolling prevention
- Optimized spacing and sizing
- Clear visual hierarchy

## Navigation Flow

### Course Discovery
```
Home (Course Catalogue) → Course Card → Course Detail
```

### Lesson Access
```
Course Detail → Lesson Row → Video Player (/watch/:videoId)
```

### Payment Flow
```
Course Detail → Unlock Button → Payment Page → Course Access
```

### Progress Tracking
```
Video Player → Lesson Completion → Course Detail Progress Update
```

## Performance Optimizations

### Data Loading
- Skeleton loading states
- Efficient SQL queries with JOINs
- Progress data cached in response
- Minimal API calls

### User Experience
- Instant visual feedback
- Smooth transitions and animations
- Error handling with retry options
- Offline considerations for enrolled content

## Security Features

### Access Control
- Authentication required for course access
- Enrollment verification for lesson access
- Preview lessons exempt from enrollment check
- Audit logging for course access events

### Data Protection
- User-specific progress data
- Secure payment integration
- No sensitive data exposure
- Proper error handling without information leakage

## Integration Points

### Payment System
- Course unlock redirects to payment flow
- Enrollment status updates on payment success
- Automatic course access activation
- Renewal flow for expired access

### Video Player
- Lesson navigation to video player
- Progress tracking from player
- Completion status updates
- Watch time tracking

### Course Catalogue
- Navigation back to catalogue
- Filter state preservation
- Course card status updates
- Search and discovery integration

## Future Enhancements

**Planned Features:**
- Course bookmarks and favorites
- Lesson notes and annotations
- Download for offline viewing
- Course discussion forums
- Achievement system and badges
- Course recommendations
- Advanced progress analytics

The course detail page provides a comprehensive, user-friendly interface for students to engage with course content, track their progress, and manage their learning journey with proper enrollment controls and seamless payment integration.
