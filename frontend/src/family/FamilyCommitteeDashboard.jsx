import { useState, useEffect } from 'preact/hooks'
import { listFamilyApplications, updateFamilyApplication } from './api'
import { useLanguage } from '../language/LanguageContext'
import './family.css'

const RELATIONSHIP_ICON = { spouse: '💍', child: '🧒' }

export function FamilyCommitteeDashboard() {
  const { family } = useLanguage()
  const t = family || {}
  const STATUS_LABELS = t.statusOptions || {
    submitted: 'Submitted',
    under_review: 'Under Review',
    additional_info_requested: 'Additional Info Requested',
    approved: 'Approved',
    denied: 'Denied'
  }

  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [statusDraft, setStatusDraft] = useState('')
  const [memberStatusDrafts, setMemberStatusDrafts] = useState({})
  const [notesDraft, setNotesDraft] = useState('')
  const [saving, setSaving] = useState(false)

  function refresh() {
    setLoading(true)
    listFamilyApplications()
      .then(setApplications)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
  }, [])

  function openApplication(app) {
    setSelected(app)
    setStatusDraft(app.status)
    setNotesDraft(app.staffNotes || '')
    setMemberStatusDrafts(Object.fromEntries(app.members.map((m) => [m.id, m.status || 'submitted'])))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const updated = await updateFamilyApplication(selected.reference, {
        status: statusDraft,
        staffNotes: notesDraft,
        memberStatuses: Object.entries(memberStatusDrafts).map(([id, status]) => ({ id, status }))
      })
      setSelected(updated)
      refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div class="family-staff-dashboard">
      <div class="family-staff-header">
        <h2>{t.staffTitle || 'Family Applications'}</h2>
        <p class="family-hint">
          {t.staffIntro || 'Each family member can be moved through review independently — approving one does not affect the others.'}
        </p>
      </div>

      {error && <p class="family-error">{error}</p>}
      {loading && <p class="family-hint">{t.staffLoading || 'Loading applications…'}</p>}

      <div class="family-staff-body">
        <div class="family-staff-list">
          {applications.length === 0 && !loading && <p class="family-hint">{t.staffNoneYet || 'No family applications yet.'}</p>}
          {applications.map((app) => (
            <button
              type="button"
              key={app.reference}
              class={`family-staff-row ${selected?.reference === app.reference ? 'selected' : ''}`}
              onClick={() => openApplication(app)}
            >
              <div class="family-staff-row-top">
                <strong>{app.sponsorName}</strong>
                <span class={`family-status-tag family-status-${app.status}`}>{STATUS_LABELS[app.status]}</span>
              </div>
              <span class="family-staff-row-sub">
                {app.partySize} {app.partySize === 1 ? t.dependentSingular || 'dependent' : t.dependentPlural || 'dependents'} · {app.reference}
              </span>
              <span class="family-staff-row-sub">
                {app.centerName} — {app.date} {app.time}
              </span>
            </button>
          ))}
        </div>

        <div class="family-staff-detail">
          {!selected && <p class="family-hint">{t.staffSelectHint || 'Select a family application to review it.'}</p>}

          {selected && (
            <>
              <div class="family-staff-detail-header">
                <div>
                  <h3>{selected.sponsorName}</h3>
                  <span class="family-hint">
                    {selected.sponsorEmail} · {selected.reference}
                  </span>
                </div>
              </div>

              <div class="family-section">
                <h3>{t.sponsorTag || 'Sponsor'}</h3>
                <p>
                  {selected.sponsorDocumentsProvided.length > 0 && (
                    <span class="family-doc-ok">✓ {selected.sponsorDocumentsProvided.join(', ')}</span>
                  )}
                </p>
                {selected.sponsorMissingDocuments.length > 0 && (
                  <p class="family-doc-missing">
                    {t.whatsLeftTitle || 'Still needed'}: {selected.sponsorMissingDocuments.join(', ')}
                  </p>
                )}
              </div>

              {selected.members.map((m) => (
                <div class="family-section family-staff-member" key={m.id}>
                  <div class="family-staff-member-header">
                    <span>
                      <span aria-hidden="true">{RELATIONSHIP_ICON[m.relationship]}</span>{' '}
                      <strong>{m.fullName}</strong>{' '}
                      <span class="family-hint">({m.relationship === 'spouse' ? t.spouseLabel || 'Spouse' : t.childLabel || 'Child'})</span>
                    </span>
                    <select
                      value={memberStatusDrafts[m.id] || 'submitted'}
                      onChange={(e) => setMemberStatusDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {m.documentsProvided.length > 0 && <p class="family-doc-ok">✓ {m.documentsProvided.join(', ')}</p>}
                  {m.missingDocuments.length > 0 && (
                    <p class="family-doc-missing">
                      {t.whatsLeftTitle || 'Still needed'}: {m.missingDocuments.join(', ')}
                    </p>
                  )}
                </div>
              ))}

              <div class="family-section">
                <h3>{t.appointmentLabel || 'Appointment'}</h3>
                <p>
                  {selected.centerName} — {selected.date} {selected.time} ({selected.partySize}{' '}
                  {selected.partySize === 1 ? t.dependentSingular || 'dependent' : t.dependentPlural || 'dependents'})
                </p>
              </div>

              <div class="family-section">
                <h3>{t.staffOverallStatus || 'Overall household status'}</h3>
                <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div class="family-section">
                <h3>{t.staffNotesLabel || 'Staff notes'}</h3>
                <textarea
                  rows={4}
                  value={notesDraft}
                  onInput={(e) => setNotesDraft(e.target.value)}
                  placeholder={t.staffNotesPlaceholder || 'Internal notes about this household…'}
                />
              </div>

              <button type="button" class="family-submit-button" onClick={handleSave} disabled={saving}>
                {saving ? t.staffSaving || 'Saving…' : t.staffSaveChanges || 'Save changes'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
