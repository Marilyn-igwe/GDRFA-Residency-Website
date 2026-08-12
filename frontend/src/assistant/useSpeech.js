import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

const Recognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null

export function useSpeechRecognition({ lang = 'en-US' } = {}) {
  const [listening, setListening] = useState(false)
  const [interimText, setInterimText] = useState('')

  const recognitionRef = useRef(null)
  const callbackRef = useRef(null)
  const finalRef = useRef('')
  const interimRef = useRef('')
  const stoppingRef = useRef(false)
  const submittedRef = useRef(false)

  useEffect(() => {
    if (!Recognition) return

    const recognition = new Recognition()

    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    function submitOnce() {
      if (submittedRef.current) return

      const transcript =
        finalRef.current.trim() || interimRef.current.trim()

      submittedRef.current = true
      finalRef.current = ''
      interimRef.current = ''
      stoppingRef.current = false

      setListening(false)
      setInterimText('')

      if (transcript) callbackRef.current?.(transcript)
    }

    recognition.onresult = (event) => {
      let interim = ''

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index++
      ) {
        const result = event.results[index]
        const text = result[0]?.transcript || ''

        if (result.isFinal) {
          finalRef.current += ` ${text}`
        } else {
          interim += text
        }
      }

      interimRef.current = interim
      setInterimText(interim)
    }

    recognition.onspeechend = () => {
      if (stoppingRef.current) return

      stoppingRef.current = true

      try {
        recognition.stop()
      } catch {
        submitOnce()
      }
    }

    recognition.onend = submitOnce

    recognition.onerror = (event) => {
      if (event.error === 'aborted') {
        submitOnce()
        return
      }

      submittedRef.current = true
      finalRef.current = ''
      interimRef.current = ''
      stoppingRef.current = false

      setListening(false)
      setInterimText('')

      if (event.error !== 'no-speech') {
        console.warn('Speech recognition error:', event.error)
      }
    }

    recognitionRef.current = recognition

    return () => {
      submittedRef.current = true

      recognition.onresult = null
      recognition.onspeechend = null
      recognition.onend = null
      recognition.onerror = null

      try {
        recognition.abort()
      } catch {
        // Recognition was already inactive.
      }

      recognitionRef.current = null
    }
  }, [lang])

  const start = useCallback((onFinal) => {
    const recognition = recognitionRef.current
    if (!recognition) return

    callbackRef.current = onFinal
    finalRef.current = ''
    interimRef.current = ''
    stoppingRef.current = false
    submittedRef.current = false

    setInterimText('')

    try {
      recognition.start()
      setListening(true)
    } catch (error) {
      if (error?.name !== 'InvalidStateError') {
        console.warn('Could not start microphone:', error)
      }
    }
  }, [])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current

    if (!recognition || !listening || stoppingRef.current) return

    stoppingRef.current = true

    try {
      // stop() finalizes the speech captured so far.
      recognition.stop()
    } catch {
      stoppingRef.current = false
      setListening(false)
    }
  }, [listening])

  const cancel = useCallback(() => {
    submittedRef.current = true
    finalRef.current = ''
    interimRef.current = ''
    stoppingRef.current = false

    setListening(false)
    setInterimText('')

    try {
      recognitionRef.current?.abort()
    } catch {
      // Recognition was already inactive.
    }
  }, [])

  return {
    supported: Boolean(Recognition),
    listening,
    interimText,
    start,
    stop,
    cancel,
  }
}

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false)

  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window

  const sessionRef = useRef(0)

  const speak = useCallback(
    (text, { lang = 'en-US', onEnd } = {}) => {
      if (!supported || !String(text).trim()) return

      const session = ++sessionRef.current
      window.speechSynthesis.cancel()

      // Long utterances sometimes stop working in Chrome.
      // Splitting replies into sentences prevents that.
      const chunks =
        String(text)
          .match(/[^.!?\n]+[.!?]?|\n/g)
          ?.map((part) => part.trim())
          .filter(Boolean) || [String(text)]

      let index = 0

      function playNext() {
        if (session !== sessionRef.current) return

        if (index >= chunks.length) {
          setSpeaking(false)
          onEnd?.()
          return
        }

        const utterance =
          new SpeechSynthesisUtterance(chunks[index++])

        utterance.lang = lang
        utterance.rate = 1
        utterance.pitch = 1
        utterance.onstart = () => setSpeaking(true)
        utterance.onend = playNext
        utterance.onerror = playNext

        window.speechSynthesis.speak(utterance)
      }

      playNext()
    },
    [supported]
  )

  const cancel = useCallback(() => {
    if (!supported) return

    sessionRef.current += 1
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [supported])

  useEffect(() => {
    return () => {
      sessionRef.current += 1
      window.speechSynthesis?.cancel()
    }
  }, [])

  return {
    supported,
    speaking,
    speak,
    cancel,
  }
}

export function useMicLevel(active) {
  const [level, setLevel] = useState(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (
      !active ||
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices
    ) {
      setLevel(0)
      return
    }

    let stream
    let audioContext
    let stopped = false

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((mediaStream) => {
        if (stopped) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }

        stream = mediaStream

        const AudioContext =
          window.AudioContext || window.webkitAudioContext

        audioContext = new AudioContext()

        const source =
          audioContext.createMediaStreamSource(stream)

        const analyser = audioContext.createAnalyser()
        analyser.fftSize = 256
        source.connect(analyser)

        const data =
          new Uint8Array(analyser.frequencyBinCount)

        function updateLevel() {
          analyser.getByteFrequencyData(data)

          const average =
            data.reduce((sum, value) => sum + value, 0) /
            data.length

          setLevel(Math.min(average / 100, 1))
          frameRef.current =
            requestAnimationFrame(updateLevel)
        }

        updateLevel()
      })
      .catch(() => setLevel(0))

    return () => {
      stopped = true

      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }

      stream?.getTracks().forEach((track) => track.stop())
      audioContext?.close()
      setLevel(0)
    }
  }, [active])

  return level
}