import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { askChatbot } from '../chatbot/api'
import { useLanguage } from '../language/LanguageContext'
import './application-support.css'

const HELP_OPTIONS = [
  {
    id: 'documents',
    icon: 'DOC',
    label: 'Required documents',
    question: 'Please explain the required documents for this step.'
  },
  {
    id: 'question',
    icon: '?',
    label: 'Help with this question',
    question:
      'Please explain what this question is asking and what information I should provide.'
  },
  {
    id: 'upload',
    icon: 'UP',
    label: 'Document upload problem',
    question: 'I cannot upload my document. What should I check?'
  },
  {
    id: 'officer',
    icon: 'AG',
    label: 'Assistance from an officer',
    question:
      'I need assistance from an officer. What is the appropriate next step?'
  }
]

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function collectPageContext() {
  const root = document.querySelector(
    '.booking-flow, .family-flow, .hc-form'
  )

  if (!root) {
    return {
      application: 'GDRFA service application',
      step: 'Application form',
      details: []
    }
  }

  const headings = [...root.querySelectorAll('h1, h2, h3')]
    .filter((node) => node.offsetParent !== null)
    .map((node) => clean(node.textContent))
    .filter(Boolean)

  const currentProgress = clean(
    root.querySelector(
      '.booking-progress-step.current .booking-progress-label'
    )?.textContent
  )

  const selectedServiceText = clean(
    root.querySelector(
      '.booking-hint, .family-service-name, .hc-category-card.selected strong'
    )?.textContent
  )

  const serviceFromHeading = headings
    .find((heading) => /\bfor\s+.+/i.test(heading))
    ?.match(/\bfor\s+(.+)$/i)?.[1]

  const selectedService = clean(
    serviceFromHeading || selectedServiceText.split('·')[0]
  )

  const genericHeading =
    /what would you like to do|application form/i.test(
      headings[0] || ''
    )

  const labels = [...root.querySelectorAll('label')]
    .filter((node) => node.offsetParent !== null)
    .map((node) =>
      clean(node.childNodes[0]?.textContent || node.textContent)
    )
    .filter((label) => label && label.length < 160)
    .slice(0, 12)

  const errors = [
    ...root.querySelectorAll(
      '.booking-error, .family-error, .hc-error'
    )
  ]
    .filter((node) => node.offsetParent !== null)
    .map((node) => clean(node.textContent))
    .filter(Boolean)

  const requirements = [
    ...root.querySelectorAll(
      '.booking-docs-callout-list li, ' +
        '.booking-doc-row strong, ' +
        '.hc-doc-checkbox, ' +
        '.family-doc-row'
    )
  ]
    .filter((node) => node.offsetParent !== null)
    .map((node) => clean(node.textContent))
    .filter(Boolean)
    .slice(0, 15)

  return {
    application:
      selectedService ||
      (!genericHeading && headings[0]) ||
      'a GDRFA service application',

    step:
      currentProgress ||
      headings[headings.length - 1] ||
      'Application form',

    details: [...labels, ...requirements, ...errors].slice(0, 20)
  }
}

function buildQuestion(question, context) {
  const detailText = context.details.length
    ? context.details.join('; ')
    : 'No additional labels are visible.'

  return `${question}

Current application context:
Application: ${context.application}
Current step: ${context.step}
Visible requirements and labels: ${detailText}`
}

export function ApplicationSupport() {
  const { code = 'en' } = useLanguage()

  const [open, setOpen] = useState(false)
  const [context, setContext] = useState(null)
  const [input, setInput] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const panelRef = useRef(null)

  useEffect(() => {
    if (!open) return

    setContext(collectPageContext())
    panelRef.current?.focus()
  }, [open])

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const title = useMemo(
    () => context?.application || 'your application',
    [context]
  )

  async function requestHelp(question) {
    const latestContext = collectPageContext()

    setContext(latestContext)
    setLoading(true)
    setError('')
    setAnswer('')

    try {
      const result = await askChatbot(
        buildQuestion(question, latestContext),
        { language: code }
      )

      setAnswer(
        result.reply ||
          'No guidance is available for this question.'
      )
    } catch {
      setError(
        'Application support is temporarily unavailable. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function submitQuestion(event) {
    event.preventDefault()

    const question = input.trim()

    if (!question || loading) return

    setInput('')
    await requestHelp(question)
  }

  return (
    <div class="application-support">
      {open && (
        <section
          class="application-support-panel"
          ref={panelRef}
          tabIndex={-1}
          aria-label="Application support"
        >
          <header class="application-support-header">
            <div>
              <span class="application-support-kicker">
                APPLICATION SUPPORT
              </span>

              <h2>How can we help?</h2>
            </div>

            <button
              type="button"
              class="application-support-close"
              onClick={() => setOpen(false)}
              aria-label="Close support"
            >
              ×
            </button>
          </header>

          <p class="application-support-context">
            You are currently completing{' '}
            <strong>{title}</strong>.
          </p>

          {!answer && !loading && (
            <div class="application-support-options">
              {HELP_OPTIONS.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  onClick={() =>
                    requestHelp(option.question)
                  }
                >
                  <span
                    class="application-support-option-icon"
                    aria-hidden="true"
                  >
                    {option.icon}
                  </span>

                  <span>{option.label}</span>

                  <span
                    class="application-support-chevron"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              ))}
            </div>
          )}

          {loading && (
            <div
              class="application-support-loading"
              role="status"
            >
              <span class="application-support-spinner" />
              Checking the relevant service information
            </div>
          )}

          {answer && !loading && (
            <div
              class="application-support-answer"
              aria-live="polite"
            >
              <span class="application-support-answer-label">
                GUIDANCE
              </span>

              <p>{answer}</p>

              <button
                type="button"
                onClick={() => setAnswer('')}
              >
                View other help topics
              </button>
            </div>
          )}

          {error && (
            <p
              class="application-support-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <form
            class="application-support-form"
            onSubmit={submitQuestion}
          >
            <label for="application-support-question">
              Ask a question about this step
            </label>

            <div>
              <input
                id="application-support-question"
                value={input}
                onInput={(event) =>
                  setInput(event.currentTarget.value)
                }
                placeholder="Type your question"
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
              >
                Send
              </button>
            </div>
          </form>

          <p class="application-support-privacy">
            Form answers and uploaded files are not shared
            with this support tool.
          </p>
        </section>
      )}

      <button
        type="button"
        class="application-support-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Open application support"
      >
        <span aria-hidden="true">?</span>
        I'm stuck
      </button>
    </div>
  )
}