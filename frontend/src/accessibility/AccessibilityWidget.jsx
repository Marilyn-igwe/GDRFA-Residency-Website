import { useState, useRef, useEffect } from 'preact/hooks'
import { useAccessibility, SCALE_LEVELS } from './AccessibilityContext'
import { useHoverReader } from './useHoverReader'
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

const SPEEDS = [
  { value: 0.75, icon: '🐢' },
  { value: 1, icon: '🚶' },
  { value: 1.5, icon: '🐇' },
]

function Switch({ checked, onChange, label }) {
  return (
    <button
      type="button"
      class={`gd-a11y-switch-track ${checked ? 'on' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span class="gd-a11y-switch-thumb" />
    </button>
  )
}

export function AccessibilityWidget() {
  const { code, accessibility } = useLanguage()
  // Falls back to English if a translation hasn't been added for this
  // language yet -- same convention as every other translated surface.
  const at = accessibility || {}
  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)

  const { scale, setScale, highContrast, toggleHighContrast } = useAccessibility()
  const reader = useHoverReader()

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const lang = SPEECH_LANG[code] || 'en-US'
  const previewScaleClass = scale !== 'normal' ? `gd-a11y-preview-${scale}` : ''

  return (
    <div id="gd-a11y-widget-root" class={`gd-a11y-widget-root gd-a11y-root ${open ? 'open' : ''}`} ref={panelRef}>
      {open && (
        <div class="gd-a11y-panel" role="dialog" aria-label={at.panelTitle || 'Accessibility'}>
          <div class="gd-a11y-panel-header">
            <strong class="gd-a11y-panel-title">{at.panelTitle || 'Accessibility'}</strong>
            <button type="button" class="gd-a11y-close-btn" aria-label={at.closeLabel || 'Close'} onClick={() => setOpen(false)}>
              ×
            </button>
          </div>

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
              <span class={`gd-a11y-size-preview ${previewScaleClass}`} aria-hidden="true">Aa</span>
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

          <div class="gd-a11y-row">
            <span class="gd-a11y-row-label">
              <span class="gd-a11y-icon" aria-hidden="true">◐</span> {at.highContrast || 'High contrast'}
            </span>
            <Switch checked={highContrast} onChange={toggleHighContrast} label={at.highContrast || 'High contrast'} />
          </div>

          {reader.supported && (
            <div class="gd-a11y-reading-section">
              <div class="gd-a11y-row">
                <span class="gd-a11y-row-label">
                  <span class="gd-a11y-icon" aria-hidden="true">🔊</span> {at.hoverToRead || 'Hover to read'}
                </span>
                <Switch checked={reader.active} onChange={() => reader.toggle(lang)} label={at.hoverToRead || 'Hover to read'} />
              </div>

              {reader.active ? (
                <div class="gd-a11y-caption">
                  <span class="gd-a11y-caption-dot" aria-hidden="true" />
                  {reader.currentText ? (
                    <span>{reader.currentText}</span>
                  ) : (
                    <span class="gd-a11y-caption-placeholder">
                      {at.hoverHint || 'Move your mouse over any text to hear it.'}
                    </span>
                  )}
                </div>
              ) : (
                <p class="gd-a11y-reading-subtext">{at.hoverToReadHelp || 'Turn this on, then move your mouse over anything to hear it read aloud.'}</p>
              )}

              <div class="gd-a11y-row gd-a11y-speed-row">
                <span class="gd-a11y-row-label">{at.speed || 'Speed'}</span>
                <div class="gd-a11y-speed-controls">
                  {SPEEDS.map(({ value, icon }) => (
                    <button
                      type="button"
                      key={value}
                      class={`gd-a11y-speed-btn ${reader.rate === value ? 'active' : ''}`}
                      onClick={() => reader.setRate(value)}
                      aria-label={value === 0.75 ? at.speedSlow || 'Slow' : value === 1 ? at.speedNormal || 'Normal' : at.speedFast || 'Fast'}
                    >
                      <span aria-hidden="true">{icon}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label class="gd-a11y-checkbox-row">
                <input
                  type="checkbox"
                  checked={reader.mainContentOnly}
                  onChange={(e) => reader.setMainContentOnly(e.target.checked)}
                />
                {at.mainContentOnly || 'Skip buttons and links'}
              </label>
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
