import { useState, useRef, useEffect } from 'preact/hooks'
import { useAccessibility, SCALE_LEVELS } from './AccessibilityContext'
import { usePageReader } from './usePageReader'
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

const SPEEDS = [0.75, 1, 1.25, 1.5]

export function AccessibilityWidget() {
  const { code, accessibility } = useLanguage()
  // Falls back to English if a translation hasn't been added for this
  // language yet -- same convention as every other translated surface.
  const at = accessibility || {}
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const transcriptRef = useRef(null)

  const { scale, setScale, highContrast, toggleHighContrast } = useAccessibility()
  const reader = usePageReader()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Keep the highlighted sentence scrolled into view as reading progresses.
  useEffect(() => {
    if (!reader.highlightEnabled || reader.chunkIndex < 0 || !transcriptRef.current) return
    const activeEl = transcriptRef.current.querySelector('.gd-a11y-transcript-active')
    activeEl?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [reader.chunkIndex, reader.highlightEnabled])

  const lang = SPEECH_LANG[code] || 'en-US'
  const showTranscript = reader.highlightEnabled && reader.status !== 'idle' && reader.chunks.length > 0

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

          {reader.supported && (
            <div class="gd-a11y-reading-section">
              <strong class="gd-a11y-reading-title">
                <span aria-hidden="true">🔊</span> {at.readingAssistance || 'Reading Assistance'}
              </strong>

              <div class="gd-a11y-playback-row">
                <button
                  type="button"
                  class={`gd-a11y-play-btn ${reader.status === 'playing' ? 'active' : ''}`}
                  onClick={() => reader.play(lang)}
                  disabled={reader.status === 'playing'}
                >
                  <span aria-hidden="true">▶</span> {at.play || 'Play'}
                </button>
                <button
                  type="button"
                  class="gd-a11y-play-btn"
                  onClick={reader.pause}
                  disabled={reader.status !== 'playing'}
                >
                  <span aria-hidden="true">⏸</span> {at.pause || 'Pause'}
                </button>
                <button
                  type="button"
                  class="gd-a11y-play-btn"
                  onClick={reader.stop}
                  disabled={reader.status === 'idle'}
                >
                  <span aria-hidden="true">⏹</span> {at.stop || 'Stop'}
                </button>
              </div>

              <div class="gd-a11y-row gd-a11y-speed-row">
                <span class="gd-a11y-row-label">{at.speed || 'Speed'}</span>
                <div class="gd-a11y-speed-controls">
                  {SPEEDS.map((s) => (
                    <button
                      type="button"
                      key={s}
                      class={`gd-a11y-speed-btn ${reader.rate === s ? 'active' : ''}`}
                      onClick={() => reader.setRate(s)}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
              </div>

              <label class="gd-a11y-checkbox-row">
                <input
                  type="checkbox"
                  checked={reader.highlightEnabled}
                  onChange={(e) => reader.setHighlightEnabled(e.target.checked)}
                />
                {at.highlightWhileReading || 'Highlight text while reading'}
              </label>

              <label class="gd-a11y-checkbox-row">
                <input
                  type="checkbox"
                  checked={reader.importantOnly}
                  onChange={(e) => reader.setImportantOnly(e.target.checked)}
                />
                {at.importantOnly || 'Read only important information'}
              </label>

              {showTranscript && (
                <div class="gd-a11y-transcript" ref={transcriptRef}>
                  {reader.chunks.map((sentence, i) => (
                    <span
                      key={i}
                      class={i === reader.chunkIndex ? 'gd-a11y-transcript-active' : ''}
                    >
                      {sentence}{' '}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
