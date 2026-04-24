import { useCallback, useEffect, useState } from 'react'
import type { RezultatiResponse } from './rezultatiTypes'

export function useRezultati() {
  const [data, setData] = useState<RezultatiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const base = import.meta.env.VITE_API_BASE ?? ''

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch(`${base}/api/rezultati`)
      if (!r.ok) {
        const body = await r.text()
        let msg = r.statusText
        try {
          const j = JSON.parse(body) as { detail?: string }
          if (j.detail) msg = j.detail
        } catch {
          if (body) msg = body.slice(0, 240)
        }
        throw new Error(msg)
      }
      setData((await r.json()) as RezultatiResponse)
    } catch (e) {
      setData(null)
      setError(
        e instanceof Error
          ? e.message
          : 'Strežnik z rezultati ni na voljo. Poženite: npm run dev:all (API na vratih 8000).'
      )
    } finally {
      setLoading(false)
    }
  }, [base])

  useEffect(() => {
    void load()
  }, [load])

  return { data, error, loading, refresh: load }
}
