import { useCallback, useEffect, useRef, useState } from 'react'
import './PotrdiloVnosModal.css'

const URL_PREVERI = 'https://www.loterija.si/preveri-potrdilo'

type Props = {
  open: boolean
  onClose: () => void
  onSubmit7: (potrdilo: string) => void
}

/**
 * 7 enomestna polja — kot na uradni strani Preveri potrdilo.
 * Mobil: cel zaslon; večje zaslone: središče modala.
 */
export function PotrdiloVnosModal({ open, onClose, onSubmit7 }: Props) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '', ''])
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const reset = useCallback(() => {
    setDigits(['', '', '', '', '', '', ''])
  }, [])

  useEffect(() => {
    if (open) {
      reset()
      requestAnimationFrame(() => {
        inputsRef.current[0]?.focus()
      })
    }
  }, [open, reset])

  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', h)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  const setAt = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 1)
    setDigits((prev) => {
      const next = [...prev]
      next[i] = d
      return next
    })
    if (d && i < 6) {
      requestAnimationFrame(() => inputsRef.current[i + 1]?.focus())
    }
  }

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputsRef.current[i - 1]?.focus()
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      trySubmit()
    }
  }

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const t = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 7)
    if (t.length === 0) return
    const next = t.split('').slice(0, 7) as string[]
    while (next.length < 7) next.push('')
    setDigits(next)
    const nextIdx = Math.min(6, t.length)
    requestAnimationFrame(() => inputsRef.current[nextIdx]?.focus())
  }

  const trySubmit = () => {
    const s = digits.join('').replace(/\D/g, '')
    if (s.length === 7) {
      onSubmit7(s)
      reset()
      onClose()
    }
  }

  const s = digits.join('').replace(/\D/g, '')
  const canSubmit = s.length === 7

  if (!open) return null

  return (
    <div
      className="potrdilo-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="potrdilo-modal-title"
    >
      <div className="potrdilo-modal__scrim" onClick={onClose} role="presentation" />
      <div className="potrdilo-modal__panel">
        <button
          type="button"
          className="potrdilo-modal__close"
          onClick={onClose}
          aria-label="Zapri"
        >
          ×
        </button>
        <h2 id="potrdilo-modal-title" className="potrdilo-modal__title">
          Vnesi številko potrdila
        </h2>
        <p className="potrdilo-modal__lead">
          7-mestno številko potrdila o vplačilu, kot zgoraj na listku. Podrobnosti:{' '}
          <a href={URL_PREVERI} target="_blank" rel="noreferrer" className="potrdilo-modal__link">
            Preveri potrdilo
          </a>
          . Podatke preverite še na tisku.
        </p>
        <div className="potrdilo-row" onPaste={onPaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputsRef.current[i] = el
              }}
              className="potrdilo-box"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={d}
              aria-label={`Številka ${i + 1} od 7`}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          ))}
        </div>
        <p className="potrdilo-hint" role="status">
          {s.length} / 7
        </p>
        <div className="potrdilo-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Prekliči
          </button>
          <button
            type="button"
            className="btn"
            onClick={trySubmit}
            disabled={!canSubmit}
          >
            Potrdi
          </button>
        </div>
      </div>
    </div>
  )
}
