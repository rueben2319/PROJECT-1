# MSCE Learn - Course Catalogue System

This document describes the course catalogue system for MSCE Learn, providing students with a browsable, filterable grid of courses with enrollment status.

## Overview

The course catalogue is the main landing experience for students, featuring:
- Mobile-first responsive design
- Card-based course display
- Subject and grade filtering
- Real-time enrollment status
- Payment integration for course access

## Components

### CourseCard (`src/components/courses/CourseCard.jsx`)

**Props:**
```javascript
{
  course: {
    id, title, subject, grade, lesson_count, 
    price_mwk, preview_available, is_enrolled, 
    expires_at, days_remaining
  },
  enrollment: Object, // Enrollment data if enrolled
  onUnlock: Function // Handle payment initiation
}
```

**States:**
- **Locked**: Shows price + Unlock button with overlay
- **Enrolled**: Shows "✓ Enrolled — X days left" badge
- **Expired**: Shows "Access expired — Renew" button
- **Preview Available**: Tag for courses with free preview lessons

**Features:**
- Subject-specific color coding (Math=blue, Biology=green, etc.)
- Grade badges (MSCE/JCE)
- Lesson count display
- Hover effects for enrolled courses
- Click to navigate to course content

### CourseGrid (`src/components/courses/CourseGrid.jsx`)

**Props:**
```javascript
{
  courses: Array, // Filtered course list
  enrollments: Array, // User's enrollments
  onUnlock: Function // Payment handler
}
```

**Layout:**
- Mobile: 1 column
- Tablet: 2 columns  
- Desktop: 3 columns
- Responsive gap spacing
- Loading skeleton support
- Empty state handling

### SubjectFilter (`src/components/courses/SubjectFilter.jsx`)

**Features:**
- Horizontal scrollable subject pills
- Grade toggle (MSCE | JCE | Both)
- Active filter display with clear options
- Real-time filter updates

**Subjects:**
- All, Mathematics, English, Biology, Physics, Chemistry
- History, Geography, Agriculture, Social Studies, Bible Knowledge

## Pages

### Home (`src/pages/Home.jsx`)

**Features:**
- Fetches courses with enrollment status via API
- Manages filter state and course display
- Loading skeleton (3 placeholder cards)
- Error handling with retry functionality
- Results count display
- Payment navigation

**Data Flow:**
1. Component mounts → fetchCourses()
2. API call to `/courses` endpoint
3. Process courses with enrollment data
4. Apply filters → update CourseGrid
5. Handle unlock → navigate to payment

## Backend API

### Get Courses (`supabase/functions/get-courses/index.ts`)

**Endpoint:** `GET /courses`

**Authentication:** Required (requireAuth)

**Query Parameters:**
- `subject`: Filter by subject (optional)
- `grade`: Filter by grade - MSCE/JCE/Both (default: Both)
- `page`: Pagination page (default: 1)
- `limit`: Results per page (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "id": "uuid",
        "title": "Mathematics - Chapter 1",
        "subject": "Mathematics",
        "grade": "MSCE",
        "lesson_count": 15,
        "price_mwk": 5000,
        "preview_available": true,
        "published": true,
        "is_enrolled": true,
        "expires_at": "2024-12-31T23:59:59Z",
        "days_remaining": 45
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25
    }
  }
}
```

**SQL Query:**
```sql
SELECT courses.*, enrollments.*
FROM courses 
LEFT JOIN enrollments ON courses.id = enrollments.course_id 
  AND enrollments.user_id = $user_id
WHERE courses.published = true
  AND ($subject IS NULL OR courses.subject = $subject)
  AND ($grade = 'Both' OR courses.grade = $grade)
ORDER BY courses.subject, courses.title
```

## Hooks

### useEnrollment (`src/hooks/useEnrollment.js`)

**Single Course:**
```javascript
const { enrollment, loading, error, invalidate } = useEnrollment(courseId)
```

**All Enrollments:**
```javascript
const { enrollments, loading, error, invalidate } = useEnrollments()
```

**Features:**
- Real-time enrollment status
- Automatic invalidation on payment success
- Error handling and retry logic
- Cache management

## Subject Color Coding

| Subject | Color | Tailwind Classes |
|---------|-------|-----------------|
| Mathematics | Blue | `bg-blue-100 text-blue-800` |
| English | Purple | `bg-purple-100 text-purple-800` |
| Biology | Green | `bg-green-100 text-green-800` |
| Physics | Indigo | `bg-indigo-100 text-indigo-800` |
| Chemistry | Orange | `bg-orange-100 text-orange-800` |
| History | Yellow | `bg-yellow-100 text-yellow-800` |
| Geography | Teal | `bg-teal-100 text-teal-800` |
| Agriculture | Lime | `bg-lime-100 text-lime-800` |
| Social Studies | Pink | `bg-pink-100 text-pink-800` |
| Bible Knowledge | Red | `bg-red-100 text-red-800` |

## User Experience Flow

### New Student
1. Lands on home page → sees course catalogue
2. Filters by subject/grade
3. Sees locked courses with pricing
4. Clicks "Unlock Course" → navigates to payment
5. After payment → course becomes accessible

### Enrolled Student
1. Sees enrollment status and days remaining
2. Clicks course card → navigates to course content
3. Can renew expired courses
4. Can access preview lessons on locked courses

### Admin
1. Can view all courses (no restrictions)
2. Course management through admin dashboard
3. Enrollment analytics and reporting

## Mobile Design

**Breakpoints:**
- 375px (Mobile): 1 column
- 768px (Tablet): 2 columns
- 1024px (Desktop): 3 columns

**Mobile Optimizations:**
- Touch-friendly buttons
- Horizontal scroll for filters
- Compact card layout
- Optimized loading states

## Performance

**Optimizations:**
- Skeleton loading states
- Efficient filtering (client-side)
- Pagination for large course lists
- Cached enrollment data
- Lazy loading for course content

## Security

**Access Control:**
- Authentication required for course access
- Enrollment verification
- Payment status validation
- Audit logging for course access

**Data Protection:**
- User-specific enrollment data
- Secure payment integration
- No sensitive data in client responses

## Future Enhancements

**Planned Features:**
- Course search functionality
- Advanced filtering (difficulty, duration)
- Course recommendations
- Progress tracking integration
- Offline course access
- Course bookmarks and favorites

The course catalogue provides a comprehensive, user-friendly interface for students to discover, filter, and access MSCE Learn courses with proper enrollment management and payment integration.
