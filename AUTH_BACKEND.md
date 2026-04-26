# MSCE Learn - Supabase Auth Backend

This document describes the Supabase authentication backend setup for MSCE Learn.

## Overview

The authentication system uses Supabase Auth for user management with custom backend support for role-based access control and audit logging.

## Database Setup

### Auto-Profile Creation Trigger

When a new user signs up through Supabase Auth, a trigger automatically creates a corresponding profile in the `profiles` table:

```sql
-- Function to auto-create profile on user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, role, email)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    COALESCE(new.raw_user_meta_data->>'phone', ''),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'student'),
    COALESCE(new.raw_user_meta_data->>'email', new.email)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**Default Behavior:**
- New users automatically get `role = 'student'`
- Profile data is populated from user metadata
- Email falls back to auth.email if not provided in metadata

## Frontend Hooks

### useAuth Hook (`src/hooks/useAuth.jsx`)

Manages Supabase authentication state and provides user session data.

```javascript
import { useAuth } from './hooks/useAuth.jsx'

const { user, profile, loading, isAdmin } = useAuth()
```

**Provides:**
- `user` - Supabase auth user object
- `profile` - User profile from database
- `loading` - Authentication state loading
- `isAdmin` - Boolean for admin role
- `refreshProfile()` - Function to refresh profile data

### useProfile Hook (`src/hooks/useProfile.jsx`)

Specialized hook for profile data and role checking.

```javascript
import { useProfile } from './hooks/useProfile.jsx'

const { 
  profile, 
  isAdmin, 
  isStudent, 
  role, 
  fullName, 
  phone, 
  email 
} = useProfile()
```

**Provides:**
- `profile` - Complete profile object
- `isAdmin` - Admin role check
- `isStudent` - Student role check
- `role` - Current user role
- `fullName`, `phone`, `email` - Profile fields

## Backend Auth Helpers

### Core Functions (`supabase/functions/_shared/auth.ts`)

#### `requireAuth(req: Request)`
- Verifies JWT token from Authorization header
- Fetches user profile from database
- Returns `AuthContext` with user, profile, and supabase client
- Throws `HTTPError(401)` for invalid tokens

#### `requireAdmin(req: Request)`
- Calls `requireAuth()` internally
- Checks if `profile.role === 'admin'`
- Throws `HTTPError(403)` for non-admin users
- Returns `AuthContext` for authenticated admin users

#### `optionalAuth(req: Request)`
- Returns `AuthContext` if authenticated, `null` otherwise
- Doesn't throw errors for missing/invalid tokens
- Useful for public endpoints with optional auth

### Role Helper Functions

```typescript
// Check if profile has specific role
hasRole(profile: Profile, role: string): boolean

// Admin role check
isAdmin(profile: Profile): boolean

// Student role check  
isStudent(profile: Profile): boolean
```

## Edge Function Template

All Edge Functions must follow this standard pattern:

```typescript
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { requireAuth, requireAdmin, HTTPError } from '../_shared/auth.ts'
import { validateInput } from '../_shared/validate.ts'
import { logAudit, AuditEvent } from '../_shared/audit.ts'
import { handleError, successResponse } from '../_shared/template.ts'

export async function handler(req: Request): Promise<Response> {
  try {
    // 1. Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return handleCors()
    }

    // 2. Require authentication (use requireAdmin for admin-only)
    const { user, profile, supabase } = await requireAuth(req)

    // 3. Validate input
    const validatedData = await validateInput(req, yourSchema)

    // 4. Business logic
    const result = await yourBusinessLogic(validatedData, supabase, profile)

    // 5. Log audit event
    await logAudit(supabase, {
      user_id: user.id,
      action: AuditEvent.YOUR_ACTION,
      resource: 'your_resource',
      details: validatedData
    })

    // 6. Return success response
    return successResponse(result)

  } catch (error) {
    // 7. Handle errors - never leak stack traces
    return handleError(error)
  }
}
```

## Error Handling

### HTTPError Class

Custom error class for consistent API responses:

```typescript
throw new HTTPError(401, 'Unauthorized', 'UNAUTHORIZED')
throw new HTTPError(403, 'Forbidden', 'INSUFFICIENT_PERMISSIONS')
throw new HTTPError(404, 'Not found', 'NOT_FOUND')
```

### Standard Error Responses

All errors return consistent JSON format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Security Features

### JWT Verification
- Tokens extracted from `Authorization: Bearer <token>` header
- Verified using Supabase service role key
- Invalid/expired tokens return 401

### Role-Based Access Control
- Roles stored in `profiles.role` column
- Admin-only endpoints use `requireAdmin()`
- Student endpoints use `requireAuth()` with role checks

### Audit Logging
- All admin actions logged to `audit_log` table
- Includes user ID, action, resource, and details
- IP address and user agent tracked automatically

## Example Usage

### Admin-Only Endpoint
```typescript
// admin-stats/index.ts
export async function handler(req: Request): Promise<Response> {
  try {
    const { user, profile, supabase } = await requireAdmin(req)
    
    // Only admins can reach this point
    const stats = await fetchAdminStats(supabase)
    
    await logAudit(supabase, {
      user_id: user.id,
      action: AuditEvent.ADMIN_STATS_VIEWED,
      resource: 'admin_dashboard'
    })
    
    return successResponse(stats)
  } catch (error) {
    return handleError(error)
  }
}
```

### User-Only Endpoint
```typescript
// user-profile/index.ts
export async function handler(req: Request): Promise<Response> {
  try {
    const { user, profile, supabase } = await requireAuth(req)
    
    // Any authenticated user can access
    const userProfile = await getUserProfile(supabase, user.id)
    
    return successResponse(userProfile)
  } catch (error) {
    return handleError(error)
  }
}
```

## Environment Variables Required

```bash
# Supabase configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Migration Status

✅ Auto-profile trigger created and active  
✅ Frontend hooks implemented  
✅ Backend auth helpers updated  
✅ Edge Function template created  
✅ Example admin-stats function created  
✅ Error handling standardized  

The authentication backend is fully operational and ready for use across all MSCE Learn Edge Functions.
