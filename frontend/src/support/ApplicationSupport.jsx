import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'preact/hooks'
import {
  askChatbot
} from '../chatbot/api'
import {
  useLanguage
} from '../language/LanguageContext'
import {
  getApplicationContext,
  subscribeToApplicationContext
} from './applicationContext'
import './application-support.css'

const HELP_OPTIONS = [
  {
    id: 'documents',
    icon: 'DOC',
    label: 'Required documents',
    question:
      'Please explain the required documents for this step.'
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
    question:
      'I cannot upload my document. What should I check?'
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
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function unique(values) {
  return [...new Set(
    values.filter(Boolean)
  )]
}

function findFieldLabel(element) {
  if (!element) {
    return ''
  }

  if (element.id) {
    const matchingLabel =
      document.querySelector(
        `label[for="${CSS.escape(element.id)}"]`
      )

    if (matchingLabel) {
      return clean(
        matchingLabel.textContent
      )
    }
  }

  const parentLabel =
    element.closest('label')

  if (parentLabel) {
    return clean(
      parentLabel.textContent
    )
  }

  const fieldContainer =
    element.closest(
      '.hc-field, ' +
      '.booking-field, ' +
      '.family-field, ' +
      '.booking-doc-row, ' +
      '.family-doc-row'
    )

  const nearbyLabel =
    fieldContainer?.querySelector(
      'label, strong, h3'
    )

  return clean(
    nearbyLabel?.textContent
  )
}

function collectUploadRestrictions(root) {
  if (!root) {
    return {
      acceptedFileTypes: [],
      maximumFileSize: ''
    }
  }

  const inputs = [
    ...root.querySelectorAll(
      'input[type="file"]'
    )
  ]

  const acceptedFileTypes = []

  for (const input of inputs) {
    const accept =
      clean(
        input.getAttribute('accept')
      )

    if (accept) {
      acceptedFileTypes.push(
        ...accept
          .split(',')
          .map(clean)
      )
    }
  }

  const visibleText =
    clean(root.textContent)

  const sizeMatch =
    visibleText.match(
      /(?:maximum|max|up to)\s*(\d+(?:\.\d+)?)\s*(mb|kb)/i
    )

  return {
    acceptedFileTypes:
      unique(acceptedFileTypes),

    maximumFileSize:
      sizeMatch
        ? `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}`
        : ''
  }
}

function collectDomContext() {
  const root =
    document.querySelector(
      '.booking-flow, .family-flow, .hc-form'
    )

  if (!root) {
    return {
      applicationType: '',
      serviceId: '',
      serviceName:
        'GDRFA service application',
      stepId: '',
      stepName:
        'Application form',
      selectedCategory: '',
      selectedApplicant: '',
      requiredDocuments: [],
      missingDocuments: [],
      visibleErrors: [],
      acceptedFileTypes: [],
      maximumFileSize: '',
      focusedField: ''
    }
  }

  const headings = [
    ...root.querySelectorAll(
      'h1, h2, h3'
    )
  ]
    .filter(
      (node) =>
        node.offsetParent !== null
    )
    .map(
      (node) =>
        clean(node.textContent)
    )
    .filter(Boolean)

  const currentProgress =
    clean(
      root.querySelector(
        '.booking-progress-step.current ' +
        '.booking-progress-label'
      )?.textContent
    )

  const selectedServiceText =
    clean(
      root.querySelector(
        '.booking-hint, ' +
        '.family-service-name, ' +
        '.hc-category-card.selected strong'
      )?.textContent
    )

  const serviceFromHeading =
    headings
      .find(
        (heading) =>
          /\bfor\s+.+/i.test(
            heading
          )
      )
      ?.match(
        /\bfor\s+(.+)$/i
      )?.[1]

  const selectedService =
    clean(
      serviceFromHeading ||
      selectedServiceText.split('·')[0]
    )

  const genericHeading =
    /what would you like to do|application form/i.test(
      headings[0] || ''
    )

  const requiredDocuments = [
    ...root.querySelectorAll(
      '.booking-docs-callout-list li, ' +
      '.booking-doc-row strong, ' +
      '.hc-doc-checkbox, ' +
      '.family-doc-row'
    )
  ]
    .filter(
      (node) =>
        node.offsetParent !== null
    )
    .map(
      (node) =>
        clean(node.textContent)
    )
    .filter(Boolean)
    .slice(0, 30)

  const visibleErrors = [
    ...root.querySelectorAll(
      '.booking-error, ' +
      '.family-error, ' +
      '.hc-error'
    )
  ]
    .filter(
      (node) =>
        node.offsetParent !== null
    )
    .map(
      (node) =>
        clean(node.textContent)
    )
    .filter(Boolean)

  const uploadRestrictions =
    collectUploadRestrictions(root)

  return {
    applicationType: '',
    serviceId: '',

    serviceName:
      selectedService ||
      (
        !genericHeading &&
        headings[0]
      ) ||
      'a GDRFA service application',

    stepId: '',

    stepName:
      currentProgress ||
      headings[
        headings.length - 1
      ] ||
      'Application form',

    selectedCategory: '',
    selectedApplicant: '',

    requiredDocuments,
    missingDocuments: [],
    visibleErrors,

    acceptedFileTypes:
      uploadRestrictions
        .acceptedFileTypes,

    maximumFileSize:
      uploadRestrictions
        .maximumFileSize,

    focusedField:
      findFieldLabel(
        document.activeElement
      )
  }
}

function mergeContext(
  structuredContext,
  domContext
) {
  const structured =
    structuredContext || {}

  return {
    applicationType:
      structured.applicationType ||
      domContext.applicationType,

    serviceId:
      structured.serviceId ||
      domContext.serviceId,

    serviceName:
      structured.serviceName ||
      domContext.serviceName,

    stepId:
      structured.stepId ||
      domContext.stepId,

    stepName:
      structured.stepName ||
      domContext.stepName,

    selectedCategory:
      structured.selectedCategory ||
      domContext.selectedCategory,

    selectedApplicant:
      structured.selectedApplicant ||
      domContext.selectedApplicant,

    requiredDocuments:
      unique([
        ...(
          structured
            .requiredDocuments || []
        ),
        ...(
          domContext
            .requiredDocuments || []
        )
      ]).slice(0, 30),

    missingDocuments:
      unique([
        ...(
          structured
            .missingDocuments || []
        ),
        ...(
          domContext
            .missingDocuments || []
        )
      ]).slice(0, 30),

    visibleErrors:
      unique([
        ...(
          structured
            .visibleErrors || []
        ),
        ...(
          domContext
            .visibleErrors || []
        )
      ]).slice(0, 10),

    acceptedFileTypes:
      unique([
        ...(
          structured
            .acceptedFileTypes || []
        ),
        ...(
          domContext
            .acceptedFileTypes || []
        )
      ]),

    maximumFileSize:
      structured.maximumFileSize ||
      domContext.maximumFileSize,

    focusedField:
      domContext.focusedField
  }
}

function collectCurrentContext(
  structuredContext
) {
  return mergeContext(
    structuredContext ||
    getApplicationContext(),
    collectDomContext()
  )
}

function contextLine(
  label,
  value
) {
  if (!value) {
    return ''
  }

  return `${label}: ${value}`
}

function arrayContextLine(
  label,
  values
) {
  if (!values?.length) {
    return ''
  }

  return (
    `${label}: ` +
    values.join('; ')
  )
}

function buildQuestion(
  question,
  context
) {
  const lines = [
    question,
    '',
    'Current application context:',

    contextLine(
      'Application type',
      context.applicationType
    ),

    contextLine(
      'Service ID',
      context.serviceId
    ),

    contextLine(
      'Application',
      context.serviceName
    ),

    contextLine(
      'Current step ID',
      context.stepId
    ),

    contextLine(
      'Current step',
      context.stepName
    ),

    contextLine(
      'Selected category',
      context.selectedCategory
    ),

    contextLine(
      'Selected applicant',
      context.selectedApplicant
    ),

    contextLine(
      'Focused field',
      context.focusedField
    ),

    arrayContextLine(
      'Required documents',
      context.requiredDocuments
    ),

    arrayContextLine(
      'Missing documents',
      context.missingDocuments
    ),

    arrayContextLine(
      'Visible validation messages',
      context.visibleErrors
    ),

    arrayContextLine(
      'Accepted file types',
      context.acceptedFileTypes
    ),

    contextLine(
      'Maximum file size',
      context.maximumFileSize
    )
  ].filter(
    (line) => line !== ''
  )

  return lines.join('\n')
}

export function ApplicationSupport() {
  const {
    code = 'en'
  } = useLanguage()

  const [open, setOpen] =
    useState(false)

  const [
    structuredContext,
    setStructuredContext
  ] = useState(
    getApplicationContext()
  )

  const [context, setContext] =
    useState(null)

  const [input, setInput] =
    useState('')

  const [answer, setAnswer] =
    useState('')

  const [loading, setLoading] =
    useState(false)

  const [error, setError] =
    useState('')

  const panelRef =
    useRef(null)

  useEffect(() => {
    return subscribeToApplicationContext(
      (nextContext) => {
        setStructuredContext(
          nextContext
        )

        if (open) {
          setContext(
            collectCurrentContext(
              nextContext
            )
          )
        }
      }
    )
  }, [open])

  useEffect(() => {
    if (!open) return

    setContext(
      collectCurrentContext(
        structuredContext
      )
    )

    panelRef.current?.focus()
  }, [open, structuredContext])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {
      window.removeEventListener(
        'keydown',
        handleKeyDown
      )
    }
  }, [])

  const title = useMemo(
    () =>
      context?.serviceName ||
      'your application',
    [context]
  )

  async function requestHelp(
    question
  ) {
    const latestContext =
      collectCurrentContext(
        structuredContext
      )

    setContext(latestContext)
    setLoading(true)
    setError('')
    setAnswer('')

    try {
      const result =
        await askChatbot(
          buildQuestion(
            question,
            latestContext
          ),
          {
            language: code
          }
        )

      setAnswer(
        result.reply ||
        'No guidance is available for this question.'
      )
    } catch (requestError) {
      setError(
        requestError?.message ||
        'Application support is temporarily unavailable. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  async function submitQuestion(
    event
  ) {
    event.preventDefault()

    const question =
      input.trim()

    if (
      !question ||
      loading
    ) {
      return
    }

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

              <h2>
                How can we help?
              </h2>
            </div>

            <button
              type="button"
              class="application-support-close"
              onClick={() =>
                setOpen(false)
              }
              aria-label="Close support"
            >
              ×
            </button>
          </header>

          <p class="application-support-context">
            You are currently completing{' '}
            <strong>
              {title}
            </strong>.
          </p>

          {!answer && !loading && (
            <div class="application-support-options">
              {HELP_OPTIONS.map(
                (option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() =>
                      requestHelp(
                        option.question
                      )
                    }
                  >
                    <span
                      class="application-support-option-icon"
                      aria-hidden="true"
                    >
                      {option.icon}
                    </span>

                    <span>
                      {option.label}
                    </span>

                    <span
                      class="application-support-chevron"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </button>
                )
              )}
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
                onClick={() =>
                  setAnswer('')
                }
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
            onSubmit={
              submitQuestion
            }
          >
            <label for="application-support-question">
              Ask a question about this step
            </label>

            <div>
              <input
                id="application-support-question"
                value={input}
                onInput={(event) =>
                  setInput(
                    event.currentTarget
                      .value
                  )
                }
                placeholder="Type your question"
                autoComplete="off"
              />

              <button
                type="submit"
                disabled={
                  !input.trim() ||
                  loading
                }
              >
                Send
              </button>
            </div>
          </form>

          <p class="application-support-privacy">
            Form answers and uploaded files are not shared with this support tool.
          </p>
        </section>
      )}

      <button
        type="button"
        class="application-support-trigger"
        onClick={() =>
          setOpen(
            (value) => !value
          )
        }
        aria-expanded={open}
        aria-label="Open application support"
      >
        <span aria-hidden="true">
          ?
        </span>

        I'm stuck
      </button>
    </div>
  )
}