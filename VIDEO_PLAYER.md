# MSCE Learn - Video Player and Delivery System

This document describes the complete video player and delivery system for MSCE Learn, implementing secure video streaming with Cloudflare R2 and comprehensive progress tracking.

## Overview

The video player system provides secure, high-quality video streaming for MSCE Learn courses with mobile-optimized playback, progress tracking, and enrollment-based access control. The system uses HLS.js for adaptive streaming and implements strict security measures to protect video content.

## Security Architecture

### Core Security Principles
1. **Signed URLs only** - Raw R2 paths NEVER exposed to frontend
2. **URL expiration** - Signed URLs expire in 600 seconds (10 minutes)
3. **Enrollment verification** - Re-checked on EVERY video URL request
4. **Auto-refresh** - Player requests fresh signed URL before expiration
5. **Access control** - Preview lessons exempt from enrollment check

### Video Access Flow
```
Frontend → /get-video-url → Enrollment Check → R2 Signed URL → Video Player
                ↓
            Auto-refresh every 9 minutes
                ↓
            Continuous secure playback
```

## Components

### VideoPlayer (`src/components/player/VideoPlayer.jsx`)

**Props:**
```javascript
{
  videoId: string,
  courseId: string,
  initialSeconds: number,
  onProgress: Function,
  onComplete: Function
}
```

**Features:**
- **HLS.js integration** - Adaptive streaming for Android Chrome
- **Native HLS fallback** - Safari/iOS native support
- **Auto-refresh URLs** - Every 9 minutes to prevent expiration
- **Progress tracking** - Automatic progress saving every 30 seconds
- **Completion detection** - Marks complete at 90%+ watched
- **Security measures** - No download button, disabled right-click
- **Resume playback** - Starts from initialSeconds
- **Loading states** - Skeleton loading while fetching URLs

**Player Controls:**
- Custom progress bar with seek functionality
- Play/pause toggle with visual feedback
- Time display (current/total duration)
- Volume and fullscreen controls
- Keyboard shortcuts (Space, Arrow keys, F, M)

### LessonSidebar (`src/components/player/LessonSidebar.jsx`)

**Props:**
```javascript
{
  lessons: Array,
  currentVideoId: string,
  onSelect: Function
}
```

**Features:**
- **Lesson navigation** - Click to switch between lessons
- **Progress indicators** - Visual completion status
- **Current lesson highlight** - Active lesson emphasis
- **Locked lesson protection** - Prevents access to locked content
- **Overall progress** - Course completion percentage
- **Duration display** - Lesson length information

**Visual States:**
- **Completed** - Green checkmark
- **Current** - Blue play icon with highlight
- **Locked** - Gray lock icon (non-clickable)
- **Available** - Gray play icon

## Pages

### Watch Page (`src/pages/Watch.jsx`)

**Route:** `/watch/:videoId?courseId=xxx`

**Features:**
- **Full-screen layout** - Optimized for video consumption
- **Course context** - Lesson list and navigation
- **Progress persistence** - Resume from last watched position
- **Auto-advance** - Navigate to next lesson on completion
- **Error handling** - Comprehensive error states
- **Mobile optimization** - Responsive design for all devices

**Layout Structure:**
```
Header (Lesson info + navigation)
├── Video Player (3/4 width)
└── Lesson Sidebar (1/4 width, sticky)
```

## Backend API

### Get Video URL (`supabase/functions/get-video-url/index.ts`)

**Endpoint:** `POST /get-video-url`

**Authentication:** Required (requireAuth)

**Request Body:**
```json
{
  "video_id": "uuid",
  "course_id": "uuid"
}
```

**Security Process:**
1. **Fetch video from database** - Get r2_playlist_path (NEVER from client)
2. **Enrollment verification** - Required for non-preview lessons
3. **Generate signed URL** - Cloudflare R2 with 600s expiration
4. **Audit logging** - Track video access events

**Response:**
```json
{
  "success": true,
  "data": {
    "url": "https://bucket.account.r2.cloudflarestorage.com/playlist.m3u8?X-Amz-Signature=...",
    "video_data": {
      "id": "uuid",
      "title": "Lesson 1: Introduction",
      "duration_seconds": 1800,
      "is_preview": false
    }
  }
}
```

**R2 Signed URL Generation:**
```typescript
// AWS4-HMAC-SHA256 signature process
const canonicalRequest = [
  'GET',
  `/${bucketName}/${objectKey}`,
  '',
  'host=account.cloudflare.com',
  'x-amz-date=' + timestamp,
  'host;x-amz-date',
  'UNSIGNED-PAYLOAD'
].join('\n')

// 10-minute expiration
const expiresIn = 600
const expiration = Math.floor(Date.now() / 1000) + expiresIn
```

### Save Progress (`supabase/functions/save-progress/index.ts`)

**Endpoint:** `POST /save-progress`

**Authentication:** Required (requireAuth)

**Request Body:**
```json
{
  "video_id": "uuid",
  "seconds_watched": 1234
}
```

**Processing:**
- **UPSERT operation** - Create or update progress record
- **Completion detection** - Mark complete at 90% threshold
- **Audit logging** - Track lesson completion events
- **No enrollment check** - Already verified by video URL access

**Response:**
```json
{
  "success": true,
  "data": {
    "video_id": "uuid",
    "seconds_watched": 1234,
    "completed": true,
    "completion_percentage": 95
  }
}
```

## Frontend Hooks

### useProgress (`src/hooks/useProgress.js`)

**Features:**
- **Debounced saving** - Only saves every 30 seconds
- **Completion tracking** - 90% threshold detection
- **Error handling** - Robust error management
- **Time formatting** - Human-readable time display
- **Manual save trigger** - Force save functionality

**Usage:**
```javascript
const progress = useProgress(videoId, courseId)

// Handle time updates
progress.handleTimeUpdate(currentSeconds, totalDuration)

// Handle completion
progress.handleComplete()

// Get completion percentage
const percentage = progress.completionPercentage
```

### useVideoPlayer (`src/hooks/useProgress.js`)

**Extended functionality:**
- **Playback controls** - Play/pause, volume, rate
- **Keyboard shortcuts** - Space, arrows, F, M keys
- **Fullscreen support** - Toggle fullscreen mode
- **Seek functionality** - Jump to specific time
- **Skip controls** - Forward/backward navigation

## Video Streaming Technology

### HLS.js Integration
- **Adaptive bitrate** - Automatic quality adjustment
- **Low latency mode** - Reduced buffering delay
- **Worker support** - Background processing
- **Error recovery** - Automatic retry mechanisms

### Browser Support
- **Chrome/Android** - HLS.js with adaptive streaming
- **Safari/iOS** - Native HLS support
- **Fallback** - MP4 direct playback for older browsers

### CDN Integration
- **Cloudflare R2** - Secure object storage
- **Signed URLs** - Time-limited access tokens
- **Edge caching** - Optimized delivery
- **Global distribution** - Fast worldwide access

## Progress Tracking

### Data Model
```sql
CREATE TABLE progress (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  video_id UUID REFERENCES videos(id),
  course_id UUID REFERENCES courses(id),
  watch_time_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, video_id)
);
```

### Completion Logic
- **90% threshold** - Mark complete at 90% watched
- **Automatic detection** - Real-time completion tracking
- **Audit logging** - Completion events recorded
- **Progress persistence** - Resume capability

## User Experience

### Playback Flow
1. **Lesson selection** - Click lesson from course detail
2. **URL generation** - Secure signed URL creation
3. **Video loading** - Adaptive stream initialization
4. **Progress tracking** - Automatic saving every 30s
5. **Completion handling** - Auto-advance to next lesson

### Mobile Optimization
- **Touch controls** - Mobile-friendly interface
- **Responsive design** - Adapts to screen size
- **Performance** - Optimized for mobile networks
- **Battery efficiency** - Hardware acceleration

### Accessibility
- **Keyboard navigation** - Full keyboard control
- **Screen reader support** - Semantic HTML structure
- **High contrast** - Visual accessibility
- **Captions support** - Subtitle integration ready

## Performance Optimization

### Frontend Optimizations
- **Lazy loading** - Components load as needed
- **Debounced saving** - Reduced API calls
- **Memory management** - Proper cleanup
- **Cache strategies** - Intelligent data caching

### Backend Optimizations
- **Database indexing** - Fast progress queries
- **Connection pooling** - Efficient database use
- **Signed URL caching** - Reduced R2 API calls
- **Audit logging** - Asynchronous logging

### CDN Optimizations
- **Edge caching** - Content delivery optimization
- **Compression** - Reduced bandwidth usage
- **HTTP/2** - Multiplexed connections
- **Brotli encoding** - Text compression

## Security Measures

### Access Control
- **JWT authentication** - Secure user identification
- **Enrollment verification** - Every request validated
- **URL expiration** - Time-limited access tokens
- **Preview protection** - Controlled free content

### Content Protection
- **Signed URLs** - Prevents direct R2 access
- **No download** - Disabled download controls
- **Domain restriction** - Hotlinking prevention
- **Audit logging** - Complete access tracking

## Error Handling

### Frontend Errors
- **Network failures** - Retry mechanisms
- **Video loading** - Graceful degradation
- **Progress sync** - Local state preservation
- **User feedback** - Clear error messages

### Backend Errors
- **Authentication** - 401/403 responses
- **Database errors** - Comprehensive logging
- **R2 failures** - Fallback strategies
- **Validation errors** - Detailed error responses

## Monitoring and Analytics

### Video Analytics
- **View counts** - Lesson popularity tracking
- **Completion rates** - Engagement metrics
- **Watch time** - Content consumption analysis
- **Drop-off points** - Content optimization insights

### Performance Metrics
- **Load times** - Video initialization speed
- **Buffer events** - Streaming quality metrics
- **Error rates** - System reliability tracking
- **User experience** - Satisfaction measurements

## Future Enhancements

**Planned Features:**
- **Offline playback** - Download for offline viewing
- **Picture-in-picture** - Multitasking support
- **Speed controls** - Variable playback rates
- **Chapter markers** - Lesson navigation
- **Quiz integration** - Interactive content
- **Live streaming** - Real-time lessons
- **AI recommendations** - Personalized content

The video player and delivery system provides a secure, high-quality streaming experience that enables Malawian students to access educational content with reliable progress tracking and comprehensive security protection.
