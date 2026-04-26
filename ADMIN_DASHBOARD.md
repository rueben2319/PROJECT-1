# MSCE Learn - Admin Dashboard

This document describes the MSCE Learn admin dashboard and Command Centre, providing comprehensive system management and monitoring capabilities for administrators.

## Overview

The admin dashboard is a dark-themed, professional interface that provides real-time insights into system performance, user activity, revenue metrics, and operational status. Access is restricted to users with `role = 'admin'` and is enforced through the `AdminRoute` component.

## Design System

### Color Palette
- **Background**: `#0A0E1A` - Deep dark blue
- **Surface**: `#111827` - Dark gray for cards and panels
- **Border**: `#1F2D45` - Subtle borders for depth
- **Accent**: `#0F6E56` - Teal for primary actions and highlights
- **Text**: White and gray variants for hierarchy

### Typography
- **Headings**: Syne font family (modern, professional)
- **Data/Monospace**: JetBrains Mono for numbers, timestamps, code
- **Body**: System fonts for readability

### Components
- **Cards**: Dark surfaces with subtle borders
- **Badges**: Color-coded status indicators
- **Charts**: Custom implementations with teal accents
- **Tables**: Dark theme with hover states

## Architecture

### Route Structure
```
/admin              → Dashboard (Command Centre)
/admin/payments     → Payment management
/admin/users         → Student management  
/admin/content        → Content management
/admin/config         → System configuration
/admin/security       → Security monitoring
/admin/audit          → Audit log viewer
```

### Component Hierarchy
```
App.jsx
├── AdminRoute (role enforcement)
└── AdminRouter
    └── AdminShell (layout shell)
        ├── Topbar (status, clock, user)
        ├── Sidebar (navigation)
        └── Page Content
```

## Components

### AdminShell (`src/components/admin/AdminShell.jsx`)

**Features:**
- **Dark theme layout** with consistent styling
- **Responsive sidebar** with organized navigation
- **Live system status** with pulse animation
- **Real-time clock** in JetBrains Mono
- **Admin badge** for role identification
- **User profile** display with name and email

**Navigation Structure:**
```
Overview
├── Dashboard

Operations  
├── Payments (badge: pending count)
├── Students
└── Content

System
├── Configuration
├── Security (badge: alert count)
└── Audit Log
```

**Active State Styling:**
- Teal border left indicator
- Teal background dim
- White text for active items

### Dashboard (`src/pages/admin/Dashboard.jsx`)

**Command Centre Features:**

#### Stat Cards (4 across)
1. **Revenue (30 days)**
   - MWK amount with USD equivalent
   - Growth indicator (+12.5%)
   - Font-mono display for precision

2. **Active Enrollments**
   - Current active student count
   - Growth indicator (+8.2%)
   - Real-time enrollment tracking

3. **Pending Payments**
   - Amber warning if > 0
   - Attention indicator with pulse
   - Payment processing status

4. **Expiring in 3 Days**
   - Renewal opportunity tracking
   - Purple accent for opportunities
   - Target for renewal campaigns

#### Revenue Chart (Last 7 Days)
- **Bar chart** implementation with hover tooltips
- **Daily grouping** with Africa/Blantyre timezone
- **Teal color scheme** with hover interactions
- **Summary totals** below chart

#### Enrollments by Subject
- **Horizontal progress bars** for each subject
- **Sorted by popularity** (highest first)
- **Count display** with visual indicators
- **Responsive layout** for mobile

#### Recent Transactions Table
**Columns:**
- Time (font-mono, 24-hour format)
- Student name
- Course title
- Amount (MWK, font-mono)
- Status (color-coded badges)
- Network (Airtel/TNM Mpamba)

**Status Badges:**
- **PAID**: Teal background with border
- **PENDING**: Amber background with border
- **FAILED**: Red background with border

#### Live Activity Feed
- **Colored dots** for event types:
  - Green: Success events
  - Amber: Warning events
  - Red: Error events
  - Blue: Info events
- **Last 10 audit log events**
- **Human-readable messages**
- **Timestamps** in relative format

## Backend API

### Admin Stats (`supabase/functions/admin-stats/index.ts`)

**Security:**
- **requireAuth + requireAdmin** - Double verification
- **Promise.all** for parallel data fetching
- **Audit logging** for dashboard access

**Data Sources:**
```typescript
// Parallel queries for optimal performance
const [
  revenueResult,           // Last 30 days revenue
  activeEnrollmentsResult,  // Current active enrollments
  pendingPaymentsResult,    // Pending payment count
  expiringSoonResult,       // Expiring in 3 days
  revenueChartResult,       // Last 7 days daily revenue
  enrollmentsBySubjectResult, // Subject breakdown
  recentTransactionsResult,  // Last 10 transactions
  activityFeedResult        // Last 10 audit events
] = await Promise.all([...])
```

**Response Structure:**
```json
{
  "revenue": {
    "mwk": 1500000,
    "usd": 857.14
  },
  "active_enrollments": 1250,
  "pending_payments": 15,
  "expiring_soon": 8,
  "revenue_chart": [
    {"date": "2024-01-20", "revenue_mwk": 250000},
    {"date": "2024-01-21", "revenue_mwk": 180000}
  ],
  "enrollments_by_subject": [
    {"subject": "Mathematics", "count": 450},
    {"subject": "Biology", "count": 320}
  ],
  "recent_transactions": [...],
  "activity_feed": [...],
  "system_status": "healthy",
  "security_alerts": 0
}
```

## Security Features

### Access Control
- **Role-based access** - Only `admin` role allowed
- **Route protection** - AdminRoute component enforcement
- **JWT verification** - Secure authentication
- **Audit logging** - All admin actions tracked

### Data Protection
- **Server-side aggregation** - No raw data exposure
- **Input validation** - Zod schema validation
- **Error handling** - No sensitive data in errors
- **Rate limiting** - Prevent abuse

### Monitoring
- **System status** - Real-time health monitoring
- **Security alerts** - Threat detection and reporting
- **Activity tracking** - Comprehensive audit trail
- **Performance metrics** - System performance indicators

## User Experience

### Navigation
- **Intuitive sidebar** with logical grouping
- **Visual indicators** for badges and alerts
- **Active state** highlighting
- **Responsive design** for all screen sizes

### Data Visualization
- **Real-time updates** without page refresh
- **Interactive charts** with hover details
- **Color-coded status** indicators
- **Consistent styling** across all components

### Performance
- **Parallel data fetching** for fast loading
- **Optimized queries** with proper indexing
- **Efficient rendering** with React optimizations
- **Cached data** where appropriate

## Real-time Features

### Live Updates
- **System status** with pulse animation
- **Activity feed** showing latest events
- **Transaction monitoring** with status updates
- **Enrollment tracking** in real-time

### Automatic Refresh
- **Dashboard data** refreshes on mount
- **Badge counts** update automatically
- **Activity feed** shows latest events
- **System status** monitors continuously

## Mobile Responsiveness

### Layout Adaptation
- **Sidebar collapses** on mobile devices
- **Stat cards** stack vertically
- **Charts** adapt to smaller screens
- **Tables** scroll horizontally

### Touch Optimization
- **Larger touch targets** for mobile
- **Swipe gestures** for navigation
- **Responsive typography** scaling
- **Optimized spacing** for touch

## Future Enhancements

### Planned Features
- **Advanced analytics** with custom date ranges
- **Export functionality** for reports
- **Real-time notifications** for critical events
- **User behavior tracking** and insights
- **Performance monitoring** dashboards
- **Integration alerts** for external systems

### Scalability
- **Caching strategies** for large datasets
- **Pagination** for data tables
- **Lazy loading** for heavy components
- **Background updates** for real-time data

## Integration Points

### Payment System
- **Transaction monitoring** in real-time
- **Revenue tracking** by time period
- **Payment status** updates
- **Network analytics** for mobile money

### User Management
- **Student enrollment** tracking
- **Active user** monitoring
- **Course access** analytics
- **User behavior** insights

### Content Management
- **Course performance** metrics
- **Content engagement** tracking
- **Video analytics** integration
- **Subject popularity** analysis

## Troubleshooting

### Common Issues

#### Dashboard Not Loading
- Check admin role assignment
- Verify JWT token validity
- Check network connectivity
- Review browser console for errors

#### Data Not Updating
- Verify database connections
- Check Edge Function status
- Review API response times
- Check browser cache settings

#### Badge Counts Wrong
- Verify data aggregation queries
- Check timezone handling
- Review filtering logic
- Test with fresh data

### Performance Issues

#### Slow Loading
- Optimize database queries
- Add appropriate indexes
- Implement caching strategies
- Reduce data transfer size

#### Memory Usage
- Implement pagination
- Optimize React rendering
- Clean up subscriptions
- Monitor component lifecycle

The admin dashboard provides a comprehensive, professional interface for managing MSCE Learn operations with real-time insights, robust security, and excellent user experience across all devices.
