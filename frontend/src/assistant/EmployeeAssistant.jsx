import { useEffect, useRef, useState } from 'preact/hooks'
import { askAssistant, knowledgeUpdatedDate, listTopics } from './api'
import { useSpeechRecognition, useSpeechSynthesis, useMicLevel } from './useSpeech'
import { useLanguage } from '../language/LanguageContext'
import { AssistantOrb } from './AssistantOrb'
import './assistant.css'

const QUICK_TOPICS = listTopics().slice(0, 6)
const BAR_WEIGHTS = [0.5, 0.85, 1, 0.7, 0.4]

function ChatBubbleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4h16v12H7l-3 3V4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="2" />
      <path d="M5 11a7 7 0 0014 0M12 18v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="12" height="12" rx="2" stroke="currentColor" stroke-width="2" />
      <path d="M15 10l6-3v10l-6-3" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
    </svg>
  )
}

function CameraOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3l18 18M15 10l6-3v10l-3.5-1.75M3 6h9a3 3 0 013 3v2.5M15 18H5a2 2 0 01-2-2V8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 12h16M13 5l7 7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
    </svg>
  )
}

function VolumeIcon({ muted }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 9v6h4l5 4V5L8 9H4z" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />
      {muted ? (
        <path d="M17 9l5 6M22 9l-5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      ) : (
        <path d="M17 8a5 5 0 010 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      )}
    </svg>
  )
}

function HangUpIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 15c5-4 13-4 18 0l-1.5 3c-.4.8-1.4 1.1-2.1.6l-2.4-1.7a1.5 1.5 0 01-.6-1.5l.3-1.4a9 9 0 00-7.4 0l.3 1.4a1.5 1.5 0 01-.6 1.5l-2.4 1.7c-.7.5-1.7.2-2.1-.6L3 15z"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linejoin="round"
        fill="currentColor"
        fill-opacity="0.15"
      />
    </svg>
  )
}

function SourceLine({ at, sources, escalate }) {
  if (escalate) {
    return <div class="assistant-source-line assistant-source-line--escalate">{at.escalateTag}</div>
  }
  if (!sources || sources.length === 0) return null
  return (
    <div class="assistant-source-line">
      {sources.map((s) => (
        <span class="assistant-source-pill" key={s.ref}>
          {at.sourceLabel}: {s.title} · {s.ref}
        </span>
      ))}
    </div>
  )
}

function Followups({ items, onPick }) {
  if (!items || items.length === 0) return null
  return (
    <div class="assistant-followups">
      {items.map((f) => (
        <button type="button" key={f} onClick={() => onPick(f)}>
          {f}
        </button>
      ))}
    </div>
  )
}

export function EmployeeAssistant() {
  const { assistant: at } = useLanguage()

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('chat') // 'chat' | 'voice' | 'video'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceMuted, setVoiceMuted] = useState(false)
  const [cameraOn, setCameraOn] = useState(true)
  const [cameraError, setCameraError] = useState(null)

  const scrollRef = useRef(null)
  const videoRef = useRef(null)

  const recognition = useSpeechRecognition({})
  const tts = useSpeechSynthesis()
  const micLevel = useMicLevel(recognition.listening)

  // Let the rest of the app (e.g. a dashboard callout) open the Copilot
  // straight into a given mode, the same way the citizen chat widget
  // listens for `gdrfa:open-chat`.
  useEffect(() => {
    function handleExternalOpen(e) {
      setOpen(true)
      if (e?.detail?.mode) setMode(e.detail.mode)
    }
    window.addEventListener('gdrfa:open-assistant', handleExternalOpen)
    return () => window.removeEventListener('gdrfa:open-assistant', handleExternalOpen)
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, open, mode])

  // Release the mic / stop speaking whenever the panel closes or the mode
  // switches away from voice/video, so nothing keeps listening or talking
  // in the background.
  useEffect(() => {
    if (!open || mode === 'chat') {
      recognition.stop()
      tts.cancel()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  // Camera lifecycle for video mode only — opened lazily, torn down on
  // mode change, camera-off, or panel close so the light actually goes off.
  useEffect(() => {
    if (!open || mode !== 'video' || !cameraOn) return undefined
    let stream
    let cancelled = false
    setCameraError(null)

    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        if (videoRef.current) videoRef.current.srcObject = s
      })
      .catch(() => setCameraError(true))

    return () => {
      cancelled = true
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [open, mode, cameraOn])

  async function sendMessage(text) {
    const trimmed = (text || '').trim()
    if (!trimmed || loading) return

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setInput('')
    setLoading(true)

    try {
      const result = await askAssistant(trimmed)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: result.reply,
          sources: result.sources || [],
          followups: result.followups || [],
          escalate: result.escalate,
        },
      ])
      if (mode !== 'chat' && !voiceMuted) {
        tts.speak(result.reply)
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: "Something went wrong reaching the Copilot. Try again in a moment.", sources: [], followups: [] },
      ])
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  function toggleMic() {
    if (recognition.listening) {
      recognition.stop()
      return
    }
    recognition.start((finalText) => {
      recognition.stop()
      sendMessage(finalText)
    })
  }

  function toggleOpen() {
    setOpen((v) => !v)
  }

  const orbState = recognition.listening ? 'listening' : loading ? 'thinking' : tts.speaking ? 'speaking' : 'idle'
  const statusLabel =
    recognition.listening ? at.listeningLabel : loading ? at.thinkingLabel : tts.speaking ? at.speakingLabel : at.idleLabel

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
  const captionText = recognition.listening ? recognition.interimText || at.tapToAsk : lastAssistant?.text || at.tapToAsk

  return (
    <div class="assistant-widget">
      {open && <div class="assistant-backdrop" onClick={() => setOpen(false)} />}

      {open && (
        <div class="assistant-panel">
          <header class="assistant-header">
            <AssistantOrb size={38} state={orbState} level={micLevel} />
            <div class="assistant-header-text">
              <strong>{at.panelTitle}</strong>
              <span>{at.updatedLabel(knowledgeUpdatedDate())}</span>
            </div>
            <button type="button" class="assistant-close" onClick={() => setOpen(false)} aria-label={at.closeAriaLabel}>
              <CloseIcon />
            </button>
          </header>

          <div class="assistant-modes" role="tablist">
            <button type="button" class={mode === 'chat' ? 'active' : ''} onClick={() => setMode('chat')}>
              <ChatBubbleIcon /> {at.modeChat}
            </button>
            <button type="button" class={mode === 'voice' ? 'active' : ''} onClick={() => setMode('voice')}>
              <MicIcon /> {at.modeVoice}
            </button>
            <button type="button" class={mode === 'video' ? 'active' : ''} onClick={() => setMode('video')}>
              <VideoIcon /> {at.modeVideo}
            </button>
          </div>

          {/* CHAT MODE */}
          {mode === 'chat' && (
            <>
              <div class="assistant-body assistant-chat-body" ref={scrollRef}>
                {messages.length === 0 && (
                  <div class="assistant-empty">
                    <p class="assistant-empty-heading">{at.emptyHeading}</p>
                    <p class="assistant-empty-sub">{at.emptySub}</p>
                    <p class="assistant-topics-label">{at.topicsLabel}</p>
                    <div class="assistant-topic-grid">
                      {QUICK_TOPICS.map((topic) => (
                        <button type="button" key={topic.id} class="assistant-topic-chip" onClick={() => sendMessage(topic.title)}>
                          <span class="assistant-topic-category">{topic.category}</span>
                          <span>{topic.title}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} class={`assistant-message ${m.role}`}>
                    <div class="assistant-bubble">
                      {m.text.split('\n').map((line, j) => (
                        <p key={j}>{line}</p>
                      ))}
                    </div>
                    {m.role === 'assistant' && <SourceLine at={at} sources={m.sources} escalate={m.escalate} />}
                    {m.role === 'assistant' && <Followups items={m.followups} onPick={sendMessage} />}
                  </div>
                ))}

                {loading && (
                  <div class="assistant-message assistant">
                    <div class="assistant-bubble assistant-typing">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}
              </div>

              <form class="assistant-input-row" onSubmit={handleSubmit}>
                {recognition.supported && (
                  <button
                    type="button"
                    class={`assistant-mic-inline ${recognition.listening ? 'listening' : ''}`}
                    onClick={toggleMic}
                    aria-label={recognition.listening ? at.micStopAriaLabel : at.micAriaLabel}
                  >
                    <MicIcon />
                  </button>
                )}
                <input
                  type="text"
                  placeholder={at.inputPlaceholder}
                  value={input}
                  onInput={(e) => setInput(e.target.value)}
                />
                <button type="submit" disabled={loading || !input.trim()} aria-label={at.sendAriaLabel}>
                  <SendIcon />
                </button>
              </form>
            </>
          )}

          {/* VOICE MODE */}
          {mode === 'voice' && (
            <div class="assistant-body assistant-voice-body">
              <div class="assistant-voice-stage">
                <AssistantOrb size={112} state={orbState} level={micLevel} />
                <div class="assistant-bars" aria-hidden="true">
                  {BAR_WEIGHTS.map((w, i) => (
                    <span
                      key={i}
                      style={{ transform: `scaleY(${recognition.listening ? 0.2 + micLevel * w : 0.12})` }}
                    />
                  ))}
                </div>
                <p class="assistant-status-label">{statusLabel}</p>
              </div>

              <div class="assistant-transcript" ref={scrollRef}>
                <p class="assistant-transcript-hint">{at.transcriptLabel}</p>
                <p class="assistant-transcript-text">{captionText}</p>
              </div>

              <div class="assistant-voice-controls">
                <button
                  type="button"
                  class={`assistant-mic-big ${recognition.listening ? 'listening' : ''}`}
                  onClick={toggleMic}
                  disabled={!recognition.supported}
                  aria-label={recognition.listening ? at.micStopAriaLabel : at.micAriaLabel}
                >
                  <MicIcon />
                </button>
                <button
                  type="button"
                  class="assistant-control-pill"
                  onClick={() => setVoiceMuted((v) => !v)}
                  aria-label={voiceMuted ? at.unmuteAiVoice : at.muteAiVoice}
                >
                  <VolumeIcon muted={voiceMuted} />
                </button>
              </div>
              {!recognition.supported && <p class="assistant-hint">{at.micUnsupported}</p>}

              <form class="assistant-input-row assistant-input-row--fallback" onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder={at.inputPlaceholder}
                  value={input}
                  onInput={(e) => setInput(e.target.value)}
                />
                <button type="submit" disabled={loading || !input.trim()} aria-label={at.sendAriaLabel}>
                  <SendIcon />
                </button>
              </form>
            </div>
          )}

          {/* VIDEO MODE */}
          {mode === 'video' && (
            <div class="assistant-body assistant-video-body">
              <div class="assistant-video-grid">
                <div class="assistant-video-tile assistant-video-tile--ai">
                  <AssistantOrb size={72} state={orbState} level={micLevel} />
                  <span class="assistant-video-tile-label">{at.aiLabel}</span>
                </div>
                <div class="assistant-video-tile assistant-video-tile--self">
                  {cameraOn && !cameraError ? (
                    <video ref={videoRef} autoplay playsinline muted class="assistant-self-video" />
                  ) : (
                    <div class="assistant-camera-placeholder">
                      <CameraOffIcon />
                      <span>{cameraError ? at.cameraDeniedLabel : at.cameraOffLabel}</span>
                    </div>
                  )}
                  <span class="assistant-video-tile-label">{at.youLabel}</span>
                </div>
              </div>

              <div class="assistant-caption-bar">{captionText}</div>

              <div class="assistant-voice-controls">
                <button
                  type="button"
                  class={`assistant-mic-big ${recognition.listening ? 'listening' : ''}`}
                  onClick={toggleMic}
                  disabled={!recognition.supported}
                  aria-label={recognition.listening ? at.micStopAriaLabel : at.micAriaLabel}
                >
                  <MicIcon />
                </button>
                <button
                  type="button"
                  class="assistant-control-pill"
                  onClick={() => setCameraOn((v) => !v)}
                  aria-label={cameraOn ? at.cameraOffLabel : at.cameraOnLabel}
                >
                  {cameraOn ? <VideoIcon /> : <CameraOffIcon />}
                </button>
                <button
                  type="button"
                  class="assistant-control-pill"
                  onClick={() => setVoiceMuted((v) => !v)}
                  aria-label={voiceMuted ? at.unmuteAiVoice : at.muteAiVoice}
                >
                  <VolumeIcon muted={voiceMuted} />
                </button>
                <button type="button" class="assistant-control-pill assistant-control-pill--end" onClick={() => setMode('chat')} aria-label={at.endCallLabel}>
                  <HangUpIcon />
                </button>
              </div>

              <form class="assistant-input-row assistant-input-row--fallback" onSubmit={handleSubmit}>
                <input
                  type="text"
                  placeholder={at.inputPlaceholder}
                  value={input}
                  onInput={(e) => setInput(e.target.value)}
                />
                <button type="submit" disabled={loading || !input.trim()} aria-label={at.sendAriaLabel}>
                  <SendIcon />
                </button>
              </form>
            </div>
          )}

          <p class="assistant-internal-note">{at.internalNote}</p>
        </div>
      )}

      <button type="button" class="assistant-launcher" onClick={toggleOpen}>
        <AssistantOrb size={28} state="idle" />
        <span class="assistant-launcher-label">{at.launcherLabel}</span>
        <span class="assistant-launcher-badge">{at.launcherBadge}</span>
      </button>
    </div>
  )
}
