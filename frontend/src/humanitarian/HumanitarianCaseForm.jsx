import { useState, useEffect } from 'preact/hooks'
import { getCategories, checkReadiness, submitCase } from './api'
import { useLanguage } from '../language/LanguageContext'
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

  useEffect(() => {
    getCategories().then(setCategories).catch((e) => setError(e.message))
  }, [])

  const category = categories.find((c) => c.id === categoryId)

  function toggleDocument(doc) {
    setDocumentsChecked((prev) => ({ ...prev, [doc]: !prev[doc] }))
    setReadiness(null)
  }

  function documentsProvided() {
    return Object.keys(documentsChecked).filter((doc) => documentsChecked[doc])
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
      <h2>{ht.title}</h2>
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
              onClick={() => {
                setCategoryId(c.id)
                setDocumentsChecked({})
                setReadiness(null)
              }}
            >
              <strong>{c.name}</strong>
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
              onInput={(e) => setStatement(e.target.value)}
            />
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
