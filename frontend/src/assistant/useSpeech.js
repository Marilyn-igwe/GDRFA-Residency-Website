import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'preact/hooks'

const Recognition =
  typeof window !== 'undefined'
    ? window.SpeechRecognition ||
      window.webkitSpeechRecognition
    : null

const VOICE_STORAGE_PREFIX =
  'gdrfa_preferred_voice_'

const LANGUAGE_SETTINGS = {
  en: {
    rate: 0.95,
    pitch: 1,
    volume: 1
  },
  ar: {
    rate: 0.9,
    pitch: 1,
    volume: 1
  },
  hi: {
    rate: 0.92,
    pitch: 1,
    volume: 1
  },
  fil: {
    rate: 0.94,
    pitch: 1,
    volume: 1
  },
  ur: {
    rate: 0.88,
    pitch: 1,
    volume: 1
  },
  bn: {
    rate: 0.9,
    pitch: 1,
    volume: 1
  }
}

const HIGH_QUALITY_VOICE_WORDS = [
  'natural',
  'neural',
  'online',
  'premium',
  'enhanced',
  'google',
  'microsoft',
  'samantha',
  'daniel',
  'zira',
  'aria',
  'jenny',
  'guy',
  'sara',
  'salma',
  'hoda',
  'naayf'
]

const LOW_QUALITY_VOICE_WORDS = [
  'compact',
  'espeak',
  'festival'
]

function normalizeLanguage(language) {
  return String(
    language || 'en-US'
  )
    .replace('_', '-')
    .toLowerCase()
}

function baseLanguage(language) {
  return normalizeLanguage(language)
    .split('-')[0]
}

function getLanguageSettings(language) {
  return (
    LANGUAGE_SETTINGS[
      baseLanguage(language)
    ] ||
    LANGUAGE_SETTINGS.en
  )
}

function voiceStorageKey(language) {
  return (
    VOICE_STORAGE_PREFIX +
    baseLanguage(language)
  )
}

function scoreVoice(
  voice,
  language
) {
  const requested =
    normalizeLanguage(language)

  const requestedBase =
    baseLanguage(language)

  const voiceLanguage =
    normalizeLanguage(
      voice.lang
    )

  const voiceBase =
    baseLanguage(
      voice.lang
    )

  const name =
    String(voice.name || '')
      .toLowerCase()

  if (
    voiceBase !==
    requestedBase
  ) {
    return -1000
  }

  let score =
    voiceLanguage === requested
      ? 100
      : 70

  for (
    const word
    of HIGH_QUALITY_VOICE_WORDS
  ) {
    if (name.includes(word)) {
      score += 12
    }
  }

  for (
    const word
    of LOW_QUALITY_VOICE_WORDS
  ) {
    if (name.includes(word)) {
      score -= 30
    }
  }

  if (voice.default) {
    score += 3
  }

  if (!voice.localService) {
    score += 5
  }

  return score
}

function sortVoices(
  voices,
  language
) {
  return [...voices]
    .filter(
      (voice) =>
        baseLanguage(
          voice.lang
        ) ===
        baseLanguage(language)
    )
    .sort(
      (left, right) =>
        scoreVoice(
          right,
          language
        ) -
        scoreVoice(
          left,
          language
        )
    )
}

function chooseBestVoice(
  voices,
  language,
  preferredName
) {
  if (!voices.length) {
    return null
  }

  if (preferredName) {
    const preferred =
      voices.find(
        (voice) =>
          voice.name ===
            preferredName &&
          baseLanguage(
            voice.lang
          ) ===
            baseLanguage(
              language
            )
      )

    if (preferred) {
      return preferred
    }
  }

  return (
    sortVoices(
      voices,
      language
    )[0] ||
    null
  )
}

function cleanSpeechText(text) {
  return String(text || '')
    .replace(
      /https?:\/\/\S+/gi,
      ''
    )
    .replace(
      /[*_#>`~]/g,
      ''
    )
    .replace(
      /^[•\-]\s*/gm,
      ''
    )
    .replace(
      /\s+/g,
      ' '
    )
    .replace(
      /\s+([,.;!?])/g,
      '$1'
    )
    .trim()
}

function splitLongText(
  text,
  maximumLength
) {
  if (
    text.length <=
    maximumLength
  ) {
    return [text]
  }

  const words =
    text.split(/\s+/)

  const chunks = []
  let current = ''

  for (const word of words) {
    const candidate =
      current
        ? `${current} ${word}`
        : word

    if (
      candidate.length <=
      maximumLength
    ) {
      current = candidate
    } else {
      if (current) {
        chunks.push(current)
      }

      current = word
    }
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

function createSpeechChunks(text) {
  const cleaned =
    cleanSpeechText(text)

  if (!cleaned) {
    return []
  }

  const sentences =
    cleaned.match(
      /[^.!?]+[.!?]?/g
    ) || [cleaned]

  const chunks = []
  let current = ''

  for (
    const rawSentence
    of sentences
  ) {
    const sentence =
      rawSentence.trim()

    if (!sentence) {
      continue
    }

    const sentenceParts =
      splitLongText(
        sentence,
        220
      )

    for (
      const part
      of sentenceParts
    ) {
      const candidate =
        current
          ? `${current} ${part}`
          : part

      if (
        candidate.length <= 260
      ) {
        current = candidate
      } else {
        if (current) {
          chunks.push(current)
        }

        current = part
      }
    }
  }

  if (current) {
    chunks.push(current)
  }

  return chunks
}

function loadBrowserVoices() {
  if (
    typeof window ===
      'undefined' ||
    !window.speechSynthesis
  ) {
    return []
  }

  return (
    window.speechSynthesis
      .getVoices() || []
  )
}

export function useSpeechRecognition({
  lang = 'en-US'
} = {}) {
  const [
    listening,
    setListening
  ] = useState(false)

  const [
    interimText,
    setInterimText
  ] = useState('')

  const [
    error,
    setError
  ] = useState('')

  const recognitionRef =
    useRef(null)

  const callbackRef =
    useRef(null)

  const finalRef =
    useRef('')

  const interimRef =
    useRef('')

  const manualStopRef =
    useRef(false)

  const submittedRef =
    useRef(false)

  const autoSubmitRef =
    useRef(false)

  const silenceMsRef =
    useRef(1400)

  const silenceTimerRef =
    useRef(null)

  function clearSilenceTimer() {
    if (
      silenceTimerRef.current
    ) {
      window.clearTimeout(
        silenceTimerRef.current
      )

      silenceTimerRef.current =
        null
    }
  }

  useEffect(() => {
    if (!Recognition) {
      return
    }

    const recognition =
      new Recognition()

    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3

    function submitOnce() {
      if (
        submittedRef.current
      ) {
        return
      }

      clearSilenceTimer()

      const transcript =
        (
          finalRef.current.trim() ||
          interimRef.current.trim()
        ).trim()

      submittedRef.current = true
      finalRef.current = ''
      interimRef.current = ''
      manualStopRef.current = false

      setListening(false)
      setInterimText('')

      if (transcript) {
        callbackRef.current?.(
          transcript
        )
      }
    }

    function scheduleAutoSubmit() {
      clearSilenceTimer()

      if (
        !autoSubmitRef.current
      ) {
        return
      }

      const hasTranscript =
        finalRef.current.trim() ||
        interimRef.current.trim()

      if (!hasTranscript) {
        return
      }

      silenceTimerRef.current =
        window.setTimeout(() => {
          if (
            submittedRef.current
          ) {
            return
          }

          manualStopRef.current =
            true

          try {
            recognition.stop()
          } catch {
            submitOnce()
          }
        }, silenceMsRef.current)
    }

    recognition.onresult = (
      event
    ) => {
      let interim = ''

      for (
        let index =
          event.resultIndex;
        index <
          event.results.length;
        index++
      ) {
        const result =
          event.results[index]

        const text =
          result[0]?.transcript ||
          ''

        if (result.isFinal) {
          finalRef.current +=
            ` ${text}`
        } else {
          interim += text
        }
      }

      interimRef.current =
        interim

      setInterimText(
        `${finalRef.current} ${interim}`
          .trim()
      )

      scheduleAutoSubmit()
    }

    recognition.onend = () => {
      if (
        manualStopRef.current ||
        submittedRef.current
      ) {
        submitOnce()
        return
      }

      /*
       * Browsers may stop recognition
       * after a silence timeout. Restart
       * it while the user is still in
       * dictation or conversation mode.
       */
      try {
        recognition.start()
      } catch {
        submitOnce()
      }
    }

    recognition.onerror = (
      event
    ) => {
      if (
        event.error ===
        'aborted'
      ) {
        if (
          manualStopRef.current
        ) {
          submitOnce()
        }

        return
      }

      if (
        (
          event.error ===
            'no-speech' ||
          event.error ===
            'network'
        ) &&
        !manualStopRef.current
      ) {
        return
      }

      clearSilenceTimer()

      submittedRef.current = true
      finalRef.current = ''
      interimRef.current = ''
      manualStopRef.current = false

      setListening(false)
      setInterimText('')
      setError(event.error || 'speech-error')
    }

    recognitionRef.current =
      recognition

    return () => {
      clearSilenceTimer()

      submittedRef.current = true

      recognition.onresult = null
      recognition.onend = null
      recognition.onerror = null

      try {
        recognition.abort()
      } catch {
        // Recognition is inactive.
      }

      recognitionRef.current =
        null
    }
  }, [lang])

  const start = useCallback(
    (
      onFinal,
      {
        autoSubmit = false,
        silenceMs = 1400
      } = {}
    ) => {
      const recognition =
        recognitionRef.current

      if (!recognition) {
        return
      }

      clearSilenceTimer()

      callbackRef.current =
        onFinal

      autoSubmitRef.current =
        autoSubmit

      silenceMsRef.current =
        Math.max(
          700,
          Number(silenceMs) ||
            1400
        )

      finalRef.current = ''
      interimRef.current = ''
      manualStopRef.current =
        false
      submittedRef.current =
        false

      setError('')
      setInterimText('')

      try {
        recognition.start()
        setListening(true)
      } catch (startError) {
        if (
          startError?.name !==
          'InvalidStateError'
        ) {
          setError(
            startError?.message ||
            'microphone-error'
          )
        }
      }
    },
    []
  )

  const stop = useCallback(
    () => {
      const recognition =
        recognitionRef.current

      if (
        !recognition ||
        !listening
      ) {
        return
      }

      clearSilenceTimer()

      manualStopRef.current =
        true

      try {
        recognition.stop()
      } catch {
        manualStopRef.current =
          false

        setListening(false)
      }
    },
    [listening]
  )

  const cancel = useCallback(
    () => {
      clearSilenceTimer()

      manualStopRef.current =
        true

      submittedRef.current =
        true

      finalRef.current = ''
      interimRef.current = ''

      setListening(false)
      setInterimText('')

      try {
        recognitionRef.current
          ?.abort()
      } catch {
        // Recognition is inactive.
      }
    },
    []
  )

  return {
    supported:
      Boolean(Recognition),

    listening,
    interimText,
    error,
    start,
    stop,
    cancel
  }
}

export function useSpeechSynthesis({
  defaultLanguage = 'en-US'
} = {}) {
  const [
    speaking,
    setSpeaking
  ] = useState(false)

  const [
    voices,
    setVoices
  ] = useState([])

  const [
    selectedVoiceNames,
    setSelectedVoiceNames
  ] = useState({})

  const supported =
    typeof window !==
      'undefined' &&
    'speechSynthesis' in
      window &&
    'SpeechSynthesisUtterance' in
      window

  const sessionRef =
    useRef(0)

  const timerRef =
    useRef(null)

  useEffect(() => {
    if (!supported) {
      return
    }

    function updateVoices() {
      const available =
        loadBrowserVoices()

      if (available.length) {
        setVoices(available)
      }
    }

    updateVoices()

    window.speechSynthesis
      .addEventListener(
        'voiceschanged',
        updateVoices
      )

    const delayedLoad =
      window.setTimeout(
        updateVoices,
        250
      )

    return () => {
      window.clearTimeout(
        delayedLoad
      )

      window.speechSynthesis
        .removeEventListener(
          'voiceschanged',
          updateVoices
        )
    }
  }, [supported])

  useEffect(() => {
    if (
      typeof window ===
        'undefined'
    ) {
      return
    }

    const languageBase =
      baseLanguage(
        defaultLanguage
      )

    const storedVoice =
      localStorage.getItem(
        voiceStorageKey(
          defaultLanguage
        )
      )

    if (storedVoice) {
      setSelectedVoiceNames(
        (current) => ({
          ...current,

          [languageBase]:
            storedVoice
        })
      )
    }
  }, [defaultLanguage])

  const availableVoices =
    useMemo(
      () =>
        sortVoices(
          voices,
          defaultLanguage
        ),
      [
        voices,
        defaultLanguage
      ]
    )

  const setVoiceName =
    useCallback(
      (
        voiceName,
        language =
          defaultLanguage
      ) => {
        const languageBase =
          baseLanguage(language)

        setSelectedVoiceNames(
          (current) => ({
            ...current,

            [languageBase]:
              voiceName
          })
        )

        if (
          typeof window !==
            'undefined'
        ) {
          localStorage.setItem(
            voiceStorageKey(
              language
            ),
            voiceName
          )
        }
      },
      [defaultLanguage]
    )

  const cancel =
    useCallback(() => {
      if (!supported) {
        return
      }

      sessionRef.current += 1

      if (timerRef.current) {
        window.clearTimeout(
          timerRef.current
        )

        timerRef.current = null
      }

      window.speechSynthesis
        .cancel()

      setSpeaking(false)
    }, [supported])

  const speak =
    useCallback(
      (
        text,
        {
          lang =
            defaultLanguage,
          rate,
          pitch,
          volume,
          voiceName,
          onEnd
        } = {}
      ) => {
        if (
          !supported ||
          !String(text).trim()
        ) {
          return
        }

        const session =
          ++sessionRef.current

        if (timerRef.current) {
          window.clearTimeout(
            timerRef.current
          )

          timerRef.current = null
        }

        window.speechSynthesis
          .cancel()

        const chunks =
          createSpeechChunks(text)

        if (!chunks.length) {
          return
        }

        const settings =
          getLanguageSettings(lang)

        const languageBase =
          baseLanguage(lang)

        const preferredVoice =
          voiceName ||
          selectedVoiceNames[
            languageBase
          ] ||
          (
            typeof window !==
              'undefined'
              ? localStorage.getItem(
                  voiceStorageKey(
                    lang
                  )
                )
              : ''
          )

        const selectedVoice =
          chooseBestVoice(
            voices.length
              ? voices
              : loadBrowserVoices(),
            lang,
            preferredVoice
          )

        let index = 0

        function finish() {
          if (
            session !==
            sessionRef.current
          ) {
            return
          }

          setSpeaking(false)
          onEnd?.()
        }

        function playNext() {
          if (
            session !==
            sessionRef.current
          ) {
            return
          }

          if (
            index >=
            chunks.length
          ) {
            finish()
            return
          }

          const utterance =
            new SpeechSynthesisUtterance(
              chunks[index]
            )

          index += 1

          utterance.lang = lang

          utterance.rate =
            typeof rate ===
            'number'
              ? rate
              : settings.rate

          utterance.pitch =
            typeof pitch ===
            'number'
              ? pitch
              : settings.pitch

          utterance.volume =
            typeof volume ===
            'number'
              ? volume
              : settings.volume

          if (selectedVoice) {
            utterance.voice =
              selectedVoice
          }

          utterance.onstart =
            () => {
              if (
                session ===
                sessionRef.current
              ) {
                setSpeaking(true)
              }
            }

          utterance.onend =
            () => {
              if (
                session !==
                sessionRef.current
              ) {
                return
              }

              timerRef.current =
                window.setTimeout(
                  playNext,
                  70
                )
            }

          utterance.onerror =
            (speechError) => {
              if (
                session !==
                sessionRef.current
              ) {
                return
              }

              if (
                speechError.error ===
                'canceled'
              ) {
                return
              }

              timerRef.current =
                window.setTimeout(
                  playNext,
                  50
                )
            }

          window.speechSynthesis
            .speak(utterance)
        }

        playNext()
      },
      [
        supported,
        voices,
        selectedVoiceNames,
        defaultLanguage
      ]
    )

  useEffect(() => {
    return () => {
      sessionRef.current += 1

      if (timerRef.current) {
        window.clearTimeout(
          timerRef.current
        )
      }

      window.speechSynthesis
        ?.cancel()
    }
  }, [])

  return {
    supported,
    speaking,
    speak,
    cancel,

    voices:
      availableVoices,

    selectedVoiceName:
      selectedVoiceNames[
        baseLanguage(
          defaultLanguage
        )
      ] || '',

    setVoiceName
  }
}

export function useMicLevel(
  active
) {
  const [
    level,
    setLevel
  ] = useState(0)

  const frameRef =
    useRef(null)

  useEffect(() => {
    if (
      !active ||
      typeof navigator ===
        'undefined' ||
      !navigator.mediaDevices
    ) {
      setLevel(0)
      return
    }

    let stream
    let audioContext
    let stopped = false

    navigator.mediaDevices
      .getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      })
      .then(
        (mediaStream) => {
          if (stopped) {
            mediaStream
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              )

            return
          }

          stream = mediaStream

          const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext

          audioContext =
            new AudioContext()

          const source =
            audioContext
              .createMediaStreamSource(
                stream
              )

          const analyser =
            audioContext
              .createAnalyser()

          analyser.fftSize = 256

          analyser
            .smoothingTimeConstant =
            0.75

          source.connect(analyser)

          const data =
            new Uint8Array(
              analyser
                .frequencyBinCount
            )

          function updateLevel() {
            analyser
              .getByteFrequencyData(
                data
              )

            const average =
              data.reduce(
                (
                  total,
                  value
                ) =>
                  total + value,
                0
              ) / data.length

            setLevel(
              Math.min(
                average / 100,
                1
              )
            )

            frameRef.current =
              requestAnimationFrame(
                updateLevel
              )
          }

          updateLevel()
        }
      )
      .catch(() => {
        setLevel(0)
      })

    return () => {
      stopped = true

      if (frameRef.current) {
        cancelAnimationFrame(
          frameRef.current
        )
      }

      stream
        ?.getTracks()
        .forEach(
          (track) =>
            track.stop()
        )

      audioContext?.close()
      setLevel(0)
    }
  }, [active])

  return level
}