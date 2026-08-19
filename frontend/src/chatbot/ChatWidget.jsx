import {
  useEffect,
  useRef,
  useState
} from 'preact/hooks'
import {
  askChatbot
} from './api'
import {
  useLanguage
} from '../language/LanguageContext'
import {
  useSpeechRecognition,
  useSpeechSynthesis
} from '../assistant/useSpeech'
import './chatbot.css'

const SPEECH_LANGUAGES = {
  en: 'en-US',
  ar: 'ar-AE',
  hi: 'hi-IN',
  tl: 'fil-PH',
  ur: 'ur-PK',
  bn: 'bn-BD'
}

const CHAT_STORAGE_KEY =
  'gdrfa_chat_conversation'

function Icon({ type }) {
  if (type === 'close') {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    )
  }

  if (type === 'mic') {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
      >
        <rect
          x="9"
          y="3"
          width="6"
          height="11"
          rx="3"
          stroke="currentColor"
          stroke-width="2"
        />

        <path
          d="M5 11a7 7 0 0014 0M12 18v3"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    )
  }

  if (type === 'send') {
    return (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M4 12h16M13 5l7 7-7 7"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    )
  }

  if (type === 'volume-off') {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    )
  }

  if (type === 'volume') {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M4 9v6h4l5 4V5L8 9H4zM17 8a5 5 0 010 8"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    )
  }

  if (type === 'new') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    )
  }

  if (type === 'end') {
    return (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M4 4l16 16M5 12a7 7 0 0011.7 5.2M19 12A7 7 0 007.3 6.8"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    )
  }

  if (type === 'voice') {
    return (
      <svg
        width="17"
        height="17"
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M6 10v4M10 7v10M14 4v16M18 8v8"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
    )
  }

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path
        d="M4 4h16v12H7l-3 3V4z"
        stroke="currentColor"
        stroke-width="2"
      />

      <circle
        cx="9"
        cy="10"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="12"
        cy="10"
        r="1"
        fill="currentColor"
      />

      <circle
        cx="15"
        cy="10"
        r="1"
        fill="currentColor"
      />
    </svg>
  )
}

function prepareForSpeech(
  text,
  locale
) {
  return String(text).replace(
    /\b([01]?\d|2[0-3]):([0-5]\d)\b/g,
    (
      _,
      hour,
      minute
    ) => {
      const time = new Date(
        2000,
        0,
        1,
        Number(hour),
        Number(minute)
      )

      return new Intl.DateTimeFormat(
        locale,
        {
          hour: 'numeric',

          minute:
            minute === '00'
              ? undefined
              : '2-digit',

          hour12: true
        }
      ).format(time)
    }
  )
}

function isLikelySpeakerEcho(transcript, spokenReply) {
  const words = (value) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2)

  const heardWords = words(transcript)
  const replyWords = new Set(words(spokenReply))

  if (heardWords.length < 3 || !replyWords.size) {
    return false
  }

  const matchingWords = heardWords.filter(
    (word) => replyWords.has(word)
  ).length

  return matchingWords / heardWords.length >= 0.65
}

function loadSavedMessages() {
  if (
    typeof window ===
    'undefined'
  ) {
    return null
  }

  try {
    const saved =
      sessionStorage.getItem(
        CHAT_STORAGE_KEY
      )

    if (!saved) {
      return null
    }

    const parsed =
      JSON.parse(saved)

    if (!Array.isArray(parsed)) {
      return null
    }

    return parsed.filter(
      (message) =>
        message &&
        (
          message.role === 'user' ||
          message.role === 'bot'
        ) &&
        typeof message.text ===
          'string'
    )
  } catch {
    return null
  }
}

export function ChatWidget() {
  const {
    chat: ct,
    code
  } = useLanguage()

  const speechLang =
    SPEECH_LANGUAGES[code] ||
    'en-US'

  const recognition =
    useSpeechRecognition({
      lang: speechLang
    })

  const tts =
    useSpeechSynthesis({
      defaultLanguage:
        speechLang
    })

  function welcomeMessage() {
    return {
      role: 'bot',
      text: ct.welcomeText,
      followups:
        ct.welcomeFollowups
    }
  }

  const [
    open,
    setOpen
  ] = useState(false)

  const [
    everOpened,
    setEverOpened
  ] = useState(false)

  const [
    messages,
    setMessages
  ] = useState(
    () =>
      loadSavedMessages() || [
        welcomeMessage()
      ]
  )

  const [
    input,
    setInput
  ] = useState('')

  const [
    loading,
    setLoading
  ] = useState(false)

  const [
    voiceReplies,
    setVoiceReplies
  ] = useState(true)

  const [
    chatEnded,
    setChatEnded
  ] = useState(false)

  const [
    voiceConversation,
    setVoiceConversation
  ] = useState(false)

  const scrollRef =
    useRef(null)

  const inputRef =
    useRef(null)

  const messagesRef =
    useRef(messages)

  const loadingRef =
    useRef(false)

  const chatEndedRef =
    useRef(false)

  const openRef =
    useRef(false)

  const voiceRepliesRef =
    useRef(true)

  const voiceConversationRef =
    useRef(false)

  const voiceSpeakingRef =
    useRef(false)

  const voiceResumeTimerRef =
    useRef(null)

  const voiceResumeNotBeforeRef =
    useRef(0)

  const lastSpokenReplyRef =
    useRef('')

  useEffect(() => {
    messagesRef.current =
      messages

    try {
      sessionStorage.setItem(
        CHAT_STORAGE_KEY,
        JSON.stringify(messages)
      )
    } catch {
      // Storage may be unavailable.
    }
  }, [messages])

  useEffect(() => {
    loadingRef.current =
      loading
  }, [loading])

  useEffect(() => {
    chatEndedRef.current =
      chatEnded
  }, [chatEnded])

  useEffect(() => {
    openRef.current = open
  }, [open])

  useEffect(() => {
    voiceRepliesRef.current =
      voiceReplies
  }, [voiceReplies])

  useEffect(() => {
    voiceConversationRef.current =
      voiceConversation
  }, [voiceConversation])

  useEffect(() => {
    if (!inputRef.current) {
      return
    }

    inputRef.current.style.height =
      'auto'

    inputRef.current.style.height =
      `${Math.min(
        inputRef.current
          .scrollHeight,
        104
      )}px`
  }, [input])

  useEffect(() => {
    function openChat() {
      setOpen(true)
      setEverOpened(true)
    }

    window.addEventListener(
      'gdrfa:open-chat',
      openChat
    )

    return () => {
      window.removeEventListener(
        'gdrfa:open-chat',
        openChat
      )
    }
  }, [])

  useEffect(() => {
    if (!scrollRef.current) {
      return
    }

    scrollRef.current.scrollTop =
      scrollRef.current
        .scrollHeight
  }, [
    messages,
    open,
    loading,
    recognition.interimText
  ])

  useEffect(() => {
    if (
      !recognition.listening ||
      voiceConversation
    ) {
      return
    }

    setInput(
      recognition.interimText
    )
  }, [
    recognition.interimText,
    recognition.listening,
    voiceConversation
  ])

  useEffect(() => {
    if (!open) {
      voiceConversationRef.current =
        false

      setVoiceConversation(false)
      recognition.cancel()
      tts.cancel()
    }
  }, [open])

  function stopAllAudio() {
    voiceSpeakingRef.current = false

    if (voiceResumeTimerRef.current) {
      window.clearTimeout(voiceResumeTimerRef.current)
      voiceResumeTimerRef.current = null
    }

    recognition.cancel()
    tts.cancel()
  }

  function stopVoiceConversation({
    stopSpeech = true
  } = {}) {
    voiceConversationRef.current =
      false

    setVoiceConversation(false)
    recognition.cancel()
    voiceSpeakingRef.current = false

    if (voiceResumeTimerRef.current) {
      window.clearTimeout(voiceResumeTimerRef.current)
      voiceResumeTimerRef.current = null
    }

    if (stopSpeech) {
      tts.cancel()
    }
  }

  function startNewChat() {
    stopVoiceConversation()

    const nextMessages = [
      welcomeMessage()
    ]

    messagesRef.current =
      nextMessages

    setMessages(nextMessages)
    setInput('')
    setLoading(false)
    setChatEnded(false)

    loadingRef.current = false
    chatEndedRef.current =
      false

    try {
      sessionStorage.removeItem(
        CHAT_STORAGE_KEY
      )
    } catch {
      // Storage may be unavailable.
    }
  }

  function endChat() {
    stopVoiceConversation()

    setInput('')
    setChatEnded(true)

    chatEndedRef.current =
      true
  }

  function resumeChat() {
    setChatEnded(false)

    chatEndedRef.current =
      false
  }

  function scheduleVoiceListening() {
    if (voiceResumeTimerRef.current) {
      window.clearTimeout(voiceResumeTimerRef.current)
    }

    const delay = Math.max(
      250,
      voiceResumeNotBeforeRef.current - Date.now()
    )

    voiceResumeTimerRef.current = window.setTimeout(() => {
      voiceResumeTimerRef.current = null

      if (
        !voiceConversationRef
          .current ||
        !openRef.current ||
        chatEndedRef.current ||
        loadingRef.current ||
        voiceSpeakingRef.current
      ) {
        return
      }

      recognition.start(
        (transcript) => {
          const spokenText =
            String(
              transcript || ''
            ).trim()

          if (
            !spokenText ||
            !voiceConversationRef
              .current
          ) {
            return
          }

          if (
            Date.now() < voiceResumeNotBeforeRef.current ||
            isLikelySpeakerEcho(
              spokenText,
              lastSpokenReplyRef.current
            )
          ) {
            scheduleVoiceListening()
            return
          }

          sendMessage(
            spokenText,
            {
              fromVoiceConversation:
                true
            }
          )
        },
        {
          autoSubmit: true,
          silenceMs: 1400
        }
      )
    }, delay)
  }

  function startVoiceConversation() {
    if (
      !recognition.supported ||
      loadingRef.current ||
      chatEndedRef.current
    ) {
      return
    }

    tts.cancel()
    recognition.cancel()

    setOpen(true)
    setEverOpened(true)
    setVoiceReplies(true)
    setVoiceConversation(true)

    openRef.current = true
    voiceRepliesRef.current =
      true
    voiceConversationRef.current =
      true

    scheduleVoiceListening()
  }

  async function sendMessage(
    text,
    {
      fromVoiceConversation =
        false
    } = {}
  ) {
    const question =
      String(text || '').trim()

    if (
      !question ||
      loadingRef.current ||
      chatEndedRef.current
    ) {
      return
    }

    recognition.cancel()

    const currentMessages =
      messagesRef.current

    const history =
      currentMessages
        .slice(-10)
        .map((message) => ({
          role:
            message.role ===
              'bot'
              ? 'assistant'
              : 'user',

          content:
            message.text
        }))

    const userMessage = {
      role: 'user',
      text: question
    }

    const messagesWithUser = [
      ...currentMessages,
      userMessage
    ]

    messagesRef.current =
      messagesWithUser

    setMessages(
      messagesWithUser
    )

    setInput('')
    setLoading(true)

    loadingRef.current = true

    try {
      const result =
        await askChatbot(
          question,
          {
            history,
            language: code
          }
        )

      const botMessage = {
        role: 'bot',

        text:
          result.reply ||
          ct.errorText,

        followups:
          result.followups || []
      }

      const messagesWithReply = [
        ...messagesRef.current,
        botMessage
      ]

      messagesRef.current =
        messagesWithReply

      setMessages(
        messagesWithReply
      )

      setLoading(false)
      loadingRef.current = false

      const shouldSpeak =
        voiceConversationRef
          .current ||
        voiceRepliesRef.current

      if (
        shouldSpeak &&
        tts.supported
      ) {
        const spokenReply =
          prepareForSpeech(
            botMessage.text,
            speechLang
          )

        voiceSpeakingRef.current = true
        voiceResumeNotBeforeRef.current =
          Number.POSITIVE_INFINITY
        lastSpokenReplyRef.current =
          spokenReply

        tts.speak(
          spokenReply,
          {
            lang: speechLang,

            onEnd: () => {
              voiceSpeakingRef.current = false
              voiceResumeNotBeforeRef.current =
                Date.now() + 1200

              if (
                voiceConversationRef
                  .current
              ) {
                scheduleVoiceListening()
              }
            }
          }
        )
      } else if (
        voiceConversationRef
          .current
      ) {
        scheduleVoiceListening()
      }
    } catch (requestError) {
      console.error(
        requestError
      )

      const errorMessage = {
        role: 'bot',
        text: ct.errorText,
        followups: []
      }

      const messagesWithError = [
        ...messagesRef.current,
        errorMessage
      ]

      messagesRef.current =
        messagesWithError

      setMessages(
        messagesWithError
      )

      setLoading(false)
      loadingRef.current = false

      if (
        fromVoiceConversation &&
        voiceConversationRef
          .current
      ) {
        scheduleVoiceListening()
      }
    } finally {
      setLoading(false)
      loadingRef.current = false
    }
  }

  function toggleDictation() {
    if (
      chatEnded ||
      loading ||
      voiceConversation
    ) {
      return
    }

    if (recognition.listening) {
      recognition.stop()
      return
    }

    tts.cancel()

    recognition.start(
      (transcript) => {
        const value =
          String(
            transcript || ''
          ).trim()

        if (value) {
          setInput(value)

          window.setTimeout(
            () => {
              inputRef.current
                ?.focus()
            },
            0
          )
        }
      },
      {
        autoSubmit: false
      }
    )
  }

  function toggleVoiceReplies() {
    const nextValue =
      !voiceReplies

    setVoiceReplies(
      nextValue
    )

    voiceRepliesRef.current =
      nextValue

    if (!nextValue) {
      tts.cancel()
      voiceSpeakingRef.current = false
      voiceResumeNotBeforeRef.current =
        Date.now() + 500

      if (
        voiceConversationRef
          .current
      ) {
        scheduleVoiceListening()
      }
    }
  }

  function closeChat() {
    stopVoiceConversation()
    setOpen(false)
    openRef.current = false
  }

  const voiceStatus =
    loading
      ? 'Processing'
      : tts.speaking
        ? 'Speaking'
        : recognition.listening
          ? 'Listening'
          : 'Preparing'

  return (
    <div class="chat-widget">
      {open && (
        <section
          class="chat-panel"
          aria-label={
            ct.title ||
            'GDRFA support'
          }
        >
          <header class="chat-header">
            <div class="chat-header-icon">
              <Icon type="chat" />
            </div>

            <div class="chat-header-copy">
              <strong>
                {ct.title}
              </strong>

              <span>
                {ct.subtitle}
              </span>
            </div>

            <div class="chat-header-actions">
              <button
                type="button"
                class="chat-header-action"
                onClick={
                  startNewChat
                }
                title="New chat"
                aria-label="Start a new chat"
              >
                <Icon type="new" />
              </button>

              <button
                type="button"
                class="chat-header-action"
                onClick={endChat}
                disabled={chatEnded}
                title="End chat"
                aria-label="End chat"
              >
                <Icon type="end" />
              </button>

              <button
                type="button"
                class="chat-close"
                onClick={closeChat}
                title="Close"
                aria-label="Close chat"
              >
                <Icon type="close" />
              </button>
            </div>
          </header>

          <div
            class="chat-messages"
            ref={scrollRef}
            aria-live="polite"
          >
            {messages.map(
              (
                message,
                index
              ) => (
                <div
                  key={index}
                  class={
                    `chat-message ` +
                    message.role
                  }
                >
                  <div class="chat-bubble">
                    {message.text
                      .split('\n')
                      .map(
                        (
                          line,
                          lineIndex
                        ) => (
                          <p
                            key={
                              lineIndex
                            }
                          >
                            {line || ' '}
                          </p>
                        )
                      )}
                  </div>

                  {message.role ===
                    'bot' &&
                    message.followups
                      ?.length > 0 && (
                      <div class="chat-followups">
                        {message.followups.map(
                          (
                            followup
                          ) => (
                            <button
                              key={
                                followup
                              }
                              type="button"
                              disabled={
                                chatEnded ||
                                loading ||
                                voiceConversation
                              }
                              onClick={() =>
                                sendMessage(
                                  followup
                                )
                              }
                            >
                              {followup}
                            </button>
                          )
                        )}
                      </div>
                    )}
                </div>
              )
            )}

            {voiceConversation &&
              recognition.listening &&
              recognition.interimText && (
                <div class="chat-message user chat-transcript-message">
                  <div class="chat-bubble">
                    <span class="chat-transcript-label">
                      Listening
                    </span>

                    <p>
                      {
                        recognition
                          .interimText
                      }
                    </p>
                  </div>
                </div>
              )}

            {loading && (
              <div class="chat-message bot">
                <div class="chat-bubble chat-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          {voiceConversation && (
            <div
              class={
                `chat-voice-session ` +
                `is-${voiceStatus.toLowerCase()}`
              }
              role="status"
            >
              <div class="chat-voice-session-main">
                <span class="chat-voice-session-dot" />

                <div>
                  <strong>
                    Voice conversation active
                  </strong>

                  <span>
                    {voiceStatus}
                    {voiceStatus ===
                      'Listening'
                      ? '...'
                      : ''}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  stopVoiceConversation()
                }
              >
                End voice
              </button>
            </div>
          )}

          {chatEnded && (
            <div class="chat-ended">
              <strong>
                Chat ended
              </strong>

              <p>
                Start a new chat or continue this conversation.
              </p>

              <div class="chat-ended-actions">
                <button
                  type="button"
                  onClick={
                    startNewChat
                  }
                >
                  Start new chat
                </button>

                <button
                  type="button"
                  class="secondary"
                  onClick={
                    resumeChat
                  }
                >
                  Continue chat
                </button>
              </div>
            </div>
          )}

          {!chatEnded && (
            <div class="chat-composer">
              {!voiceConversation && (
                <>
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    disabled={loading}
                    placeholder={
                      ct.placeholder
                    }
                    aria-label="Message"
                    onInput={(
                      event
                    ) => {
                      setInput(
                        event
                          .currentTarget
                          .value
                      )
                    }}
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                          'Enter' &&
                        !event.shiftKey
                      ) {
                        event.preventDefault()

                        sendMessage(
                          input
                        )
                      }
                    }}
                  />

                  <div class="chat-composer-toolbar">
                    <div class="chat-composer-tools">
                      {recognition.supported && (
                        <button
                          type="button"
                          class={
                            `chat-tool-button ` +
                            (
                              recognition.listening
                                ? 'is-listening'
                                : ''
                            )
                          }
                          onClick={
                            toggleDictation
                          }
                          disabled={
                            loading
                          }
                          title={
                            recognition.listening
                              ? 'Finish dictation'
                              : 'Dictate a message'
                          }
                          aria-label={
                            recognition.listening
                              ? 'Finish dictation'
                              : 'Dictate a message'
                          }
                        >
                          <Icon type="mic" />

                          <span>
                            {recognition.listening
                              ? 'Finish'
                              : 'Dictate'}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        class={
                          `chat-tool-button ` +
                          (
                            voiceReplies
                              ? 'is-active'
                              : ''
                          )
                        }
                        onClick={
                          toggleVoiceReplies
                        }
                        title={
                          voiceReplies
                            ? 'Turn spoken replies off'
                            : 'Turn spoken replies on'
                        }
                        aria-pressed={
                          voiceReplies
                        }
                      >
                        <Icon
                          type={
                            voiceReplies
                              ? 'volume'
                              : 'volume-off'
                          }
                        />

                        <span>
                          Read replies
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      class="chat-send-button"
                      onClick={() =>
                        sendMessage(
                          input
                        )
                      }
                      disabled={
                        loading ||
                        !input.trim()
                      }
                      aria-label="Send message"
                    >
                      <Icon type="send" />
                    </button>
                  </div>

                  {recognition.listening && (
                    <div class="chat-dictation-status">
                      <span class="chat-dictation-dot" />

                      <span>
                        Listening. Speak your message, then select Finish.
                      </span>
                    </div>
                  )}

                  {recognition.supported && (
                    <button
                      type="button"
                      class="chat-start-voice"
                      onClick={
                        startVoiceConversation
                      }
                      disabled={
                        loading
                      }
                    >
                      <Icon type="voice" />

                      <span>
                        Start voice conversation
                      </span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {recognition.error && (
            <div
              class="chat-speech-error"
              role="alert"
            >
              Voice input is temporarily unavailable. You can continue by typing.
            </div>
          )}
        </section>
      )}

      <div class="chat-toggle-row">
        {!open &&
          !everOpened && (
            <span class="chat-toggle-label">
              {ct.toggleLabel}
            </span>
          )}

        <button
          type="button"
          class="chat-bubble-toggle"
          onClick={() => {
            if (open) {
              closeChat()
            } else {
              setOpen(true)
              setEverOpened(true)
            }
          }}
          aria-label={
            open
              ? 'Close chat'
              : 'Open chat'
          }
        >
          <Icon
            type={
              open
                ? 'close'
                : 'chat'
            }
          />
        </button>
      </div>
    </div>
  )
}
