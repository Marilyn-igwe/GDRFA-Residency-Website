import { useEffect, useRef, useState } from 'preact/hooks'
import { askChatbot } from './api'
import { useLanguage } from '../language/LanguageContext'
import {
  useSpeechRecognition,
  useSpeechSynthesis,
} from '../assistant/useSpeech'
import './chatbot.css'

const SPEECH_LANGUAGES = {
  en: 'en-US',
  ar: 'ar-AE',
  hi: 'hi-IN',
  tl: 'fil-PH',
  ur: 'ur-PK',
  bn: 'bn-BD',
}

function Icon({ type }) {
  if (type === 'close') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    )
  }

  if (type === 'mic') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="2" />
        <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    )
  }

  if (type === 'send') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 12h16M13 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    )
  }

  if (type === 'volume-off') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 9v6h4l5 4V5L8 9H4zM17 9l5 6M22 9l-5 6" stroke="currentColor" stroke-width="2" />
      </svg>
    )
  }

  if (type === 'volume') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M4 9v6h4l5 4V5L8 9H4zM17 8a5 5 0 010 8" stroke="currentColor" stroke-width="2" />
      </svg>
    )
  }

  if (type === 'new') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    )
  }

  if (type === 'end') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 4l16 16M5 12a7 7 0 0011.7 5.2M19 12A7 7 0 007.3 6.8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
    )
  }

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path d="M4 4h16v12H7l-3 3V4z" stroke="currentColor" stroke-width="2" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="12" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

function prepareForSpeech(text, locale) {
  return String(text).replace(
    /\b([01]?\d|2[0-3]):([0-5]\d)\b/g,
    (_, hour, minute) => {
      const time = new Date(
        2000,
        0,
        1,
        Number(hour),
        Number(minute)
      )

      return new Intl.DateTimeFormat(locale, {
        hour: 'numeric',
        minute: minute === '00' ? undefined : '2-digit',
        hour12: true,
      }).format(time)
    }
  )
}

export function ChatWidget() {
  const { chat: ct, code } = useLanguage()
  const speechLang =
    SPEECH_LANGUAGES[code] || 'en-US'

  const recognition =
    useSpeechRecognition({ lang: speechLang })

  const tts = useSpeechSynthesis()

  function welcomeMessage() {
    return {
      role: 'bot',
      text: ct.welcomeText,
      followups: ct.welcomeFollowups,
    }
  }

  const [open, setOpen] = useState(false)
  const [everOpened, setEverOpened] = useState(false)
  const [messages, setMessages] =
    useState([welcomeMessage()])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceReplies, setVoiceReplies] = useState(true)
  const [chatEnded, setChatEnded] = useState(false)

  const scrollRef = useRef(null)

  useEffect(() => {
    function openChat() {
      setOpen(true)
      setEverOpened(true)
    }

    window.addEventListener('gdrfa:open-chat', openChat)

    return () =>
      window.removeEventListener(
        'gdrfa:open-chat',
        openChat
      )
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop =
        scrollRef.current.scrollHeight
    }
  }, [messages, open])

  useEffect(() => {
    if (!open) {
      recognition.cancel()
      tts.cancel()
    }
  }, [open])

  function stopAllAudio() {
    recognition.cancel()
    tts.cancel()
  }

  function startNewChat() {
    stopAllAudio()
    setMessages([welcomeMessage()])
    setInput('')
    setLoading(false)
    setChatEnded(false)
  }

  function endChat() {
    stopAllAudio()
    setInput('')
    setChatEnded(true)
  }

  async function sendMessage(text) {
    const question = String(text || '').trim()

    if (!question || loading || chatEnded) return

    const history = messages.slice(-8).map((message) => ({
      role:
        message.role === 'bot' ? 'assistant' : 'user',
      content: message.text,
    }))

    setMessages((current) => [
      ...current,
      { role: 'user', text: question },
    ])

    setInput('')
    setLoading(true)

    try {
      const result = await askChatbot(question, {
        history,
        language: code,
      })

      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: result.reply,
          followups: result.followups || [],
          source: result.source,
        },
      ])

      if (voiceReplies) {
        tts.speak(
          prepareForSpeech(result.reply, speechLang),
          { lang: speechLang }
        )
      }
    } catch (error) {
      console.error(error)

      setMessages((current) => [
        ...current,
        {
          role: 'bot',
          text: ct.errorText,
          followups: [],
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  function toggleMic() {
    if (chatEnded || loading) return

    if (recognition.listening) {
      // Finalize and send everything spoken so far.
      recognition.stop()
      return
    }

    // Prevent the microphone hearing the assistant.
    tts.cancel()

    recognition.start((transcript) => {
      if (transcript.trim()) {
        sendMessage(transcript)
      }
    })
  }

  function closeChat() {
    stopAllAudio()
    setOpen(false)
  }

  return (
    <div class="chat-widget">
      {open && (
        <div class="chat-panel">
          <header class="chat-header">
            <div class="chat-header-icon">
              <Icon type="chat" />
            </div>

            <div class="chat-header-copy">
              <strong>{ct.title}</strong>
              <span>{ct.subtitle}</span>
            </div>

            <div class="chat-header-actions">
              <button
                type="button"
                class="chat-header-action"
                onClick={startNewChat}
                title="New chat"
              >
                <Icon type="new" />
              </button>

              <button
                type="button"
                class="chat-header-action"
                onClick={endChat}
                disabled={chatEnded}
                title="End chat"
              >
                <Icon type="end" />
              </button>

              <button
                type="button"
                class="chat-close"
                onClick={closeChat}
                title="Close"
              >
                <Icon type="close" />
              </button>
            </div>
          </header>

          <div class="chat-messages" ref={scrollRef}>
            {messages.map((message, index) => (
              <div
                key={index}
                class={`chat-message ${message.role}`}
              >
                <div class="chat-bubble">
                  {message.text
                    .split('\n')
                    .map((line, lineIndex) => (
                      <p key={lineIndex}>{line}</p>
                    ))}
                </div>

                {message.role === 'bot' &&
                  message.source && (
                    <a
                      class="chat-source"
                      href={message.source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {message.source.title}
                    </a>
                  )}

                {message.role === 'bot' &&
                  message.followups?.length > 0 && (
                    <div class="chat-followups">
                      {message.followups.map((followup) => (
                        <button
                          key={followup}
                          type="button"
                          disabled={chatEnded}
                          onClick={() =>
                            sendMessage(followup)
                          }
                        >
                          {followup}
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            ))}

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

          {chatEnded && (
            <div class="chat-ended">
              <strong>Chat ended</strong>
              <p>
                Start a new chat or continue this conversation.
              </p>

              <div class="chat-ended-actions">
                <button
                  type="button"
                  onClick={startNewChat}
                >
                  Start new chat
                </button>

                <button
                  type="button"
                  class="secondary"
                  onClick={() => setChatEnded(false)}
                >
                  Continue chat
                </button>
              </div>
            </div>
          )}

          <form
            class="chat-input-row"
            onSubmit={(event) => {
              event.preventDefault()
              sendMessage(input)
            }}
          >
            {recognition.supported && (
              <button
                type="button"
                class={`chat-voice-button ${
                  recognition.listening
                    ? 'listening'
                    : ''
                }`}
                onClick={toggleMic}
                disabled={chatEnded || loading}
                title={
                  recognition.listening
                    ? 'Finish speaking'
                    : 'Speak'
                }
              >
                <Icon type="mic" />
              </button>
            )}

            <input
              type="text"
              value={input}
              disabled={chatEnded}
              placeholder={
                chatEnded
                  ? 'Start or continue the chat'
                  : ct.placeholder
              }
              onInput={(event) =>
                setInput(event.target.value)
              }
            />

            <button
              type="button"
              class={`chat-voice-button ${
                voiceReplies ? 'active' : ''
              }`}
              onClick={() => {
                setVoiceReplies((current) => !current)
                tts.cancel()
              }}
              title={
                voiceReplies
                  ? 'Mute spoken replies'
                  : 'Enable spoken replies'
              }
            >
              <Icon
                type={
                  voiceReplies
                    ? 'volume'
                    : 'volume-off'
                }
              />
            </button>

            <button
              type="submit"
              disabled={
                chatEnded ||
                loading ||
                !input.trim()
              }
            >
              <Icon type="send" />
            </button>
          </form>

          {recognition.listening && (
            <div class="chat-listening">
              <span>
                Listening… {recognition.interimText}
              </span>

              <button
                type="button"
                onClick={recognition.stop}
              >
                Finish speaking
              </button>
            </div>
          )}

          {!recognition.supported && (
            <div class="chat-listening">
              Voice recognition requires Chrome or Edge.
            </div>
          )}
        </div>
      )}

      <div class="chat-toggle-row">
        {!open && !everOpened && (
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
        >
          <Icon type={open ? 'close' : 'chat'} />
        </button>
      </div>
    </div>
  )
}