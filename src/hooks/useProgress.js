import { useState, useEffect, useRef, useCallback } from 'react'
import { api, normalizeApiError } from '../lib/api.jsx'

export function useProgress(videoId, courseId) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState(null)
  
  const lastSaveTime = useRef(0)
  const saveTimeoutRef = useRef(null)
  const videoRef = useRef(null)

  // Debounced progress saving
  const saveProgress = useCallback(async (seconds, totalDuration) => {
    // Only save every 30 seconds
    if (seconds - lastSaveTime.current < 30) {
      return
    }

    try {
      setIsSaving(true)
      setError(null)

      const data = await api.post('/save-progress', {
        video_id: videoId,
        seconds_watched: Math.floor(seconds)
      })
      
      // Update completion status
      if (data.progress.completed && !isCompleted) {
        setIsCompleted(true)
      }

      lastSaveTime.current = seconds

    } catch (err) {
      setError(normalizeApiError(err))
      console.error('Progress save error:', err)
    } finally {
      setIsSaving(false)
    }
  }, [videoId, isCompleted])

  // Handle time update
  const handleTimeUpdate = useCallback((seconds, totalDuration) => {
    setCurrentTime(seconds)
    setDuration(totalDuration || 0)

    // Check if completed (90% threshold)
    if (totalDuration > 0 && seconds >= totalDuration * 0.9) {
      if (!isCompleted) {
        setIsCompleted(true)
        // Save final progress immediately
        saveProgress(seconds, totalDuration)
      }
    } else {
      // Debounced save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveProgress(seconds, totalDuration)
      }, 1000) // Debounce for 1 second, but will only save every 30 seconds
    }
  }, [saveProgress, isCompleted])

  // Handle video complete
  const handleComplete = useCallback(() => {
    if (!isCompleted) {
      setIsCompleted(true)
      // Mark as complete
      saveProgress(duration, duration)
    }
  }, [duration, isCompleted, saveProgress])

  // Get completion percentage
  const getCompletionPercentage = useCallback(() => {
    if (duration === 0) return 0
    return Math.min(Math.round((currentTime / duration) * 100), 100)
  }, [currentTime, duration])

  // Get formatted time
  const getFormattedTime = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }, [])

  // Reset progress
  const resetProgress = useCallback(() => {
    setCurrentTime(0)
    setDuration(0)
    setIsCompleted(false)
    setError(null)
    lastSaveTime.current = 0
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  // Manual save trigger
  const forceSave = useCallback(async () => {
    await saveProgress(currentTime, duration)
  }, [currentTime, duration, saveProgress])

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    currentTime,
    duration,
    isCompleted,
    isSaving,
    error,
    completionPercentage: getCompletionPercentage(),
    formattedCurrentTime: getFormattedTime(currentTime),
    formattedDuration: getFormattedTime(duration),
    handleTimeUpdate,
    handleComplete,
    resetProgress,
    forceSave
  }
}

/**
 * Custom hook for video player controls
 */
export function useVideoPlayer(videoId, courseId, initialSeconds = 0) {
  const progress = useProgress(videoId, courseId)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Play/pause toggle
  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev)
  }, [])

  // Volume control
  const handleVolumeChange = useCallback((newVolume) => {
    setVolume(Math.max(0, Math.min(1, newVolume)))
  }, [])

  // Playback rate control
  const handlePlaybackRateChange = useCallback((rate) => {
    setPlaybackRate(rate)
  }, [])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
  }, [])

  // Seek to specific time
  const seekTo = useCallback((seconds) => {
    progress.setCurrentTime(Math.max(0, Math.min(seconds, progress.duration)))
  }, [progress.duration])

  // Skip forward/backward
  const skip = useCallback((seconds) => {
    const newTime = progress.currentTime + seconds
    seekTo(Math.max(0, Math.min(newTime, progress.duration)))
  }, [progress.currentTime, progress.duration, seekTo])

  return {
    ...progress,
    isPlaying,
    volume,
    playbackRate,
    isFullscreen,
    togglePlayPause,
    handleVolumeChange,
    handlePlaybackRateChange,
    toggleFullscreen,
    seekTo,
    skip
  }
}

/**
 * Hook for keyboard shortcuts
 */
export function useVideoKeyboard(player) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Only handle when not typing in input fields
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return
      }

      switch (event.key) {
        case ' ':
        case 'k':
          event.preventDefault()
          player.togglePlayPause()
          break
        case 'ArrowLeft':
          event.preventDefault()
          player.skip(-10)
          break
        case 'ArrowRight':
          event.preventDefault()
          player.skip(10)
          break
        case 'ArrowUp':
          event.preventDefault()
          player.handleVolumeChange(Math.min(1, player.volume + 0.1))
          break
        case 'ArrowDown':
          event.preventDefault()
          player.handleVolumeChange(Math.max(0, player.volume - 0.1))
          break
        case 'f':
          event.preventDefault()
          player.toggleFullscreen()
          break
        case 'm':
          event.preventDefault()
          player.handleVolumeChange(player.volume > 0 ? 0 : 1)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [player])
}
