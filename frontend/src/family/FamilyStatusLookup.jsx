import { useState } from 'preact/hooks'
import { FamilyTree } from './FamilyTree'
import { getFamilyApplication } from './api'
import { useLanguage } from '../language/LanguageContext'
import './family.css'

export function FamilyStatusLookup({ onBack }) {
  const { family } = useLanguage()
  const t = family || {}

  const [reference, setReference] = useState('')
  const [record, setRecord] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleLookup(e) {
    e.preventDefault()
    if (!reference.trim()) return
    setLoading(true)
    setError(null)
    setRecord(null)
    try {
      const result = await getFamilyApplication(reference.trim().toUpperCase())
      setRecord(result)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div class="family-flow">
      <button type="button" class="family-back-link" onClick={onBack}>
        {t.lookupBackToNew || '← Start a new family application'}
      </button>

      <h2>{t.lookupTitle || "Check your family application's status"}</h2>

      <form class="family-lookup-form" onSubmit={handleLookup}>
        <input
          type="text"
          placeholder={t.lookupReferenceLabel || 'Family reference number (e.g. FAM-2026-1234)'}
          value={reference}
          onInput={(e) => setReference(e.target.value)}
        />
        <button type="submit" class="family-lookup-button" disabled={loading}>
          {loading ? t.lookupChecking || 'Looking up your application…' : t.lookupButton || 'Check status'}
        </button>
      </form>

      {error && <p class="family-error">{error}</p>}

      {record && (
        <>
          <div class="family-summary-card">
            <div class="family-summary-row">
              <span>{t.statusLabel || 'Status'}</span>
              <strong class="family-status-pill">
                {(t.statusOptions && t.statusOptions[record.status]) || record.status}
              </strong>
            </div>
            <div class="family-summary-row">
              <span>{t.appointmentLabel || 'Appointment'}</span>
              <strong>
                {record.centerName} — {record.date} {record.time}
              </strong>
            </div>
            <div class="family-summary-row">
              <span>{t.totalFeeLabel || 'Total'}</span>
              <strong>{record.feeAed} AED</strong>
            </div>
          </div>

          <FamilyTree
            sponsorName={record.sponsorName}
            members={record.members.map((m) => ({
              ...m,
              requiredCount: (m.documentsProvided?.length || 0) + (m.missingDocuments?.length || 0),
              providedCount: m.documentsProvided?.length || 0
            }))}
            selectedMemberId={null}
            onSelectMember={() => {}}
            onAddSpouse={() => {}}
            onAddChild={() => {}}
            t={{
              sponsorTag: t.sponsorTag || 'Sponsor',
              sponsorPlaceholder: t.sponsorPlaceholder || 'You',
              spouseLabel: t.spouseLabel || 'Spouse',
              childLabel: t.childLabel || 'Child',
              addSpouse: '',
              addChild: ''
            }}
          />

          <div class="family-member-status-list">
            {record.members.map((m) => (
              <div class="family-member-status-row" key={m.id}>
                <span>{m.fullName}</span>
                <span class={`family-status-tag family-status-${m.status || 'submitted'}`}>
                  {(t.statusOptions && t.statusOptions[m.status]) || m.status || 'Submitted'}
                </span>
              </div>
            ))}
          </div>

          {record.sponsorMissingDocuments?.length > 0 || record.members.some((m) => m.missingDocuments?.length > 0) ? (
            <div class="family-whatsleft">
              <strong>{t.whatsLeftTitle || 'Still needed'}</strong>
              {record.sponsorMissingDocuments?.length > 0 && (
                <p>
                  <strong>{t.sponsorTag || 'Sponsor'}:</strong> {record.sponsorMissingDocuments.join(', ')}
                </p>
              )}
              {record.members
                .filter((m) => m.missingDocuments?.length > 0)
                .map((m) => (
                  <p key={m.id}>
                    <strong>{m.fullName}:</strong> {m.missingDocuments.join(', ')}
                  </p>
                ))}
            </div>
          ) : (
            <p class="family-whatsleft-done">{t.whatsLeftAllDone || 'Everything on file is complete.'}</p>
          )}
        </>
      )}
    </div>
  )
}
