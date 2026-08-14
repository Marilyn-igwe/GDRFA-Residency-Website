import { useState, useEffect } from 'preact/hooks'
import { listCases, updateCase, regenerateAiBrief } from './api'
import { useLanguage } from '../language/LanguageContext'
import './humanitarian.css'

function openAssistant(mode) {
  window.dispatchEvent(new CustomEvent('gdrfa:open-assistant', { detail: { mode } }))
}

export function CommitteeDashboard() {
  const { humanitarian, assistant: at } = useLanguage()
  const dt = humanitarian.dashboard
  const STATUS_LABELS = dt.statusOptions

  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [notesDraft, setNotesDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [briefRegenerating, setBriefRegenerating] = useState(false)
  const [briefError, setBriefError] = useState(null)

  function refresh() {
    setLoading(true)
    listCases()
      .then(setCases)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  function openCase(c) {
    setSelected(c)
    setNotesDraft(c.committeeNotes || '')
    setStatusDraft(c.status)
    setBriefError(null)
  }

  async function handleRegenerateBrief() {
    setBriefRegenerating(true)
    setBriefError(null)
    try {
      const updated = await regenerateAiBrief(selected.reference)
      setSelected(updated)
      refresh()
    } catch (e) {
      setBriefError(e.message)
    } finally {
      setBriefRegenerating(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateCase(selected.reference, { status: statusDraft, committeeNotes: notesDraft })
      setSelected(updated)
      refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div class="hc-dashboard">
      <div class="hc-dashboard-header">
        <h2>{dt.title}</h2>
        <p class="hc-intro">
          {dt.intro}
        </p>
      </div>

      <div class="hc-copilot-callout">
        <div class="hc-copilot-callout-text">
          <span class="hc-copilot-callout-eyebrow">{at.dashboardCalloutTitle}</span>
          <p>{at.dashboardCalloutBody}</p>
        </div>
        <button type="button" onClick={() => openAssistant('chat')}>
          {at.dashboardCalloutCta}
        </button>
      </div>

      {error && <p class="hc-error">{error}</p>}
      {loading && <p class="hc-hint">{dt.loadingCases}</p>}

      <div class="hc-dashboard-body">
        <div class="hc-case-list">
          {cases.length === 0 && !loading && <p class="hc-hint">{dt.noCasesYet}</p>}
          {cases.map((c) => (
            <button
              type="button"
              key={c.reference}
              class={`hc-case-row ${selected?.reference === c.reference ? 'selected' : ''}`}
              onClick={() => openCase(c)}
            >
              <div class="hc-case-row-top">
                <strong>{c.applicantName}</strong>
                <span class={`hc-readiness-pill ${c.readiness.readinessPercent >= 80 ? 'high' : c.readiness.readinessPercent >= 40 ? 'mid' : 'low'}`}>
                  {c.readiness.readinessPercent}%
                </span>
              </div>
              <span class="hc-case-row-category">{c.categoryName}</span>
              <span class="hc-case-row-ref">{c.reference}</span>
              <span class={`hc-status-tag hc-status-${c.status}`}>{STATUS_LABELS[c.status]}</span>
            </button>
          ))}
        </div>

        <div class="hc-case-detail">
          {!selected && <p class="hc-hint">{dt.selectHint}</p>}

          {selected && (
            <>
              <div class="hc-detail-header">
                <div>
                  <h3>{selected.applicantName}</h3>
                  <span class="hc-hint">{selected.applicantEmail} · {selected.reference}</span>
                </div>
                <span class={`hc-readiness-pill ${selected.readiness.readinessPercent >= 80 ? 'high' : selected.readiness.readinessPercent >= 40 ? 'mid' : 'low'}`}>
                  {selected.readiness.readinessPercent}% {dt.complete}
                </span>
              </div>

              <div class="hc-detail-section">
                <strong>{dt.categoryLabel}</strong>
                <p>{selected.categoryName}</p>
              </div>

              <div class="hc-detail-section hc-summary-section">
                <strong>{dt.summaryLabel}</strong>
                <p>{selected.summary}</p>
              </div>

              <div class="hc-detail-section hc-ai-brief-section">
                <div class="hc-ai-brief-header">
                  <span class="hc-ai-brief-eyebrow">{dt.aiBriefTitle}</span>
                  <button
                    type="button"
                    class="hc-ai-brief-regenerate"
                    onClick={handleRegenerateBrief}
                    disabled={briefRegenerating}
                  >
                    {briefRegenerating ? dt.aiBriefRegenerating : dt.aiBriefRegenerate}
                  </button>
                </div>

                {briefError && <p class="hc-error">{briefError}</p>}

                {selected.aiBrief ? (
                  <>
                    {selected.aiBrief.keyFacts?.length > 0 && (
                      <div class="hc-ai-brief-block">
                        <strong>{dt.aiBriefKeyFacts}</strong>
                        <ul>
                          {selected.aiBrief.keyFacts.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selected.aiBrief.pointsToVerify?.length > 0 && (
                      <div class="hc-ai-brief-block hc-ai-brief-flags">
                        <strong>{dt.aiBriefFlags}</strong>
                        <ul>
                          {selected.aiBrief.pointsToVerify.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <p class="hc-ai-disclaimer">{dt.aiBriefDisclaimer}</p>
                  </>
                ) : (
                  <p class="hc-hint">{dt.aiBriefUnavailable}</p>
                )}
              </div>

              <div class="hc-detail-section">
                <strong>{dt.documentsProvidedLabel}</strong>
                {selected.documentsProvided.length > 0 ? (
                  <ul>
                    {selected.documentsProvided.map((d) => (
                      <li key={d}>✓ {d}</li>
                    ))}
                  </ul>
                ) : (
                  <p class="hc-hint">{dt.noneMarked}</p>
                )}
                {selected.readiness.missingDocuments.length > 0 && (
                  <>
                    <strong class="hc-missing-label">{dt.missingLabel}</strong>
                    <ul class="hc-missing-list">
                      {selected.readiness.missingDocuments.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div class="hc-detail-section">
                <strong>{dt.statementLabel}</strong>
                <p class="hc-statement">{selected.statement || <em>{dt.noStatement}</em>}</p>
              </div>

              <div class="hc-detail-section hc-decision-note">
                <p>{selected.readiness.note}</p>
              </div>

              <div class="hc-detail-section">
                <strong>{dt.statusLabel}</strong>
                <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div class="hc-detail-section">
                <strong>{dt.notesLabel}</strong>
                <textarea
                  rows={5}
                  value={notesDraft}
                  onInput={(e) => setNotesDraft(e.target.value)}
                  placeholder={dt.notesPlaceholder}
                />
              </div>

              <button type="button" class="hc-save-button" onClick={handleSave} disabled={saving}>
                {saving ? dt.saving : dt.saveChanges}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
