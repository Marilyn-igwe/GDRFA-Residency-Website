import { useState, useRef, useEffect } from 'preact/hooks'
import { useAccessibility, SCALE_LEVELS } from './AccessibilityContext'
import { useSpeechSynthesis } from '../assistant/useSpeech'
import { useLanguage } from '../language/LanguageContext'
import './accessibility.css'

// Speech-synthesis voices are picked by BCP-47 tag, not our short app
// language codes, so map between the two.
const SPEECH_LANG = {
  en: 'en-US',
  ar: 'ar-AE',
  hi: 'hi-IN',
  tl: 'fil-PH',
  ur: 'ur-PK',
  bn: 'bn-BD',
}

// Pulls the visible page text, minus this widget and the chat popup (its
// own content only matters once opened, and doubling it into the read-
// aloud pass would just be noise), collapses whitespace, and hands back
// something SpeechSynthesis can read as a reasonably natural page summary.
function getReadablePageText() {
  const appEl = document.querySelector('.app')
  if (!appEl) return ''
  const clone = appEl.cloneNode(true)
  clone.querySelectorAll('#gd-a11y-widget-root, .chat-widget, script, style, input, textarea').forEach((el) => el.remove())
  return (clone.textContent || '').replace(/\s+/g, ' ').trim()
}

export function AccessibilityWidget() {
  const { code, accessibility } = useLanguage()
  // Falls back to English if a translation hasn't been added for this
  // language yet — same convention as every other translated surface.
  const at = accessibility || {}
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const { scale, setScale, highContrast, toggleHighContrast } = useAccessibility()
  const { supported: speechSupported, speaking, speak, cancel } = useSpeechSynthesis()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function handleReadAloud() {
    if (speaking) {
      cancel()
      return
    }
    const text = getReadablePageText()
    if (text) speak(text, { lang: SPEECH_LANG[code] || 'en-US' })
  }

  return (
    <div id="gd-a11y-widget-root" class={`gd-a11y-root ${open ? 'open' : ''}`} ref={panelRef}>
      {open && (
        <div class="gd-a11y-panel" role="dialog" aria-label={at.panelTitle || 'Accessibility'}>
          <strong class="gd-a11y-panel-title">{at.panelTitle || 'Accessibility'}</strong>

          <div class="gd-a11y-row">
            <span class="gd-a11y-row-label">{at.textSize || 'Text size'}</span>
            <div class="gd-a11y-textsize-controls">
              <button
                type="button"
                class="gd-a11y-btn-small"
                aria-label={at.decreaseText || 'Smaller text'}
                onClick={() => {
                  const idx = SCALE_LEVELS.indexOf(scale)
                  setScale(SCALE_LEVELS[Math.max(idx - 1, 0)])
                }}
                disabled={scale === SCALE_LEVELS[0]}
              >
                A<span class="gd-a11y-minus">−</span>
              </button>
              <button
                type="button"
                class="gd-a11y-btn-small"
                aria-label={at.increaseText || 'Bigger text'}
                onClick={() => {
                  const idx = SCALE_LEVELS.indexOf(scale)
                  setScale(SCALE_LEVELS[Math.min(idx + 1, SCALE_LEVELS.length - 1)])
                }}
                disabled={scale === SCALE_LEVELS[SCALE_LEVELS.length - 1]}
              >
                A<span class="gd-a11y-plus">+</span>
              </button>
            </div>
          </div>

          <button type="button" class={`gd-a11y-toggle-row ${highContrast ? 'active' : ''}`} onClick={toggleHighContrast}>
            <span class="gd-a11y-icon" aria-hidden="true">◐</span>
            <span>{at.highContrast || 'High contrast'}</span>
            <span class="gd-a11y-switch">{highContrast ? (at.on || 'On') : (at.off || 'Off')}</span>
          </button>

          {speechSupported && (
            <button type="button" class={`gd-a11y-toggle-row ${speaking ? 'active' : ''}`} onClick={handleReadAloud}>
              <span class="gd-a11y-icon" aria-hidden="true">{speaking ? '⏹' : '🔊'}</span>
              <span>{speaking ? (at.stopReading || 'Stop reading') : (at.readAloud || 'Read this page aloud')}</span>
            </button>
          )}

          <p class="gd-a11y-hint">
            {at.talkHint || "Can't type? Open the chat bubble and tap the microphone to talk instead."}
          </p>
        </div>
      )}

      <button
        type="button"
        class="gd-a11y-fab"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={at.openLabel || 'Accessibility options'}
        aria-expanded={open}
      >
        <span aria-hidden="true">♿</span>
      </button>
    </div>
  )
}
