import { useCallback, useEffect, useRef, useState } from 'react'

type FocusPoint = { x: number; y: number }

type FocusCapabilities = MediaTrackCapabilities & {
  focusMode?: string[]
}

type FocusConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string
  pointsOfInterest?: FocusPoint[]
}

async function applyFocusConstraints(
  track: MediaStreamTrack,
  modes: string[],
  point?: FocusPoint,
): Promise<boolean> {
  if (typeof track.getCapabilities !== 'function') return false

  const capabilities = track.getCapabilities() as FocusCapabilities
  const focusMode = modes.find((mode) => capabilities.focusMode?.includes(mode))
  const focusConstraints: FocusConstraintSet = {}

  if (focusMode) {
    focusConstraints.focusMode = focusMode
  }
  if (point) {
    focusConstraints.pointsOfInterest = [point]
  }
  if (!focusConstraints.focusMode && !focusConstraints.pointsOfInterest) {
    return false
  }

  try {
    await track.applyConstraints({
      advanced: [focusConstraints],
    } as MediaTrackConstraints)
    return true
  } catch {
    return false
  }
}

export function useCameraStream() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const refocus = useCallback(async (point?: FocusPoint) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return false

    return applyFocusConstraints(track, ['single-shot', 'continuous', 'manual'], point)
  }, [])

  const start = useCallback(async (facing: 'user' | 'environment' = 'environment') => {
    setError(null)
    setReady(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      streamRef.current = s
      const track = s.getVideoTracks()[0]
      if (track && facing === 'environment') {
        void applyFocusConstraints(track, ['continuous', 'single-shot'])
      }
      const v = videoRef.current
      if (v) {
        v.srcObject = s
        await v.play()
        setReady(true)
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Ne morem odpreti kamere.'
      setError(msg)
    }
  }, [])

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setReady(false)
  }, [])

  useEffect(() => {
    return () => stop()
  }, [stop])

  return { videoRef, start, stop, refocus, error, ready }
}
