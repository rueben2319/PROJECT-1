import { useState, useEffect, useRef, useCallback } from 'react'
import Hls from 'hls.js'

export default function VideoPlayer({ videoId, courseId, initialSeconds = 0, onProgress, onComplete, onStatus }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const refreshTimeoutRef = useRef(null)
  const progressTickRef = useRef(null)
  const lastSavedSecondRef = useRef(-1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoData, setVideoData] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(false)
  const [isRefreshingUrl, setIsRefreshingUrl] = useState(false)
  const [isSavingProgress, setIsSavingProgress] = useState(false)

  const emitStatus = useCallback((message, type = 'info') => {
    if (onStatus) onStatus({ id: `${Date.now()}-${Math.random()}`, message, type })
  }, [onStatus])

  const reportProgress = useCallback(async (seconds, totalDuration) => {
    if (!onProgress) return

    const rounded = Math.floor(seconds)
    const shouldSave = rounded > 0 && rounded % 30 === 0 && rounded !== lastSavedSecondRef.current
    const result = onProgress(seconds, totalDuration)

    if (shouldSave) {
      lastSavedSecondRef.current = rounded
      setIsSavingProgress(true)
      emitStatus('Saving lesson progress…', 'info')

      try {
        await Promise.resolve(result)
        emitStatus('Progress saved.', 'success')
      } catch {
        emitStatus('Could not save progress. We will retry automatically.', 'warning')
      } finally {
        setIsSavingProgress(false)
      }
    }
  }, [emitStatus, onProgress])

  const fetchVideoUrl = useCallback(async ({ isRefresh = false } = {}) => {
    try {
      if (isRefresh) {
        setIsRefreshingUrl(true)
        emitStatus('Refreshing secure video link…', 'info')
      } else {
        setLoading(true)
      }

      setError(null)
      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/get-video-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ video_id: videoId, course_id: courseId })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to load this lesson video right now.')
      }

      setVideoUrl(data.url)
      setVideoData(data.video_data)
      if (isRefresh) emitStatus('Video link refreshed.', 'success')
      return data.url
    } catch (err) {
      const message = err.message || 'Unable to load this lesson video right now.'
      setError(message)
      emitStatus(message, 'error')
      throw err
    } finally {
      setLoading(false)
      setIsRefreshingUrl(false)
    }
  }, [courseId, emitStatus, videoId])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !videoUrl) return

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    video.removeAttribute('src')
    video.load()

    const removeListeners = []
    const addVideoListener = (event, handler) => {
      video.addEventListener(event, handler)
      removeListeners.push(() => video.removeEventListener(event, handler))
    }

    addVideoListener('contextmenu', (e) => e.preventDefault())
    addVideoListener('loadedmetadata', () => {
      setDuration(video.duration || 0)
      if (initialSeconds > 0) {
        video.currentTime = initialSeconds
      }
      setLoading(false)
    })
    addVideoListener('timeupdate', () => {
      setCurrentTime(video.currentTime)
      if (progressTickRef.current) clearTimeout(progressTickRef.current)
      progressTickRef.current = setTimeout(() => {
        reportProgress(video.currentTime, video.duration)
      }, 120)
    })
    addVideoListener('ended', () => {
      setIsPlaying(false)
      if (onComplete) onComplete(video)
    })
    addVideoListener('play', () => setIsPlaying(true))
    addVideoListener('pause', () => setIsPlaying(false))
    addVideoListener('waiting', () => {
      setIsBuffering(true)
      emitStatus('Buffering…', 'info')
    })
    addVideoListener('playing', () => setIsBuffering(false))

    const canPlayNativeHLS = video.canPlayType('application/vnd.apple.mpegurl')
    if (canPlayNativeHLS && videoUrl.includes('.m3u8')) {
      video.src = videoUrl
    } else if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true, backBufferLength: 90 })
      hlsRef.current = hls
      hls.loadSource(videoUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setError('Video playback failed. Please retry.')
          emitStatus('Video playback failed. Please retry.', 'error')
          setLoading(false)
          setIsBuffering(false)
        }
      })
    } else {
      video.src = videoUrl.replace('.m3u8', '.mp4')
    }

    return () => {
      removeListeners.forEach((cleanup) => cleanup())
      if (progressTickRef.current) clearTimeout(progressTickRef.current)
    }
  }, [emitStatus, initialSeconds, onComplete, reportProgress, videoUrl])

  useEffect(() => {
    queueMicrotask(() => {
      fetchVideoUrl().catch(() => {})
    })

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [fetchVideoUrl])

  useEffect(() => {
    if (!videoUrl) return

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(async () => {
        const video = videoRef.current
        const playbackTime = video?.currentTime || 0
        const shouldResume = Boolean(video && !video.paused)

        try {
          await fetchVideoUrl({ isRefresh: true })
          if (videoRef.current) {
            videoRef.current.currentTime = playbackTime
            if (shouldResume) await videoRef.current.play()
          }
        } catch {
          // Error feedback handled in fetchVideoUrl.
        } finally {
          scheduleRefresh()
        }
      }, 9 * 60 * 1000)
    }

    scheduleRefresh()
    return () => {
      if (refreshTimeoutRef.current) clearTimeout(refreshTimeoutRef.current)
    }
  }, [fetchVideoUrl, videoUrl])

  const formatTime = (seconds) => {
    const s = Math.max(0, Math.floor(seconds || 0))
    const hours = Math.floor(s / 3600)
    const minutes = Math.floor((s % 3600) / 60)
    const secs = s % 60
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeek = (event) => {
    const time = parseFloat(event.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const togglePlayPause = async () => {
    if (!videoRef.current) return
    try {
      if (videoRef.current.paused) await videoRef.current.play()
      else videoRef.current.pause()
    } catch {
      emitStatus('Playback could not start automatically.', 'warning')
    }
  }

  if (loading) {
    return (
      <div className="aspect-video rounded-xl bg-black text-white flex items-center justify-center" aria-live="polite">
        <div className="text-center">
          <div className="loading-spinner-lg mx-auto mb-3"></div>
          <p>Loading video…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="aspect-video rounded-xl bg-black/95 text-white flex items-center justify-center p-6" role="alert" aria-live="assertive">
        <div className="max-w-sm text-center space-y-3">
          <p className="text-base font-semibold">We couldn’t load this video URL.</p>
          <p className="text-sm text-gray-200">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => fetchVideoUrl()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-400"
              aria-label="Retry loading lesson video"
            >
              Retry video
            </button>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-white/40 px-4 py-2 text-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
              aria-label="Reload page"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    )
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="relative overflow-hidden rounded-xl bg-black">
      <video
        ref={videoRef}
        className="w-full aspect-video"
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
        webkit-playsinline="true"
        aria-label={videoData?.title ? `Video player for ${videoData.title}` : 'Lesson video player'}
      />

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 sm:p-4">
        <label htmlFor="video-progress" className="sr-only">Seek through lesson video</label>
        <input
          id="video-progress"
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleSeek}
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration || 0)}
          aria-valuenow={Math.floor(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          className="slider h-1 w-full cursor-pointer appearance-none rounded-lg bg-gray-600"
          style={{ background: `linear-gradient(to right, #1D4ED8 0%, #1D4ED8 ${progressPercent}%, #4B5563 ${progressPercent}%, #4B5563 100%)` }}
        />

        <div className="mt-2 flex items-center justify-between text-xs text-white/90">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {videoData && (
          <div className="mt-2 text-white">
            <p className="text-sm font-semibold line-clamp-1">{videoData.title}</p>
            {videoData.duration_seconds && (
              <p className="text-xs text-gray-300">Duration: {formatTime(videoData.duration_seconds)}</p>
            )}
          </div>
        )}
      </div>

      <button
        onClick={togglePlayPause}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/20 p-4 backdrop-blur-sm transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white/70"
        aria-label={isPlaying ? 'Pause video' : 'Play video'}
      >
        {isPlaying ? (
          <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {(isBuffering || isRefreshingUrl || isSavingProgress) && (
        <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/70 px-2 py-1 text-xs text-white" aria-live="polite">
          {isBuffering ? 'Buffering…' : isRefreshingUrl ? 'Refreshing video link…' : 'Saving progress…'}
        </div>
      )}

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #1d4ed8;
          border-radius: 9999px;
          cursor: pointer;
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #1d4ed8;
          border-radius: 9999px;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
