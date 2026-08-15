import { useCallback, useRef, useState } from 'preact/hooks'

// Drives the "Reading Assistance" panel: real playback control (not just
// an on/off button), adjustable speed, and a running index of which
// sentence is currently being spoken so the UI can highlight it.
//
// Deliberately its own hook rather than reusing the shared
// useSpeechSynthesis from assistant/useSpeech.js — that one plays a single
// reply start-to-finish for the chat assistant. This one needs pause/
// resume/seek-by-sentence and a live "which chunk is this" position, which
// is a different enough shape of state that sharing the hook would have
// meant bolting page-reader concerns onto the chat voice code.

function extractSentences(importantOnly) {
  const appEl = document.querySelector('.app')
  if (!appEl) return []

  const clone = appEl.cloneNode(true)
  clone
    .querySelectorAll('#gd-a11y-widget-root, .chat-widget, script, style, input, textarea')
    .forEach((el) => el.remove())

  let rawText
  if (importantOnly) {
    // Headings + paragraph text only — skips nav links, button labels,
    // and small print, so it reads like a summary of the page instead of
    // every clickable label on it.
    const nodes = clone.querySelectorAll('h1, h2, h3, h4, p')
    rawText = Array.from(nodes)
      .map((n) => n.textContent.trim())
      .filter(Boolean)
      .join('. ')
  } else {
    rawText = clone.textContent || ''
  }

  rawText = rawText.replace(/\s+/g, ' ').trim()
  if (!rawText) return []

  const matches = rawText.match(/[^.!?\n]+[.!?]?/g) || [rawText]
  return matches.map((s) => s.trim()).filter(Boolean)
}

export function usePageReader() {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  const [chunks, setChunks] = useState([])
  const [chunkIndex, setChunkIndex] = useState(-1)
  // 'idle' | 'playing' | 'paused'
  const [status, setStatus] = useState('idle')
  const [rate, setRate] = useState(1)
  const [importantOnly, setImportantOnly] = useState(false)
  const [highlightEnabled, setHighlightEnabled] = useState(true)

  const chunksRef = useRef([])
  const chunkIndexRef = useRef(-1)
  const rateRef = useRef(1)
  const langRef = useRef('en-US')
  const sessionRef = useRef(0)

  const speakChunk = useCallback((index) => {
    const list = chunksRef.current
    if (index >= list.length) {
      sessionRef.current += 1
      setStatus('idle')
      setChunkIndex(-1)
      chunkIndexRef.current = -1
      return
    }

    const session = sessionRef.current
    const utterance = new SpeechSynthesisUtterance(list[index])
    utterance.lang = langRef.current
    utterance.rate = rateRef.current

    utterance.onstart = () => {
      if (session !== sessionRef.current) return
      chunkIndexRef.current = index
      setChunkIndex(index)
    }
    utterance.onend = () => {
      if (session !== sessionRef.current) return
      speakChunk(index + 1)
    }
    utterance.onerror = () => {
      if (session !== sessionRef.current) return
      speakChunk(index + 1)
    }

    window.speechSynthesis.speak(utterance)
  }, [])

  const stop = useCallback(() => {
    if (!supported) return
    sessionRef.current += 1
    window.speechSynthesis.cancel()
    chunkIndexRef.current = -1
    setChunkIndex(-1)
    setStatus('idle')
  }, [supported])

  const play = useCallback(
    (lang) => {
      if (!supported) return

      if (status === 'paused') {
        window.speechSynthesis.resume()
        setStatus('playing')
        return
      }

      langRef.current = lang
      const list = extractSentences(importantOnly)
      setChunks(list)
      chunksRef.current = list
      if (!list.length) return

      sessionRef.current += 1
      window.speechSynthesis.cancel()
      setStatus('playing')
      speakChunk(0)
    },
    [status, importantOnly, speakChunk, supported]
  )

  const pause = useCallback(() => {
    if (!supported || status !== 'playing') return
    window.speechSynthesis.pause()
    setStatus('paused')
  }, [supported, status])

  const changeRate = useCallback(
    (nextRate) => {
      setRate(nextRate)
      rateRef.current = nextRate
      // The Web Speech API can't change an utterance's rate mid-sentence —
      // restart the current sentence at the new speed so the change feels
      // immediate rather than waiting for the next sentence to kick in.
      if (status === 'playing' && chunkIndexRef.current >= 0) {
        sessionRef.current += 1
        window.speechSynthesis.cancel()
        speakChunk(chunkIndexRef.current)
      }
    },
    [status, speakChunk]
  )

  const changeImportantOnly = useCallback(
    (value) => {
      setImportantOnly(value)
      // The transcript is a different set of sentences under the new
      // setting — reading position from the old list wouldn't line up, so
      // stop cleanly and let the next Play reload it.
      if (status !== 'idle') stop()
    },
    [status, stop]
  )

  return {
    supported,
    chunks,
    chunkIndex,
    status,
    rate,
    setRate: changeRate,
    importantOnly,
    setImportantOnly: changeImportantOnly,
    highlightEnabled,
    setHighlightEnabled,
    play,
    pause,
    stop,
  }
}
