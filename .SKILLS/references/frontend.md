# Frontend Reference — MSCE Learn

React + Tailwind CSS. Mobile-first. All components assume a 375px minimum viewport.

---

## Design tokens (always use these — never hardcode colours)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EFF6FF',
          100: '#DBEAFE',
          700: '#1D4ED8',  // primary — use this for buttons, links
          800: '#1E40AF',  // hover state
          900: '#1E3A5F',  // headings
        },
        accent: {
          50:  '#F0FDF4',
          100: '#D1FAE5',
          700: '#0F6E56',  // accent — success, enrolled, teal elements
          800: '#065F46',  // hover state
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card:   '8px',
        button: '20px',
      },
    },
  },
}
```

---

## Component patterns

### CourseCard

```jsx
// src/components/courses/CourseCard.jsx
export function CourseCard({ course, isEnrolled, onUnlock }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4
                    hover:shadow-md transition-shadow cursor-pointer">
      {/* Subject badge */}
      <span className="text-xs font-medium bg-brand-50 text-brand-700
                       px-2 py-1 rounded-full">
        {course.subject}
      </span>

      <h3 className="text-base font-semibold text-slate-800 mt-2 mb-1">
        {course.title}
      </h3>
      <p className="text-sm text-slate-500 mb-3 line-clamp-2">
        {course.description}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">
          MWK {course.price_mwk.toLocaleString()}
        </span>

        {isEnrolled ? (
          <span className="text-xs font-medium bg-accent-100 text-accent-700
                           px-2 py-1 rounded-full">
            ✓ Enrolled
          </span>
        ) : (
          <button
            onClick={() => onUnlock(course)}
            className="text-sm font-medium bg-brand-700 text-white
                       px-4 py-1.5 rounded-full hover:bg-brand-800
                       active:scale-95 transition-all"
          >
            Unlock
          </button>
        )}
      </div>

      {/* Lock overlay on thumbnail */}
      {!isEnrolled && (
        <div className="mt-2 h-28 bg-slate-100 rounded-md flex items-center
                        justify-center text-slate-400">
          <span className="text-2xl">🔒</span>
        </div>
      )}
    </div>
  )
}
```

### PaymentModal

```jsx
// src/components/payment/PaymentModal.jsx
import { useState } from 'react'
import { api } from '../../lib/api'

const STATES = { IDLE: 'idle', LOADING: 'loading', POLLING: 'polling',
                 SUCCESS: 'success', FAILED: 'failed' }

export function PaymentModal({ course, onClose, onSuccess }) {
  const [phone, setPhone]   = useState('')
  const [status, setStatus] = useState(STATES.IDLE)
  const [error, setError]   = useState(null)

  async function handlePay() {
    if (!phone.match(/^0[89]\d{8}$/)) {
      setError('Enter a valid Airtel or Mpamba number (e.g. 0881234567)')
      return
    }
    setStatus(STATES.LOADING)
    setError(null)

    try {
      const { data } = await api.post('/create-payment', {
        course_id: course.id,
        phone_number: phone
      })

      setStatus(STATES.POLLING)
      const result = await pollStatus(data.tx_ref)
      if (result === 'paid') {
        setStatus(STATES.SUCCESS)
        onSuccess()
      } else {
        setStatus(STATES.FAILED)
        setError('Payment was not completed. Please try again.')
      }
    } catch {
      setStatus(STATES.FAILED)
      setError('Something went wrong. Please try again.')
    }
  }

  async function pollStatus(tx_ref, attempts = 0) {
    if (attempts >= 12) return 'timeout' // 12 × 5s = 60s max
    await new Promise(r => setTimeout(r, 5000))
    const { data } = await api.get(`/payment-status?tx_ref=${tx_ref}`)
    if (data?.status === 'paid')   return 'paid'
    if (data?.status === 'failed') return 'failed'
    return pollStatus(tx_ref, attempts + 1)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center
                    justify-center z-50 p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-1">
          Unlock {course.title}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          MWK {course.price_mwk.toLocaleString()} · 30 days access
        </p>

        {status === STATES.IDLE && (
          <>
            <label className="text-sm font-medium text-slate-700 block mb-1">
              Airtel or Mpamba number
            </label>
            <input
              type="tel"
              placeholder="e.g. 0881234567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-4 py-3
                         text-base focus:outline-none focus:ring-2
                         focus:ring-brand-700 mb-3"
            />
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <button onClick={handlePay}
              className="w-full bg-brand-700 text-white font-medium py-3
                         rounded-2xl hover:bg-brand-800 active:scale-95
                         transition-all">
              Pay MWK {course.price_mwk.toLocaleString()}
            </button>
          </>
        )}

        {status === STATES.LOADING && (
          <div className="text-center py-6">
            <Spinner />
            <p className="text-sm text-slate-600 mt-3">
              Sending payment prompt to your phone...
            </p>
          </div>
        )}

        {status === STATES.POLLING && (
          <div className="text-center py-6">
            <Spinner />
            <p className="text-sm font-medium text-slate-800 mt-3">
              Check your phone
            </p>
            <p className="text-sm text-slate-500 mt-1">
              Confirm the USSD prompt on your handset to complete payment.
            </p>
          </div>
        )}

        {status === STATES.SUCCESS && (
          <div className="text-center py-6">
            <span className="text-4xl">✅</span>
            <p className="text-base font-semibold text-slate-800 mt-3">
              Payment confirmed!
            </p>
            <p className="text-sm text-slate-500 mt-1">
              You now have 30 days access to {course.title}.
            </p>
          </div>
        )}

        {status === STATES.FAILED && (
          <>
            <p className="text-sm text-red-600 mb-3">{error}</p>
            <button onClick={() => setStatus(STATES.IDLE)}
              className="w-full bg-brand-700 text-white font-medium py-3
                         rounded-2xl hover:bg-brand-800">
              Try again
            </button>
          </>
        )}

        <button onClick={onClose}
          className="w-full text-sm text-slate-500 mt-3 py-2">
          Cancel
        </button>
      </div>
    </div>
  )
}
```

### VideoPlayer (HLS)

```jsx
// src/components/player/VideoPlayer.jsx
import Hls from 'hls.js'
import { useEffect, useRef, useCallback } from 'react'
import { api } from '../../lib/api'

export function VideoPlayer({ videoId, courseId, initialSeconds = 0, onProgress }) {
  const ref    = useRef(null)
  const hlsRef = useRef(null)
  const timer  = useRef(null)

  // Load signed URL from backend
  useEffect(() => {
    let cancelled = false
    api.get(`/video-url?video_id=${videoId}&course_id=${courseId}`)
      .then(({ data }) => {
        if (cancelled || !data?.url) return
        initPlayer(data.url)
      })
    return () => { cancelled = true; cleanup() }
  }, [videoId, courseId])

  function initPlayer(url) {
    if (Hls.isSupported()) {
      const hls = new Hls({ maxBufferLength: 30, startLevel: -1 })
      hls.loadSource(url)
      hls.attachMedia(ref.current)
      hlsRef.current = hls
    } else if (ref.current.canPlayType('application/vnd.apple.mpegurl')) {
      ref.current.src = url // native HLS (Safari)
    }
    if (initialSeconds > 0) {
      ref.current.addEventListener('loadedmetadata', () => {
        ref.current.currentTime = initialSeconds
      }, { once: true })
    }
  }

  // Save progress every 30 seconds
  const saveProgress = useCallback(() => {
    if (!ref.current) return
    api.post('/progress', {
      video_id:        videoId,
      seconds_watched: Math.floor(ref.current.currentTime)
    })
    onProgress?.(Math.floor(ref.current.currentTime))
  }, [videoId, onProgress])

  useEffect(() => {
    timer.current = setInterval(saveProgress, 30_000)
    return () => clearInterval(timer.current)
  }, [saveProgress])

  function cleanup() {
    hlsRef.current?.destroy()
    clearInterval(timer.current)
  }

  return (
    <video
      ref={ref}
      controls
      controlsList="nodownload"      // hide download button
      onContextMenu={e => e.preventDefault()} // disable right-click
      className="w-full rounded-lg bg-black aspect-video"
      playsInline
    />
  )
}
```

---

## Hooks

### useAuth

```javascript
// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

### useEnrollment

```javascript
// src/hooks/useEnrollment.js
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth }  from './useAuth'

export function useEnrollment(courseId) {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['enrollment', user?.id, courseId],
    enabled:  !!user && !!courseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('enrollments')
        .select('id, expires_at')
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle()
      return data // null = not enrolled
    }
  })
}
```

---

## API client

```javascript
// src/lib/api.js
import { supabase } from './supabase'

const BASE = import.meta.env.VITE_SUPABASE_URL + '/functions/v1'

async function request(method, path, body) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Request failed')
  return json
}

export const api = {
  get:  (path)       => request('GET',  path),
  post: (path, body) => request('POST', path, body),
}
```

---

## ProtectedRoute

```jsx
// src/components/auth/ProtectedRoute.jsx
import { Navigate } from 'react-router-dom'
import { useAuth }  from '../../hooks/useAuth'
import { Spinner }  from '../ui/Spinner'

// Gate by auth only — enrollment checked on the backend per request
export function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center mt-20"><Spinner /></div>
  if (!user)   return <Navigate to="/login" replace />
  return children
}
```

---

## Naming conventions

| Type | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `CourseCard`, `VideoPlayer` |
| Hooks | camelCase with `use` prefix | `useAuth`, `useEnrollment` |
| Files | PascalCase for components | `CourseCard.jsx` |
| CSS classes | Tailwind utilities only — no custom CSS | — |
| API paths | kebab-case | `/create-payment`, `/video-url` |
| DB columns | snake_case | `user_id`, `expires_at` |

---

## Do / Do not

| ✅ Do | ❌ Do not |
|-------|---------|
| Gate all routes with ProtectedRoute | Trust frontend enrollment checks for video |
| Show loading states during API calls | Store JWT in localStorage (use Supabase session) |
| Validate phone numbers before submit | Pass user_id in API request body |
| Use `controlsList="nodownload"` on video | Show raw error messages to user |
| Disable right-click on video player | Hardcode prices in the UI |
| Poll for payment status from backend | Show "payment successful" based on frontend alone |
