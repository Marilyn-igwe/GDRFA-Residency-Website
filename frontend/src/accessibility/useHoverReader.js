import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

// Reading Assistance v2 -- one on/off toggle instead of Play/Pause/Stop,
// highlighting always on (it's not really optional once hover-reading is
// running), and a live caption of the current phrase so the panel feels
// responsive rather than a silent black box while you explore the page.

const FULL_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,button,a,label,li,td,th,summary,legend'
const MAIN_CONTENT_SELECTOR = 'h1,h2,h3,h4,h5,h6,p'
const HIGHLIGHT_CLASS = 'gd-a11y-hover-highlight'

export function useHoverReader() {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const [active, setActive] = useState(false)
  const [rate, setRate] = useState(1)
  const [mainContentOnly, setMainContentOnly] = useState(false)
  const [currentText, setCurrentText] = useState('')

  const activeRef = useRef(false)
  const rateRef = useRef(1)
  const mainContentOnlyRef = useRef(false)
  const langRef = useRef('en-US')
  const lastTargetRef = useRef(null)
  const highlightedElRef = useRef(null)

  activeRef.current = active
  rateRef.current = rate
  mainContentOnlyRef.current = mainContentOnly

  const clearHighlight = useCallback(() => {
    highlightedElRef.current?.classList.remove(HIGHLIGHT_CLASS)
    highlightedElRef.current = null
  }, [])

  const handleMouseOver = useCallback((e) => {
    if (!activeRef.current) return
    const appEl = document.querySelector('.app')
    if (!appEl) return

    const selector = mainContentOnlyRef.current ? MAIN_CONTENT_SELECTOR : FULL_SELECTOR
    const target = e.target.closest(selector)
    if (!target || !appEl.contains(target)) return
    if (target === lastTargetRef.current) return
    lastTargetRef.current = target

    clearHighlight()
    target.classList.add(HIGHLIGHT_CLASS)
    highlightedElRef.current = target

    // aria-label covers icon-only buttons (like this widget's own FAB)
    // that have little or no visible text of their own.
    const rawText = (target.getAttribute('aria-label') || target.innerText || target.textContent || '').trim()
    // Strip emoji/pictographic characters -- most speech engines either
    // garble them or announce their literal Unicode name ("person
    // raising hand"), which is confusing noise, not content.
    const text = rawText.replace(/\p{Extended_Pictographic}/gu, '').replace(/\s+/g, ' ').trim()
    if (!text) {
      setCurrentText('')
      return
    }

    setCurrentText(text)
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = langRef.current
    utterance.rate = rateRef.current
    window.speechSynthesis.speak(utterance)
  }, [clearHighlight])

  useEffect(() => {
    if (!active) return
    document.addEventListener('mouseover', handleMouseOver)
    return () => document.removeEventListener('mouseover', handleMouseOver)
  }, [active, handleMouseOver])

  const start = useCallback(
    (lang) => {
      if (!supported) return
      langRef.current = lang
      setActive(true)
    },
    [supported]
  )

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    lastTargetRef.current = null
    clearHighlight()
    setActive(false)
    setCurrentText('')
  }, [supported, clearHighlight])

  const toggle = useCallback(
    (lang) => {
      if (active) stop()
      else start(lang)
    },
    [active, start, stop]
  )

  // Changing this mid-session would leave a stale highlight/caption from
  // an element that no longer matches -- clearest to just drop it and let
  // the next hover pick fresh.
  const changeMainContentOnly = useCallback(
    (value) => {
      setMainContentOnly(value)
      lastTargetRef.current = null
      clearHighlight()
      setCurrentText('')
    },
    [clearHighlight]
  )

  return {
    supported,
    active,
    rate,
    setRate,
    mainContentOnly,
    setMainContentOnly: changeMainContentOnly,
    currentText,
    toggle,
  }
}
