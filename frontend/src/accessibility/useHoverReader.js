import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

// "Reading Assistance", take two: reading the whole page start-to-finish
// turned out to be confusing (no way to know what's coming, easy to lose
// your place). This instead speaks whatever single element the mouse is
// currently over — move over a heading, a card, a link, or a paragraph and
// it reads just that piece, out loud, immediately.
//
// The visual highlight lives on the actual hovered element (via a CSS
// class toggled imperatively, not through Preact state), which is safe
// here in a way that highlighting arbitrary spoken TEXT wasn't: we're
// never splitting or rewriting an element's children, just toggling one
// class on an element that already exists in Preact's tree. Worst case on
// a rare re-render is the outline flickers off, not a broken page.

const FULL_SELECTOR = 'h1,h2,h3,h4,h5,h6,p,button,a,label,li,td,th,summary,legend'
const IMPORTANT_SELECTOR = 'h1,h2,h3,h4,h5,h6,p'
const HIGHLIGHT_CLASS = 'gd-a11y-hover-highlight'

export function useHoverReader() {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  // 'idle' | 'active' | 'paused'
  const [status, setStatus] = useState('idle')
  const [rate, setRate] = useState(1)
  const [importantOnly, setImportantOnly] = useState(false)
  const [highlightEnabled, setHighlightEnabled] = useState(true)

  const statusRef = useRef('idle')
  const rateRef = useRef(1)
  const importantOnlyRef = useRef(false)
  const highlightEnabledRef = useRef(true)
  const langRef = useRef('en-US')
  const lastTargetRef = useRef(null)
  const highlightedElRef = useRef(null)

  statusRef.current = status
  rateRef.current = rate
  importantOnlyRef.current = importantOnly
  highlightEnabledRef.current = highlightEnabled

  const clearHighlight = useCallback(() => {
    highlightedElRef.current?.classList.remove(HIGHLIGHT_CLASS)
    highlightedElRef.current = null
  }, [])

  const handleMouseOver = useCallback((e) => {
    if (statusRef.current !== 'active') return
    const appEl = document.querySelector('.app')
    if (!appEl) return

    const selector = importantOnlyRef.current ? IMPORTANT_SELECTOR : FULL_SELECTOR
    const target = e.target.closest(selector)
    if (!target || !appEl.contains(target)) return
    if (target === lastTargetRef.current) return
    lastTargetRef.current = target

    clearHighlight()
    if (highlightEnabledRef.current) {
      target.classList.add(HIGHLIGHT_CLASS)
      highlightedElRef.current = target
    }

    // aria-label covers icon-only buttons (like this widget's own FAB)
    // that have little or no visible text of their own.
    const text = (target.getAttribute('aria-label') || target.innerText || target.textContent || '').trim()
    if (!text) return

    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = langRef.current
    utterance.rate = rateRef.current
    window.speechSynthesis.speak(utterance)
  }, [clearHighlight])

  useEffect(() => {
    if (status !== 'active') return
    document.addEventListener('mouseover', handleMouseOver)
    return () => document.removeEventListener('mouseover', handleMouseOver)
  }, [status, handleMouseOver])

  const start = useCallback(
    (lang) => {
      if (!supported) return
      langRef.current = lang
      setStatus('active')
    },
    [supported]
  )

  const resume = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.resume()
    setStatus('active')
  }, [supported])

  const play = useCallback(
    (lang) => {
      if (status === 'paused') resume()
      else start(lang)
    },
    [status, start, resume]
  )

  const pause = useCallback(() => {
    if (!supported || status !== 'active') return
    window.speechSynthesis.pause()
    setStatus('paused')
  }, [supported, status])

  const stop = useCallback(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    lastTargetRef.current = null
    clearHighlight()
    setStatus('idle')
  }, [supported, clearHighlight])

  // Changing "important only" mid-session would leave the highlight on an
  // element that no longer matches the active selector — clearest to just
  // drop the current target so the next hover picks fresh.
  const changeImportantOnly = useCallback(
    (value) => {
      setImportantOnly(value)
      lastTargetRef.current = null
      clearHighlight()
    },
    [clearHighlight]
  )

  return {
    supported,
    status,
    rate,
    setRate,
    importantOnly,
    setImportantOnly: changeImportantOnly,
    highlightEnabled,
    setHighlightEnabled,
    play,
    pause,
    stop,
  }
}
