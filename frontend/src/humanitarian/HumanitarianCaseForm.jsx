import {
  useState,
  useEffect
} from 'preact/hooks'
import {
  getCategories,
  checkReadiness,
  submitCase,
  verifyHumanitarianDocuments,
  checkStatementWithAI,
  fileToBase64
} from './api'
import {
  useLanguage
} from '../language/LanguageContext'
import {
  InfoTooltip
} from '../components/InfoTooltip'
import {
  usePublishApplicationContext
} from '../support/applicationContext'
import './humanitarian.css'

export function HumanitarianCaseForm() {
  const {
    humanitarian
  } = useLanguage()

  const ht =
    humanitarian.form

  const [
    categories,
    setCategories
  ] = useState([])

  const [
    categoryId,
    setCategoryId
  ] = useState(null)

  const [
    documentsChecked,
    setDocumentsChecked
  ] = useState({})

  const [
    statement,
    setStatement
  ] = useState('')

  const [
    applicantName,
    setApplicantName
  ] = useState('')

  const [
    applicantEmail,
    setApplicantEmail
  ] = useState('')

  const [
    readiness,
    setReadiness
  ] = useState(null)

  const [
    checking,
    setChecking
  ] = useState(false)

  const [
    submitting,
    setSubmitting
  ] = useState(false)

  const [
    confirmation,
    setConfirmation
  ] = useState(null)

  const [
    error,
    setError
  ] = useState(null)

  const [
    documentFiles,
    setDocumentFiles
  ] = useState({})

  const [
    docAiResults,
    setDocAiResults
  ] = useState(null)

  const [
    docAiChecking,
    setDocAiChecking
  ] = useState(false)

  const [
    docAiError,
    setDocAiError
  ] = useState(null)

  const [
    statementAi,
    setStatementAi
  ] = useState(null)

  const [
    statementAiChecking,
    setStatementAiChecking
  ] = useState(false)

  const [
    statementAiError,
    setStatementAiError
  ] = useState(null)

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((requestError) => {
        setError(
          requestError.message
        )
      })
  }, [])

  const category =
    categories.find(
      (item) =>
        item.id === categoryId
    )

  const humanitarianRequiredDocuments =
    category?.requiredDocuments || []

  const humanitarianMissingDocuments =
    humanitarianRequiredDocuments.filter(
      (document) =>
        !documentsChecked[document] &&
        !documentFiles[document]
    )

  let humanitarianStepId =
    'category'

  let humanitarianStepName =
    'Request category'

  if (category) {
    humanitarianStepId =
      'documents'

    humanitarianStepName =
      'Supporting documents'
  }

  if (
    category &&
    humanitarianMissingDocuments
      .length === 0
  ) {
    humanitarianStepId =
      'statement'

    humanitarianStepName =
      'Written statement'
  }

  if (confirmation) {
    humanitarianStepId =
      'confirmation'

    humanitarianStepName =
      'Request confirmation'
  }

  usePublishApplicationContext({
    contextId:
      'humanitarian-application',

    applicationType:
      'humanitarian-request',

    serviceId:
      category?.id || '',

    serviceName:
      category
        ? `Humanitarian Request: ${category.name}`
        : 'Humanitarian Request',

    stepId:
      humanitarianStepId,

    stepName:
      humanitarianStepName,

    selectedCategory:
      category?.name || '',

    // Personal names are not published.
    selectedApplicant: '',

    requiredDocuments:
      humanitarianRequiredDocuments,

    missingDocuments:
      humanitarianMissingDocuments,

    visibleErrors: [
      error,
      docAiError,
      statementAiError
    ].filter(Boolean),

    acceptedFileTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ],

    maximumFileSize: ''
  })

  function selectCategory(id) {
    setCategoryId(id)
    setDocumentsChecked({})
    setReadiness(null)
    setDocumentFiles({})
    setDocAiResults(null)
    setDocAiError(null)
    setStatementAi(null)
    setStatementAiError(null)
  }

  function toggleDocument(
    document
  ) {
    setDocumentsChecked(
      (current) => ({
        ...current,

        [document]:
          !current[document]
      })
    )

    setReadiness(null)
  }

  function documentsProvided() {
    return Object.keys(
      documentsChecked
    ).filter(
      (document) =>
        documentsChecked[
          document
        ]
    )
  }

  function attachDocumentFile(
    label,
    file
  ) {
    setDocumentFiles(
      (current) => ({
        ...current,
        [label]: file
      })
    )

    setDocAiResults(null)
  }

  function removeDocumentFile(
    label
  ) {
    setDocumentFiles(
      (current) => {
        const next = {
          ...current
        }

        delete next[label]

        return next
      }
    )

    setDocAiResults(null)
  }

  async function runDocAiCheck() {
    setDocAiChecking(true)
    setDocAiError(null)

    try {
      const files =
        await Promise.all(
          Object.entries(
            documentFiles
          ).map(
            async (
              [label, file]
            ) => ({
              name: file.name,

              mimeType:
                file.type ||
                'application/octet-stream',

              dataBase64:
                await fileToBase64(
                  file
                ),

              requirementLabel:
                label
            })
          )
        )

      const result =
        await verifyHumanitarianDocuments(
          categoryId,
          files
        )

      setDocAiResults(result)

      const acceptedLabels =
        (
          result.requirements || []
        )
          .filter(
            (requirement) =>
              requirement.status ===
              'ok'
          )
          .map(
            (requirement) =>
              requirement.label
          )

      if (acceptedLabels.length) {
        setDocumentsChecked(
          (current) => {
            const next = {
              ...current
            }

            acceptedLabels.forEach(
              (label) => {
                next[label] = true
              }
            )

            return next
          }
        )

        setReadiness(null)
      }
    } catch (requestError) {
      setDocAiError(
        requestError.message
      )
    } finally {
      setDocAiChecking(false)
    }
  }

  async function runStatementAiCheck() {
    setStatementAiChecking(true)
    setStatementAiError(null)

    try {
      const result =
        await checkStatementWithAI(
          categoryId,
          statement
        )

      setStatementAi(result)
    } catch (requestError) {
      setStatementAiError(
        requestError.message
      )
    } finally {
      setStatementAiChecking(false)
    }
  }

  async function handleCheckReadiness() {
    setChecking(true)
    setError(null)

    try {
      const result =
        await checkReadiness({
          categoryId,

          documentsProvided:
            documentsProvided(),

          statement
        })

      setReadiness(result)
    } catch (requestError) {
      setError(
        requestError.message
      )
    } finally {
      setChecking(false)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setSubmitting(true)
    setError(null)

    try {
      const result =
        await submitCase({
          categoryId,

          documentsProvided:
            documentsProvided(),

          statement,
          applicantName,
          applicantEmail
        })

      setConfirmation(result)
    } catch (requestError) {
      setError(
        requestError.message
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <div class="hc-form hc-confirmation">
        <div class="hc-check">
          ✓
        </div>

        <h2>
          {ht.confirmedTitle}
        </h2>

        <p class="hc-reference">
          {confirmation.reference}
        </p>

        <p class="hc-note">
          {ht.confirmedNote}
        </p>

        <div class="hc-readiness-summary">
          <strong>
            {ht.completenessLabel(
              confirmation.readiness
                .readinessPercent
            )}
          </strong>

          <p>
            {
              confirmation
                .readiness.note
            }
          </p>
        </div>
      </div>
    )
  }

  return (
    <div class="hc-form">
      <h2>
        {ht.title}

        <InfoTooltip
          label={
            ht.whatIsThisTitle
          }
          title={
            ht.whatIsThisTitle
          }
          align="left"
        >
          {ht.whatIsThisBody}
        </InfoTooltip>
      </h2>

      <p class="hc-intro">
        {ht.intro}
      </p>

      <button
        type="button"
        class="hc-unsure-link"
        onClick={() => {
          window.dispatchEvent(
            new CustomEvent(
              'gdrfa:open-chat'
            )
          )
        }}
      >
        {ht.unsureLink}
      </button>

      {error && (
        <p class="hc-error">
          {error}
        </p>
      )}

      <div class="hc-field">
        <label>
          {ht.categoryLabel}
        </label>

        <div class="hc-category-grid">
          {categories.map(
            (item) => (
              <button
                type="button"
                key={item.id}
                class={
                  `hc-category-card ` +
                  (
                    categoryId ===
                    item.id
                      ? 'selected'
                      : ''
                  )
                }
                onClick={() =>
                  selectCategory(
                    item.id
                  )
                }
              >
                <span class="hc-category-card-heading">
                  <strong>
                    {item.name}
                  </strong>

                  {item.eligibility && (
                    <InfoTooltip
                      label={
                        ht.eligibilityInfoLabel
                      }
                      title={
                        ht.eligibilityTooltipTitle
                      }
                    >
                      <span>
                        {
                          item
                            .eligibility
                            .whatItMeans
                        }
                      </span>

                      <ul>
                        {item.eligibility
                          .whoItsFor
                          .map(
                            (entry) => (
                              <li
                                key={
                                  entry
                                }
                              >
                                {entry}
                              </li>
                            )
                          )}
                      </ul>

                      {item.eligibility
                        .notFor && (
                        <span class="gd-tooltip-notfor">
                          {
                            item
                              .eligibility
                              .notFor
                          }
                        </span>
                      )}
                    </InfoTooltip>
                  )}
                </span>

                <span>
                  {item.description}
                </span>
              </button>
            )
          )}
        </div>
      </div>

      {category && (
        <>
          <div class="hc-field">
            <label>
              {
                ht.requiredDocumentsLabel
              }
            </label>

            <p class="hc-hint">
              {ht.docsHint}
            </p>

            <div class="hc-doc-list">
              {humanitarianRequiredDocuments.map(
                (document) => (
                  <label
                    key={document}
                    class="hc-doc-checkbox"
                  >
                    <input
                      type="checkbox"
                      checked={
                        !!documentsChecked[
                          document
                        ]
                      }
                      onChange={() =>
                        toggleDocument(
                          document
                        )
                      }
                    />

                    {document}
                  </label>
                )
              )}
            </div>
          </div>

          <div class="hc-field hc-ai-doc-section">
            <label>
              {ht.aiDocCheckTitle}

              <InfoTooltip
                label={
                  ht.aiInfoLabel
                }
                title={
                  ht.aiDocCheckTitle
                }
                align="left"
              >
                {
                  ht.aiDocCheckDisclaimer
                }
              </InfoTooltip>
            </label>

            <p class="hc-hint">
              {ht.aiDocCheckHint}
            </p>

            <div class="hc-doc-upload-list">
              {humanitarianRequiredDocuments.map(
                (document) => {
                  const file =
                    documentFiles[
                      document
                    ]

                  const result =
                    docAiResults
                      ?.requirements
                      ?.find(
                        (requirement) =>
                          requirement.label ===
                          document
                      )

                  return (
                    <div
                      key={document}
                      class={
                        `hc-doc-upload-row ` +
                        (
                          result
                            ? `status-${result.status}`
                            : ''
                        )
                      }
                    >
                      <div class="hc-doc-upload-info">
                        <span class="hc-doc-upload-label">
                          {document}
                        </span>

                        {file && (
                          <span class="hc-doc-upload-filename">
                            {file.name}
                          </span>
                        )}

                        {result && (
                          <span
                            class={
                              `hc-doc-status ` +
                              `hc-doc-status-${result.status}`
                            }
                          >
                            {result.status ===
                              'ok' &&
                              `✓ ${ht.aiDocStatusOk}`}

                            {result.status ===
                              'missing' &&
                              `✗ ${ht.aiDocStatusMissing}`}

                            {result.status ===
                              'unclear' &&
                              `! ${ht.aiDocStatusUnclear}`}

                            <span class="hc-doc-status-reason">
                              {
                                result.reason
                              }
                            </span>
                          </span>
                        )}
                      </div>

                      <div class="hc-doc-upload-actions">
                        <label class="hc-doc-upload-btn">
                          {file
                            ? ht.replace
                            : ht.upload}

                          <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={(
                              event
                            ) => {
                              const selectedFile =
                                event
                                  .target
                                  .files[0]

                              if (
                                selectedFile
                              ) {
                                attachDocumentFile(
                                  document,
                                  selectedFile
                                )
                              }
                            }}
                          />
                        </label>

                        {file && (
                          <button
                            type="button"
                            class="hc-doc-remove-btn"
                            onClick={() =>
                              removeDocumentFile(
                                document
                              )
                            }
                          >
                            {ht.remove}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                }
              )}
            </div>

            {docAiError && (
              <p class="hc-error">
                {docAiError}
              </p>
            )}

            {docAiResults &&
              !docAiResults
                .aiEnabled && (
                <p class="hc-hint hc-ai-note">
                  {
                    ht.aiUnavailableNote
                  }
                </p>
              )}

            <button
              type="button"
              class="hc-check-button"
              disabled={
                !Object.keys(
                  documentFiles
                ).length ||
                docAiChecking
              }
              onClick={
                runDocAiCheck
              }
            >
              {docAiChecking
                ? ht.aiDocChecking
                : ht.aiDocCheckButton}
            </button>
          </div>

          <div class="hc-field">
            <label>
              {ht.statementLabel}

              <span class="hc-word-hint">
                {ht.wordsMinimum(
                  statement.trim()
                    ? statement
                        .trim()
                        .split(/\s+/)
                        .length
                    : 0,

                  category
                    .minStatementWords
                )}
              </span>
            </label>

            <textarea
              rows={8}
              placeholder={
                ht.statementPlaceholder
              }
              value={statement}
              onInput={(event) => {
                setStatement(
                  event.target.value
                )

                setStatementAi(null)
              }}
            />

            <div class="hc-ai-statement-panel">
              <button
                type="button"
                class="hc-ai-statement-button"
                disabled={
                  !statement.trim() ||
                  statementAiChecking
                }
                onClick={
                  runStatementAiCheck
                }
              >
                {statementAiChecking
                  ? ht.statementAiChecking
                  : ht.statementAiButton}
              </button>

              {statementAiError && (
                <p class="hc-error">
                  {statementAiError}
                </p>
              )}

              {statementAi && (
                <div class="hc-ai-statement-card">
                  {statementAi
                    .strengths
                    .length > 0 && (
                    <div class="hc-ai-statement-block">
                      <strong>
                        {
                          ht.statementAiStrengths
                        }
                      </strong>

                      <ul>
                        {statementAi
                          .strengths
                          .map(
                            (
                              strength
                            ) => (
                              <li
                                key={
                                  strength
                                }
                              >
                                {
                                  strength
                                }
                              </li>
                            )
                          )}
                      </ul>
                    </div>
                  )}

                  {statementAi
                    .missingElements
                    .length > 0 && (
                    <div class="hc-ai-statement-block">
                      <strong>
                        {
                          ht.statementAiMissing
                        }
                      </strong>

                      <ul>
                        {statementAi
                          .missingElements
                          .map(
                            (
                              missing
                            ) => (
                              <li
                                key={
                                  missing
                                }
                              >
                                {
                                  missing
                                }
                              </li>
                            )
                          )}
                      </ul>
                    </div>
                  )}

                  {statementAi
                    .clarityTip && (
                    <p class="hc-ai-statement-tip">
                      <strong>
                        {
                          ht.statementAiTip
                        }
                        :
                      </strong>{' '}
                      {
                        statementAi
                          .clarityTip
                      }
                    </p>
                  )}

                  <p class="hc-ai-disclaimer">
                    {statementAi
                      .aiEnabled
                      ? ht.statementAiDisclaimer
                      : ht.aiUnavailableNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            class="hc-check-button"
            onClick={
              handleCheckReadiness
            }
            disabled={checking}
          >
            {checking
              ? ht.checking
              : ht.checkReadiness}
          </button>

          {readiness && (
            <div class="hc-readiness-card">
              <div class="hc-readiness-bar-row">
                <strong>
                  {
                    readiness
                      .readinessPercent
                  }
                  %{' '}
                  {
                    humanitarian
                      .dashboard
                      .complete
                  }
                </strong>
              </div>

              <div class="hc-readiness-bar">
                <div
                  class="hc-readiness-bar-fill"
                  style={{
                    width:
                      `${readiness.readinessPercent}%`
                  }}
                />
              </div>

              {readiness.flags
                .length > 0 ? (
                <ul class="hc-flags">
                  {readiness.flags.map(
                    (flag) => (
                      <li key={flag}>
                        {flag}
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <p class="hc-all-good">
                  {ht.allGood}
                </p>
              )}

              <p class="hc-note">
                {readiness.note}
              </p>
            </div>
          )}

          <form
            class="hc-submit-form"
            onSubmit={
              handleSubmit
            }
          >
            <div class="hc-field">
              <label>
                {ht.fullName}
              </label>

              <input
                type="text"
                required
                value={
                  applicantName
                }
                onInput={(event) =>
                  setApplicantName(
                    event.target.value
                  )
                }
              />
            </div>

            <div class="hc-field">
              <label>
                {ht.email}
              </label>

              <input
                type="email"
                required
                value={
                  applicantEmail
                }
                onInput={(event) =>
                  setApplicantEmail(
                    event.target.value
                  )
                }
              />
            </div>

            <button
              type="submit"
              class="hc-submit-button"
              disabled={submitting}
            >
              {submitting
                ? ht.submitting
                : ht.submitCase}
            </button>

            <p class="hc-hint">
              {ht.submitHint}
            </p>
          </form>
        </>
      )}
    </div>
  )
}