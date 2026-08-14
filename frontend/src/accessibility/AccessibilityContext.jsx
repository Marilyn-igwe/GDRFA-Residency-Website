import { createContext } from 'preact'
import { useContext, useState, useEffect, useCallback } from 'preact/hooks'

// Site-wide accessibility state — text size and high-contrast mode — for
// "People of Determination" and anyone else who needs a bigger, clearer
// version of the page. Persisted so it sticks across visits, same pattern
// as the language choice in LanguageContext.
//
// Most of this app's CSS is written in fixed px, not rem, so scaling the
// root font-size alone would not cascade to it. `zoom` (widely supported
// in Chromium/Safari/WebKit-based browsers, and Firefox 126+) scales the
// whole rendered page the way native browser zoom does, which reliably
// enlarges everything — text, buttons, spacing — without needing every
// stylesheet in the app rewritten to rem units.

const SCALE_KEY = 'gdrfa_a11y_scale'
const CONTRAST_KEY = 'gdrfa_a11y_contrast'

export const SCALE_LEVELS = ['normal', 'large', 'xlarge']
const SCALE_ZOOM = { normal: 1, large: 1.15, xlarge: 1.3 }

export const AccessibilityContext = createContext({
  scale: 'normal',
  setScale: () => {},
  increaseTextSize: () => {},
  decreaseTextSize: () => {},
  resetTextSize: () => {},
  highContrast: false,
  toggleHighContrast: () => {},
  zoomValue: 1,
})

export function useAccessibility() {
  return useContext(AccessibilityContext)
}

export function AccessibilityProvider({ children }) {
  const [scale, setScale] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(SCALE_KEY)) || 'normal'
  )
  const [highContrast, setHighContrast] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(CONTRAST_KEY) === '1'
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(SCALE_KEY, scale)
  }, [scale])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(CONTRAST_KEY, highContrast ? '1' : '0')
  }, [highContrast])

  const increaseTextSize = useCallback(() => {
    setScale((prev) => {
      const idx = SCALE_LEVELS.indexOf(prev)
      return SCALE_LEVELS[Math.min(idx + 1, SCALE_LEVELS.length - 1)]
    })
  }, [])

  const decreaseTextSize = useCallback(() => {
    setScale((prev) => {
      const idx = SCALE_LEVELS.indexOf(prev)
      return SCALE_LEVELS[Math.max(idx - 1, 0)]
    })
  }, [])

  const resetTextSize = useCallback(() => setScale('normal'), [])
  const toggleHighContrast = useCallback(() => setHighContrast((prev) => !prev), [])

  const value = {
    scale,
    setScale,
    increaseTextSize,
    decreaseTextSize,
    resetTextSize,
    highContrast,
    toggleHighContrast,
    zoomValue: SCALE_ZOOM[scale] || 1,
  }

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}
