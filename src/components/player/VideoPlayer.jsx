import React, { useState, useEffect, useRef, useCallback } from 'react'
import Hls from 'hls.js'

export default function VideoPlayer({ 
  videoId, 
  courseId, 
  initialSeconds = 0, 
  onProgress, 
  onComplete 
}) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const intervalRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [videoData, setVideoData] = useState(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // Fetch signed video URL
  const fetchVideoUrl = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const token = localStorage.getItem('sb-access-token')
      const response = await fetch('/api/get-video-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          video_id: videoId,
          course_id: courseId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load video')
      }

      setVideoUrl(data.url)
      setVideoData(data.video_data)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [videoId, courseId])

  // Initialize video player
  const initializePlayer = useCallback(() => {
    if (!videoRef.current || !videoUrl) return

    const video = videoRef.current

    // Disable right-click context menu
    video.addEventListener('contextmenu', (e) => {
      e.preventDefault()
      return false
    })

    // Set initial time
    if (initialSeconds > 0) {
      video.currentTime = initialSeconds
    }

    // Determine if browser supports native HLS
    const canPlayNativeHLS = video.canPlayType('application/vnd.apple.mpegurl')
    
    if (canPlayNativeHLS && videoUrl.includes('.m3u8')) {
      // Use native HLS for Safari/iOS
      video.src = videoUrl
      
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration)
        setLoading(false)
      })

      video.addEventListener('timeupdate', () => {
        setCurrentTime(video.currentTime)
        handleProgress(video.currentTime, video.duration)
      })

      video.addEventListener('ended', () => {
        setIsPlaying(false)
        if (onComplete) onComplete(video)
      })

      video.addEventListener('play', () => setIsPlaying(true))
      video.addEventListener('pause', () => setIsPlaying(false))

    } else if (Hls.isSupported()) {
      // Use HLS.js for Android Chrome and other browsers
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      })

      hlsRef.current = hls
      hls.loadSource(videoUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setDuration(video.duration)
        setLoading(false)
      })

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError('Video loading failed')
          setLoading(false)
        }
      })

      video.addEventListener('timeupdate', () => {
        setCurrentTime(video.currentTime)
        handleProgress(video.currentTime, video.duration)
      })

      video.addEventListener('ended', () => {
        setIsPlaying(false)
        if (onComplete) onComplete(video)
      })

      video.addEventListener('play', () => setIsPlaying(true))
      video.addEventListener('pause', () => setIsPlaying(false))

    } else {
      // Fallback for browsers without HLS support
      video.src = videoUrl.replace('.m3u8', '.mp4')
      
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration)
        setLoading(false)
      })

      video.addEventListener('timeupdate', () => {
        setCurrentTime(video.currentTime)
        handleProgress(video.currentTime, video.duration)
      })

      video.addEventListener('ended', () => {
        setIsPlaying(false)
        if (onComplete) onComplete(video)
      })

      video.addEventListener('play', () => setIsPlaying(true))
      video.addEventListener('pause', () => setIsPlaying(false))
    }
  }, [videoUrl, initialSeconds, onComplete])

  // Handle progress saving
  const handleProgress = useCallback((currentSeconds, totalDuration) => {
    if (onProgress) {
      onProgress(currentSeconds, totalDuration)
    }
  }, [onProgress])

  // Auto-refresh signed URL before expiration (every 9 minutes)
  useEffect(() => {
    if (!videoUrl) return

    const refreshInterval = setInterval(() => {
      const currentTime = videoRef.current?.currentTime || 0
      const wasPlaying = !videoRef.current?.paused

      fetchVideoUrl().then(() => {
        // Restore playback position and state
        if (videoRef.current) {
          videoRef.current.currentTime = currentTime
          if (wasPlaying) {
            videoRef.current.play().catch(console.error)
          }
        }
      })
    }, 9 * 60 * 1000) // 9 minutes

    return () => clearInterval(refreshInterval)
  }, [videoUrl, fetchVideoUrl])

  // Initialize player when video URL is available
  useEffect(() => {
    if (videoUrl) {
      initializePlayer()
    }

    return () => {
      // Cleanup HLS instance
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [videoUrl, initializePlayer])

  // Fetch video URL on mount
  useEffect(() => {
    fetchVideoUrl()
  }, [fetchVideoUrl])

  // Format time display
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  // Handle seek
  const handleSeek = (e) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  // Handle play/pause
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(console.error)
      } else {
        videoRef.current.pause()
      }
    }
  }

  if (loading) {
    return (
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner-lg mx-auto mb-4"></div>
          <p className="text-white">Loading video...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="aspect-video bg-black rounded-lg flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-white mb-4">{error}</p>
          <button 
            onClick={fetchVideoUrl}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-black rounded-lg overflow-hidden">
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full aspect-video"
        controlsList="nodownload"
        disablePictureInPicture
        playsInline
        webkit-playsinline
      />

      {/* Custom Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress Bar */}
        <div className="mb-3">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #1D4ED8 0%, #1D4ED8 ${(currentTime / duration) * 100}%, #4B5563 ${(currentTime / duration) * 100}%, #4B5563 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-white mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Video Info */}
        {videoData && (
          <div className="text-white">
            <h3 className="font-semibold">{videoData.title}</h3>
            {videoData.duration_seconds && (
              <p className="text-sm text-gray-300">
                Duration: {formatTime(videoData.duration_seconds)}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white/20 backdrop-blur-sm rounded-full p-4 hover:bg-white/30 transition-colors"
      >
        {isPlaying ? (
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #1D4ED8;
          border-radius: 50%;
          cursor: pointer;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #1D4ED8;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  )
}
