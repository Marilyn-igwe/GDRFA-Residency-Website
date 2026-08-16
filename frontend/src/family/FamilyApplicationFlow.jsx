import { useState, useEffect, useMemo } from 'preact/hooks'
import { FamilyTree } from './FamilyTree'
import { FamilyStatusLookup } from './FamilyStatusLookup'
import { getFamilyRequirements, getFamilyAvailability, submitFamilyApplication } from './api'
import { useLanguage } from '../language/LanguageContext'
import './family.css'

const DRAFT_KEY = 'gdrfa_family_draft'

function nextNDates(n) {
  const dates = []
  const today = new Date()
  for (let i = 1; i <= n; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

function newMemberId() {
  return `m_${Date.now()}_${Math.floor(Math.random() * 10000)}`
}

export function FamilyApplicationFlow() {
  const { family } = useLanguage()
  const t = family || {}

  const [mode, setMode] = useState('apply') // 'apply' | 'status'

  const [requirements, setRequirements] = useState(null)
  const [reqError, setReqError] = useState(null)

  const [sponsorName, setSponsorName] = useState('Tamreen Ahmed')
  const [sponsorEmail, setSponsorEmail] = useState('')
  const [sponsorPhone, setSponsorPhone] = useState('')
  const [sponsorDocs, setSponsorDocs] = useState({})

  const [members, setMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState(null)

  const [selectedDate, setSelectedDate] = useState(null)
  const [availability, setAvailability] = useState(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState(null)
  const [selectedSlot, setSelectedSlot] = useState(null)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)
  const [confirmation, setConfirmation] = useState(null)

  // Draft auto-save — a family application means filling in details for
  // several people plus documents, easily more than one sitting. Losing
  // all of it on an accidental tab close would undo the whole point of
  // making this "easier". Restored on next visit unless already submitted.
  const [draftOffer, setDraftOffer] = useState(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) setDraftOffer(JSON.parse(saved))
    } catch {
      // Corrupt or unreadable draft — ignore it, start fresh.
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || confirmation) return
    const hasContent = sponsorEmail.trim() || members.length > 0
    if (!hasContent) return
    const draft = { sponsorName, sponsorEmail, sponsorPhone, sponsorDocs, members }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [sponsorName, sponsorEmail, sponsorPhone, sponsorDocs, members, confirmation])

  function resumeDraft() {
    setSponsorName(draftOffer.sponsorName)
    setSponsorEmail(draftOffer.sponsorEmail)
    setSponsorPhone(draftOffer.sponsorPhone)
    setSponsorDocs(draftOffer.sponsorDocs)
    setMembers(draftOffer.members)
    setDraftOffer(null)
  }

  function discardDraft() {
    localStorage.removeItem(DRAFT_KEY)
    setDraftOffer(null)
  }

  useEffect(() => {
    getFamilyRequirements()
      .then(setRequirements)
      .catch((e) => setReqError(e.message))
  }, [])

  // Party size changed — any slot picked for the old size may no longer
  // fit, and the availability list itself was filtered by the old size.
  useEffect(() => {
    setAvailability(null)
    setSelectedSlot(null)
  }, [members.length])

  const selectedMember = members.find((m) => m.id === selectedMemberId) || null

  const membersForTree = useMemo(() => {
    if (!requirements) return members.map((m) => ({ ...m, requiredCount: 0, providedCount: 0 }))
    return members.map((m) => {
      const required = requirements[m.relationship] || []
      const providedCount = required.filter((d) => m.docs?.[d]).length
      return { ...m, requiredCount: required.length, providedCount }
    })
  }, [members, requirements])

  const sponsorRequired = requirements?.sponsor || []
  const sponsorProvidedCount = sponsorRequired.filter((d) => sponsorDocs[d]).length

  const totalRequired = sponsorRequired.length + membersForTree.reduce((sum, m) => sum + m.requiredCount, 0)
  const totalProvided = sponsorProvidedCount + membersForTree.reduce((sum, m) => sum + m.providedCount, 0)
  const readinessPercent = totalRequired > 0 ? Math.round((totalProvided / totalRequired) * 100) : 0

  // Consolidated across sponsor + every member, so nobody has to click
  // into each tree node one at a time just to find out what's missing.
  const whatsLeft = useMemo(() => {
    const items = []
    const sponsorMissing = sponsorRequired.filter((d) => !sponsorDocs[d])
    if (sponsorMissing.length > 0) items.push({ label: t.sponsorTag || 'Sponsor', missing: sponsorMissing })
    membersForTree.forEach((m) => {
      if (!requirements) return
      const required = requirements[m.relationship] || []
      const missingDocs = required.filter((d) => !m.docs?.[d])
      const missing = [...(m.fullName?.trim() ? [] : [t.fullNameLabel || 'Full name']), ...missingDocs]
      if (missing.length > 0) {
        items.push({ label: m.fullName?.trim() || (m.relationship === 'spouse' ? t.spouseLabel : t.childLabel) || 'Member', missing })
      }
    })
    return items
  }, [sponsorRequired, sponsorDocs, membersForTree, requirements, t])

  const feePerDependent = requirements?.feePerDependentAed || 0
  const totalFee = feePerDependent * members.length

  function addMember(relationship) {
    const id = newMemberId()
    // Small convenience, not a requirement — a child usually shares the
    // sponsor's last name, so pre-fill it as a starting point they can
    // still edit or clear entirely.
    let fullName = ''
    if (relationship === 'child') {
      const parts = sponsorName.trim().split(/\s+/)
      if (parts.length > 1) fullName = parts[parts.length - 1]
    }
    setMembers((prev) => [...prev, { id, relationship, fullName, dateOfBirth: '', docs: {} }])
    setSelectedMemberId(id)
  }

  function removeMember(id) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    if (selectedMemberId === id) setSelectedMemberId(null)
  }

  function updateMember(id, field, value) {
    setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)))
  }

  function toggleMemberDoc(id, doc) {
    setMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, docs: { ...m.docs, [doc]: !m.docs?.[doc] } } : m))
    )
  }

  function toggleSponsorDoc(doc) {
    setSponsorDocs((prev) => ({ ...prev, [doc]: !prev[doc] }))
  }

  async function checkAvailability(date) {
    setSelectedDate(date)
    setAvailabilityLoading(true)
    setAvailabilityError(null)
    setSelectedSlot(null)
    try {
      const result = await getFamilyAvailability(date, Math.max(members.length, 1))
      setAvailability(result)
    } catch (e) {
      setAvailabilityError(e.message)
    } finally {
      setAvailabilityLoading(false)
    }
  }

  async function handleSubmit() {
    setSubmitError(null)
    if (!sponsorName.trim() || !sponsorEmail.trim()) {
      setSubmitError(t.validationSponsor || 'Please enter the sponsor name and email.')
      return
    }
    if (members.length === 0) {
      setSubmitError(t.validationMembers || 'Add at least one family member (spouse or child) before submitting.')
      return
    }
    if (members.some((m) => !m.fullName.trim())) {
      setSubmitError(t.validationMemberNames || 'Every family member needs a full name — click their card to add it.')
      return
    }
    if (!selectedSlot) {
      setSubmitError(t.validationSlot || 'Pick a shared appointment time for the whole family.')
      return
    }

    setSubmitting(true)
    try {
      const result = await submitFamilyApplication({
        sponsorName,
        sponsorEmail,
        sponsorPhone,
        sponsorDocumentsProvided: Object.keys(sponsorDocs).filter((d) => sponsorDocs[d]),
        members: members.map((m) => ({
          id: m.id,
          relationship: m.relationship,
          fullName: m.fullName,
          dateOfBirth: m.dateOfBirth,
          documentsProvided: Object.keys(m.docs || {}).filter((d) => m.docs[d])
        })),
        centerId: selectedSlot.centerId,
        date: selectedSlot.date,
        time: selectedSlot.time
      })
      setConfirmation(result)
      localStorage.removeItem(DRAFT_KEY)
    } catch (e) {
      if (e.data?.alternatives) {
        setAvailability({ ...availability, slots: e.data.alternatives, recommended: e.data.alternatives[0] })
      }
      setSubmitError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'status') {
    return <FamilyStatusLookup onBack={() => setMode('apply')} />
  }

  if (confirmation) {
    return (
      <div class="family-flow family-confirmation">
        <div class="family-confirmation-check">✓</div>
        <h2>{t.confirmedTitle || 'Family application submitted'}</h2>
        <p class="family-confirmation-reference">{confirmation.reference}</p>
        <p class="family-confirmation-note">
          {t.confirmedNote
            ? t.confirmedNote(confirmation.partySize)
            : `One shared appointment for all ${confirmation.partySize} of you — no need to book separately.`}
        </p>

        <FamilyTree
          sponsorName={confirmation.sponsorName}
          members={confirmation.members.map((m) => ({
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

        <div class="family-summary-card">
          <div class="family-summary-row">
            <span>{t.totalFeeLabel || 'Total government fee'}</span>
            <strong>{confirmation.feeAed} AED</strong>
          </div>
          <div class="family-summary-row">
            <span>{t.appointmentLabel || 'Appointment'}</span>
            <strong>
              {confirmation.centerName} — {confirmation.date} {confirmation.time}
            </strong>
          </div>
          {confirmation.visitsSaved > 0 && (
            <p class="family-visits-saved">
              {t.visitsSavedLabel
                ? t.visitsSavedLabel(confirmation.visitsSaved)
                : `One shared visit instead of ${confirmation.visitsSaved} separate ones.`}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div class="family-flow">
      <button type="button" class="family-back-link" onClick={() => setMode('status')}>
        {t.trackExistingLink || "Already applied? Check your family's status"}
      </button>

      <h2>{t.title || 'Apply for your family'}</h2>
      <p class="family-intro">
        {t.intro ||
          'Add your spouse and children to one application, book a single shared appointment for everyone, and submit it all together.'}
      </p>

      {draftOffer && (
        <div class="family-draft-banner">
          <span>{t.draftFoundTitle || 'We saved a draft of a family application from earlier.'}</span>
          <div class="family-draft-banner-actions">
            <button type="button" class="family-draft-resume-btn" onClick={resumeDraft}>
              {t.resumeDraftButton || 'Resume'}
            </button>
            <button type="button" class="family-draft-discard-btn" onClick={discardDraft}>
              {t.discardDraftButton || 'Start fresh'}
            </button>
          </div>
        </div>
      )}

      {reqError && <p class="family-error">{reqError}</p>}

      {requirements && (
        <>
          <FamilyTree
            sponsorName={sponsorName}
            members={membersForTree}
            selectedMemberId={selectedMemberId}
            onSelectMember={setSelectedMemberId}
            onAddSpouse={() => addMember('spouse')}
            onAddChild={() => addMember('child')}
            t={{
              sponsorTag: t.sponsorTag || 'Sponsor',
              sponsorPlaceholder: t.sponsorPlaceholder || 'You',
              spouseLabel: t.spouseLabel || 'Spouse',
              childLabel: t.childLabel || 'Child',
              addSpouse: t.addSpouse || '+ Add spouse',
              addChild: t.addChild || '+ Add child'
            }}
          />

          {members.length === 0 && (
            <p class="family-empty-hint">
              {t.emptyTreeHint || 'Tap "+ Add spouse" or "+ Add child" above to start building your family application.'}
            </p>
          )}

          <div class="family-section">
            <h3>{t.sponsorSectionTitle || 'Your details (the sponsor)'}</h3>
            <div class="family-field-row">
              <div class="family-field">
                <label>{t.sponsorNameLabel || 'Full name'}</label>
                <input type="text" value={sponsorName} onInput={(e) => setSponsorName(e.target.value)} />
              </div>
              <div class="family-field">
                <label>{t.sponsorEmailLabel || 'Email'}</label>
                <input type="email" value={sponsorEmail} onInput={(e) => setSponsorEmail(e.target.value)} />
              </div>
              <div class="family-field">
                <label>{t.sponsorPhoneLabel || 'Phone (optional)'}</label>
                <input type="tel" value={sponsorPhone} onInput={(e) => setSponsorPhone(e.target.value)} />
              </div>
            </div>

            <label class="family-doc-note">
              {t.sponsorDocsTitle || 'Your documents (cover the whole household — only needed once)'}
            </label>
            <div class="family-doc-list">
              {sponsorRequired.map((doc) => (
                <label key={doc} class="family-doc-checkbox">
                  <input type="checkbox" checked={!!sponsorDocs[doc]} onChange={() => toggleSponsorDoc(doc)} />
                  {doc}
                </label>
              ))}
            </div>
          </div>

          {selectedMember && (
            <div class="family-section family-member-editor">
              <div class="family-member-editor-header">
                <h3>
                  {selectedMember.relationship === 'spouse' ? t.spouseLabel || 'Spouse' : t.childLabel || 'Child'}{' '}
                  {t.detailsSuffix || 'details'}
                </h3>
                <button type="button" class="family-remove-btn" onClick={() => removeMember(selectedMember.id)}>
                  {t.removeMemberButton || 'Remove'}
                </button>
              </div>
              <div class="family-field-row">
                <div class="family-field">
                  <label>{t.fullNameLabel || 'Full name'}</label>
                  <input
                    type="text"
                    value={selectedMember.fullName}
                    onInput={(e) => updateMember(selectedMember.id, 'fullName', e.target.value)}
                  />
                </div>
                <div class="family-field">
                  <label>{t.dobLabel || 'Date of birth'}</label>
                  <input
                    type="date"
                    value={selectedMember.dateOfBirth}
                    onInput={(e) => updateMember(selectedMember.id, 'dateOfBirth', e.target.value)}
                  />
                </div>
              </div>
              <label class="family-doc-note">{t.requiredDocumentsLabel || 'Required documents'}</label>
              <div class="family-doc-list">
                {(requirements[selectedMember.relationship] || []).map((doc) => (
                  <label key={doc} class="family-doc-checkbox">
                    <input
                      type="checkbox"
                      checked={!!selectedMember.docs?.[doc]}
                      onChange={() => toggleMemberDoc(selectedMember.id, doc)}
                    />
                    {doc}
                  </label>
                ))}
              </div>
            </div>
          )}

          {members.length > 0 && (
            <div class="family-summary-card">
              <div class="family-summary-row">
                <span>{t.readinessLabel || 'Household paperwork complete'}</span>
                <strong>{readinessPercent}%</strong>
              </div>
              <div class="family-readiness-bar">
                <div class="family-readiness-bar-fill" style={{ width: `${readinessPercent}%` }} />
              </div>

              {whatsLeft.length > 0 && (
                <div class="family-whatsleft family-whatsleft-inline">
                  <strong>{t.whatsLeftTitle || 'Still needed'}</strong>
                  {whatsLeft.map((item) => (
                    <p key={item.label}>
                      <strong>{item.label}:</strong> {item.missing.join(', ')}
                    </p>
                  ))}
                </div>
              )}
              <div class="family-summary-row">
                <span>{t.feePerPersonLabel || 'Fee per dependent'}</span>
                <strong>{feePerDependent} AED</strong>
              </div>
              <div class="family-summary-row family-summary-total">
                <span>
                  {t.totalFeeLabel || 'Total'} ({members.length}{' '}
                  {members.length === 1 ? t.dependentSingular || 'dependent' : t.dependentPlural || 'dependents'})
                </span>
                <strong>{totalFee} AED</strong>
              </div>
              {members.length > 1 && (
                <p class="family-visits-saved">
                  {t.visitsSavedLabel
                    ? t.visitsSavedLabel(members.length - 1)
                    : `One shared visit instead of ${members.length - 1} separate ones.`}
                </p>
              )}
            </div>
          )}

          <div class="family-section">
            <h3>{t.scheduleTitle || 'Book one shared appointment'}</h3>
            <p class="family-hint">
              {t.scheduleHint ||
                "Everyone attends the same visit — pick a date and we'll show slots with room for your whole family."}
            </p>

            <div class="family-date-grid">
              {nextNDates(14).map((date) => (
                <button
                  key={date}
                  type="button"
                  class={`family-date-card ${selectedDate === date ? 'selected' : ''}`}
                  onClick={() => checkAvailability(date)}
                >
                  {new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                </button>
              ))}
            </div>

            {availabilityLoading && (
              <p class="family-hint">{t.checkingAvailability || 'Checking real-time availability…'}</p>
            )}
            {availabilityError && <p class="family-error">{availabilityError}</p>}

            {availability && availability.slots.length === 0 && (
              <p class="family-hint">
                {t.noSlotsFound || 'No single slot fits your whole family on this date yet — try another date.'}
              </p>
            )}

            {availability && availability.slots.length > 0 && (
              <div class="family-slot-list">
                {availability.slots.slice(0, 6).map((slot) => (
                  <button
                    type="button"
                    key={`${slot.centerId}-${slot.time}`}
                    class={`family-slot-card ${
                      selectedSlot?.centerId === slot.centerId && selectedSlot?.time === slot.time ? 'selected' : ''
                    }`}
                    onClick={() => setSelectedSlot(slot)}
                  >
                    <strong>{slot.centerName}</strong>
                    <span>{slot.time}</span>
                    <span class="family-slot-remaining">
                      {slot.remaining} {t.spotsLeft || 'spots left'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {submitError && <p class="family-error">{submitError}</p>}

          <button type="button" class="family-submit-button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t.submitting || 'Submitting…' : t.submitButton || 'Submit family application'}
          </button>
        </>
      )}
    </div>
  )
}
