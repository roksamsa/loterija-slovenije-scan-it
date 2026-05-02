import { useCallback, useEffect, useRef, useState } from 'react'

type FocusPoint = { x: number; y: number }
type CameraFacing = 'user' | 'environment'

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

function rearCameraScore(device: MediaDeviceInfo): number {
  const label = device.label.toLowerCase()
  let score = 0

  if (/(front|user|selfie|spred)/.test(label)) return -100
  if (/(back|rear|environment|zadn)/.test(label)) score += 40
  if (/(main|standard|0\b|camera 0)/.test(label)) score += 12
  if (/(ultra\s?wide|ultrawide)/.test(label)) score -= 24
  if (/(tele|depth|tof)/.test(label)) score -= 18
  if (/wide/.test(label)) score -= 8

  return score
}

function sortedRearCameras(devices: MediaDeviceInfo[]): MediaDeviceInfo[] {
  const videoInputs = devices.filter((device) => device.kind === 'videoinput')
  const labeledRear = videoInputs.filter((device) => rearCameraScore(device) > -100)
  const candidates = labeledRear.length > 0 ? labeledRear : videoInputs

  return [...candidates].sort((a, b) => rearCameraScore(b) - rearCameraScore(a))
}

function cameraConstraints(
  facing: CameraFacing,
  deviceId?: string,
): MediaTrackConstraints {
  const advanced: FocusConstraintSet[] = [{ focusMode: 'continuous' }]

  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: facing } }),
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    advanced,
  } as MediaTrackConstraints
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
  const rearDevicesRef = useRef<MediaDeviceInfo[]>([])
  const rearDeviceIndexRef = useRef(0)
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const refreshRearDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return []

    const rearDevices = sortedRearCameras(await navigator.mediaDevices.enumerateDevices())
    rearDevicesRef.current = rearDevices
    if (rearDeviceIndexRef.current >= rearDevices.length) {
      rearDeviceIndexRef.current = 0
    }
    return rearDevices
  }, [])

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

  const start = useCallback(async (facing: CameraFacing = 'environment', deviceId?: string) => {
    setError(null)
    setReady(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    try {
      let selectedDeviceId = deviceId
      if (facing === 'environment' && !selectedDeviceId) {
        const rearDevices = await refreshRearDevices()
        selectedDeviceId = rearDevices[rearDeviceIndexRef.current]?.deviceId
      }

      let s = await navigator.mediaDevices.getUserMedia({
        video: cameraConstraints(facing, selectedDeviceId),
        audio: false,
      })

      if (facing === 'environment') {
        const rearDevices = await refreshRearDevices()
        const currentDeviceId = s.getVideoTracks()[0]?.getSettings().deviceId
        const preferredDeviceId = selectedDeviceId ?? rearDevices[rearDeviceIndexRef.current]?.deviceId

        if (preferredDeviceId && currentDeviceId && currentDeviceId !== preferredDeviceId) {
          s.getTracks().forEach((track) => track.stop())
          s = await navigator.mediaDevices.getUserMedia({
            video: cameraConstraints(facing, preferredDeviceId),
            audio: false,
          })
        }
      }

      streamRef.current = s
      const track = s.getVideoTracks()[0]
      if (track && facing === 'environment') {
        void applyImageCaptureFocus(track, ['continuous', 'single-shot'])
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
  }, [refreshRearDevices])

  const cycleRearCamera = useCallback(async () => {
    const rearDevices = await refreshRearDevices()
    if (rearDevices.length <= 1) return false

    rearDeviceIndexRef.current = (rearDeviceIndexRef.current + 1) % rearDevices.length
    await start('environment', rearDevices[rearDeviceIndexRef.current]?.deviceId)
    return true
  }, [refreshRearDevices, start])

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

  return { videoRef, start, stop, refocus, cycleRearCamera, error, ready }
}
