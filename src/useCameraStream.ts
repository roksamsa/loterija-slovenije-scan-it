import { useCallback, useEffect, useRef, useState } from 'react'

export function useCameraStream() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

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

  return { videoRef, start, stop, error, ready }
}
