import { useCallback, useEffect, useRef, useState } from 'react'

type FocusPoint = { x: number; y: number }

type FocusCapabilities = MediaTrackCapabilities & {
  focusMode?: string[]
}

type FocusConstraintSet = MediaTrackConstraintSet & {
  focusMode?: string
  pointsOfInterest?: FocusPoint[]
}

type ImageCaptureLike = {
  setOptions?: (settings: FocusConstraintSet) => Promise<void>
}

type WindowWithImageCapture = Window &
  typeof globalThis & {
    ImageCapture?: new (track: MediaStreamTrack) => ImageCaptureLike
  }

function getSupportedFocusModes(track: MediaStreamTrack, modes: string[]): string[] {
  if (typeof track.getCapabilities !== 'function') return modes

  const capabilities = track.getCapabilities() as FocusCapabilities
  if (!capabilities.focusMode?.length) return modes

  return modes.filter((mode) => capabilities.focusMode?.includes(mode))
}

async function applyImageCaptureFocus(
  track: MediaStreamTrack,
  modes: string[],
  point?: FocusPoint,
): Promise<boolean> {
  const ImageCaptureCtor = (window as WindowWithImageCapture).ImageCapture
  if (!ImageCaptureCtor) return false

  const capture = new ImageCaptureCtor(track)
  if (!capture.setOptions) return false

  for (const focusMode of getSupportedFocusModes(track, modes)) {
    try {
      await capture.setOptions({
        focusMode,
        ...(point ? { pointsOfInterest: [point] } : {}),
      })
      return true
    } catch {
      // Try the next mode/fallback. Android devices differ per camera module.
    }
  }

  return false
}

async function applyFocusConstraints(
  track: MediaStreamTrack,
  modes: string[],
  point?: FocusPoint,
): Promise<boolean> {
  for (const focusMode of getSupportedFocusModes(track, modes)) {
    const focusConstraints: FocusConstraintSet = {
      focusMode,
      ...(point ? { pointsOfInterest: [point] } : {}),
    }

    try {
      await track.applyConstraints({
        advanced: [focusConstraints],
      } as MediaTrackConstraints)
      return true
    } catch {
      // Continue with the next focus mode before giving up.
    }
  }

  return false
}

export function useCameraStream() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const refocus = useCallback(async (point?: FocusPoint) => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return false

    const modes = ['single-shot', 'continuous', 'manual']
    const focused =
      (await applyImageCaptureFocus(track, modes, point)) ||
      (await applyFocusConstraints(track, modes, point))

    if (focused) {
      window.setTimeout(() => {
        void applyFocusConstraints(track, ['continuous'])
      }, 900)
    }

    return focused
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
