import { useState, useEffect } from 'preact/hooks'
import {
  getCategories,
  checkReadiness,
  submitCase,
  verifyHumanitarianDocuments,
  checkStatementWithAI,
  fileToBase64,
} from './api'
import { useLanguage } from '../language/LanguageContext'
import { InfoTooltip } from '../components/InfoTooltip'
import './humanitarian.css'

export function HumanitarianCaseForm() {
  const { humanitarian } = useLanguage()
  const ht = humanitarian.form
  const [categories, setCategories] = useState([])
  const [categoryId, setCategoryId] = useState(null)
  const [documentsChecked, setDocumentsChecked] = useState({})
  const [statement, setStatement] = useState('')
  const [applicantName, setApplicantName] = useState('')
  const [applicantEmail, setApplicantEmail] = useState('')

  const [readiness, setReadiness] = useState(null)
  const [checking, setChecking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState(null)

  // AI document verification -- files: { [requirementLabel]: File }
  const [documentFiles, setDocumentFiles] = useState({})
  const [docAiResults, setDocAiResults] = useState(null)
  const [docAiChecking, setDocAiChecking] = useState(false)
  const [docAiError, setDocAiError] = useState(null)

  // AI statement writing feedback
  const [statementAi, setStatementAi] = useState(null)
  const [statementAiChecking, setStatementAiChecking] = useState(false)
  const [statementAiError, setStatementAiError] = useState(null)

  useEffect(() => {
    getCategories().then(setCategories).catch((e) => setError(e.message))
  }, [])

  const category = categories.find((c) => c.id === categoryId)

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

  function toggleDocument(doc) {
    setDocumentsChecked((prev) => ({ ...prev, [doc]: !prev[doc] }))
    setReadiness(null)
  }

  function documentsProvided() {
    return Object.keys(documentsChecked).filter((doc) => documentsChecked[doc])
  }

  function attachDocumentFile(label, file) {
    setDocumentFiles((prev) => ({ ...prev, [label]: file }))
    setDocAiResults(null)
  }

  function removeDocumentFile(label) {
    setDocumentFiles((prev) => {
      const next = { ...prev }
      delete next[label]
      return next
    })
    setDocAiResults(null)
  }

  async function runDocAiCheck() {
    setDocAiChecking(true)
    setDocAiError(null)
    try {
      const files = await Promise.all(
        Object.entries(documentFiles).map(async ([label, file]) => ({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataBase64: await fileToBase64(file),
          requirementLabel: label,
        }))
      )
      const result = await verifyHumanitarianDocuments(categoryId, files)
      setDocAiResults(result)
      // Matched documents feed straight into the same completeness check
      // used everywhere else in the form -- the AI check is a faster way
      // to satisfy a requirement, not a separate system.
      const okLabels = (result.requirements || []).filter((r) => r.status === 'ok').map((r) => r.label)
      if (okLabels.length) {
        setDocumentsChecked((prev) => {
          const next = { ...prev }
          okLabels.forEach((label) => {
            next[label] = true
          })
          return next
        })
        setReadiness(null)
      }
    } catch (e) {
      setDocAiError(e.message)
    } finally {
      setDocAiChecking(false)
    }
  }

  async function runStatementAiCheck() {
    setStatementAiChecking(true)
    setStatementAiError(null)
    try {
      const result = await checkStatementWithAI(categoryId, statement)
      setStatementAi(result)
    } catch (e) {
      setStatementAiError(e.message)
    } finally {
      setStatementAiChecking(false)
    }
  }

  async function handleCheckReadiness() {
    setChecking(true)
    setError(null)
    try {
      const result = await checkReadiness({
        categoryId,
        documentsProvided: documentsProvided(),
        statement,
      })
      setReadiness(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setChecking(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitCase({
        categoryId,
        documentsProvided: documentsProvided(),
        statement,
        applicantName,
        applicantEmail,
      })
      setConfirmation(result)
    } catch (e) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (confirmation) {
    return (
      <div class="hc-form hc-confirmation">
        <div class="hc-check">✓</div>
        <h2>{ht.confirmedTitle}</h2>
        <p class="hc-reference">{confirmation.reference}</p>
        <p class="hc-note">
          {ht.confirmedNote}
        </p>
        <div class="hc-readiness-summary">
          <strong>{ht.completenessLabel(confirmation.readiness.readinessPercent)}</strong>
          <p>{confirmation.readiness.note}</p>
        </div>
      </div>
    )
  }

  return (
    <div class="hc-form">
      <h2>
        {ht.title}
        <InfoTooltip label={ht.whatIsThisTitle} title={ht.whatIsThisTitle} align="left">
          {ht.whatIsThisBody}
        </InfoTooltip>
      </h2>
      <p class="hc-intro">
        {ht.intro}
      </p>
      <button
        type="button"
        class="hc-unsure-link"
        onClick={() => window.dispatchEvent(new CustomEvent('gdrfa:open-chat'))}
      >
        {ht.unsureLink}
      </button>

      {error && <p class="hc-error">{error}</p>}

      <div class="hc-field">
        <label>{ht.categoryLabel}</label>
        <div class="hc-category-grid">
          {categories.map((c) => (
            <button
              type="button"
              key={c.id}
              class={`hc-category-card ${categoryId === c.id ? 'selected' : ''}`}
              onClick={() => selectCategory(c.id)}
            >
              <span class="hc-category-card-heading">
                <strong>{c.name}</strong>
                {c.eligibility && (
                  <InfoTooltip label={ht.eligibilityInfoLabel} title={ht.eligibilityTooltipTitle}>
                    <span>{c.eligibility.whatItMeans}</span>
                    <ul>
                      {c.eligibility.whoItsFor.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                    {c.eligibility.notFor && <span class="gd-tooltip-notfor">{c.eligibility.notFor}</span>}
                  </InfoTooltip>
                )}
              </span>
              <span>{c.description}</span>
            </button>
          ))}
        </div>
      </div>

      {category && (
        <>
          <div class="hc-field">
            <label>{ht.requiredDocumentsLabel}</label>
            <p class="hc-hint">{ht.docsHint}</p>
            <div class="hc-doc-list">
              {category.requiredDocuments.map((doc) => (
                <label key={doc} class="hc-doc-checkbox">
                  <input
                    type="checkbox"
                    checked={!!documentsChecked[doc]}
                    onChange={() => toggleDocument(doc)}
                  />
                  {doc}
                </label>
              ))}
            </div>
          </div>

          <div class="hc-field hc-ai-doc-section">
            <label>
              {ht.aiDocCheckTitle}
              <InfoTooltip label={ht.aiInfoLabel} title={ht.aiDocCheckTitle} align="left">
                {ht.aiDocCheckDisclaimer}
              </InfoTooltip>
            </label>
            <p class="hc-hint">{ht.aiDocCheckHint}</p>
            <div class="hc-doc-upload-list">
              {category.requiredDocuments.map((doc) => {
                const file = documentFiles[doc]
                const result = docAiResults?.requirements?.find((r) => r.label === doc)
                return (
                  <div key={doc} class={`hc-doc-upload-row ${result ? `status-${result.status}` : ''}`}>
                    <div class="hc-doc-upload-info">
                      <span class="hc-doc-upload-label">{doc}</span>
                      {file && <span class="hc-doc-upload-filename">{file.name}</span>}
                      {result && (
                        <span class={`hc-doc-status hc-doc-status-${result.status}`}>
                          {result.status === 'ok' && `✓ ${ht.aiDocStatusOk}`}
                          {result.status === 'missing' && `✗ ${ht.aiDocStatusMissing}`}
                          {result.status === 'unclear' && `! ${ht.aiDocStatusUnclear}`}
                          <span class="hc-doc-status-reason">{result.reason}</span>
                        </span>
                      )}
                    </div>
                    <div class="hc-doc-upload-actions">
                      <label class="hc-doc-upload-btn">
                        {file ? ht.replace : ht.upload}
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => e.target.files[0] && attachDocumentFile(doc, e.target.files[0])}
                        />
                      </label>
                      {file && (
                        <button type="button" class="hc-doc-remove-btn" onClick={() => removeDocumentFile(doc)}>
                          {ht.remove}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {docAiError && <p class="hc-error">{docAiError}</p>}

            {docAiResults && !docAiResults.aiEnabled && (
              <p class="hc-hint hc-ai-note">{ht.aiUnavailableNote}</p>
            )}

            <button
              type="button"
              class="hc-check-button"
              disabled={Object.keys(documentFiles).length === 0 || docAiChecking}
              onClick={runDocAiCheck}
            >
              {docAiChecking ? ht.aiDocChecking : ht.aiDocCheckButton}
            </button>
          </div>

          <div class="hc-field">
            <label>
              {ht.statementLabel}
              <span class="hc-word-hint">
                {ht.wordsMinimum(statement.trim() ? statement.trim().split(/\s+/).length : 0, category.minStatementWords)}
              </span>
            </label>
            <textarea
              rows={8}
              placeholder={ht.statementPlaceholder}
              value={statement}
              onInput={(e) => {
                setStatement(e.target.value)
                setStatementAi(null)
              }}
            />

            <div class="hc-ai-statement-panel">
              <button
                type="button"
                class="hc-ai-statement-button"
                disabled={!statement.trim() || statementAiChecking}
                onClick={runStatementAiCheck}
              >
                {statementAiChecking ? ht.statementAiChecking : ht.statementAiButton}
              </button>

              {statementAiError && <p class="hc-error">{statementAiError}</p>}

              {statementAi && (
                <div class="hc-ai-statement-card">
                  {statementAi.strengths.length > 0 && (
                    <div class="hc-ai-statement-block">
                      <strong>{ht.statementAiStrengths}</strong>
                      <ul>
                        {statementAi.strengths.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {statementAi.missingElements.length > 0 && (
                    <div class="hc-ai-statement-block">
                      <strong>{ht.statementAiMissing}</strong>
                      <ul>
                        {statementAi.missingElements.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {statementAi.clarityTip && (
                    <p class="hc-ai-statement-tip">
                      <strong>{ht.statementAiTip}:</strong> {statementAi.clarityTip}
                    </p>
                  )}
                  <p class="hc-ai-disclaimer">
                    {statementAi.aiEnabled ? ht.statementAiDisclaimer : ht.aiUnavailableNote}
                  </p>
                </div>
              )}
            </div>
          </div>

          <button type="button" class="hc-check-button" onClick={handleCheckReadiness} disabled={checking}>
            {checking ? ht.checking : ht.checkReadiness}
          </button>

          {readiness && (
            <div class="hc-readiness-card">
              <div class="hc-readiness-bar-row">
                <strong>{readiness.readinessPercent}% {humanitarian.dashboard.complete}</strong>
              </div>
              <div class="hc-readiness-bar">
                <div class="hc-readiness-bar-fill" style={{ width: `${readiness.readinessPercent}%` }} />
              </div>
              {readiness.flags.length > 0 ? (
                <ul class="hc-flags">
                  {readiness.flags.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              ) : (
                <p class="hc-all-good">{ht.allGood}</p>
              )}
              <p class="hc-note">{readiness.note}</p>
            </div>
          )}

          <form class="hc-submit-form" onSubmit={handleSubmit}>
            <div class="hc-field">
              <label>{ht.fullName}</label>
              <input type="text" required value={applicantName} onInput={(e) => setApplicantName(e.target.value)} />
            </div>
            <div class="hc-field">
              <label>{ht.email}</label>
              <input type="email" required value={applicantEmail} onInput={(e) => setApplicantEmail(e.target.value)} />
            </div>
            <button type="submit" class="hc-submit-button" disabled={submitting}>
              {submitting ? ht.submitting : ht.submitCase}
            </button>
            <p class="hc-hint">{ht.submitHint}</p>
          </form>
        </>
      )}
    </div>
  )
}
