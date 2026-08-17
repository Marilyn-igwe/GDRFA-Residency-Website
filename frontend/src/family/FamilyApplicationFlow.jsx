import {
  useState,
  useEffect,
  useMemo
} from 'preact/hooks'
import {
  FamilyTree
} from './FamilyTree'
import {
  FamilyStatusLookup
} from './FamilyStatusLookup'
import {
  getFamilyRequirements,
  getFamilyAvailability,
  submitFamilyApplication
} from './api'
import {
  useLanguage
} from '../language/LanguageContext'
import {
  usePublishApplicationContext
} from '../support/applicationContext'
import './family.css'

const DRAFT_KEY =
  'gdrfa_family_draft'

function nextNDates(numberOfDates) {
  const dates = []
  const today = new Date()

  for (
    let index = 1;
    index <= numberOfDates;
    index++
  ) {
    const date = new Date(today)

    date.setDate(
      date.getDate() + index
    )

    dates.push(
      date
        .toISOString()
        .slice(0, 10)
    )
  }

  return dates
}

function newMemberId() {
  return (
    `m_${Date.now()}_` +
    `${Math.floor(
      Math.random() * 10000
    )}`
  )
}

export function FamilyApplicationFlow() {
  const {
    family
  } = useLanguage()

  const t = family || {}

  const [
    mode,
    setMode
  ] = useState('apply')

  const [
    requirements,
    setRequirements
  ] = useState(null)

  const [
    reqError,
    setReqError
  ] = useState(null)

  const [
    sponsorName,
    setSponsorName
  ] = useState('Tamreen Ahmed')

  const [
    sponsorEmail,
    setSponsorEmail
  ] = useState('')

  const [
    sponsorPhone,
    setSponsorPhone
  ] = useState('')

  const [
    sponsorDocs,
    setSponsorDocs
  ] = useState({})

  const [
    members,
    setMembers
  ] = useState([])

  const [
    selectedMemberId,
    setSelectedMemberId
  ] = useState(null)

  const [
    selectedDate,
    setSelectedDate
  ] = useState(null)

  const [
    availability,
    setAvailability
  ] = useState(null)

  const [
    availabilityLoading,
    setAvailabilityLoading
  ] = useState(false)

  const [
    availabilityError,
    setAvailabilityError
  ] = useState(null)

  const [
    selectedSlot,
    setSelectedSlot
  ] = useState(null)

  const [
    submitting,
    setSubmitting
  ] = useState(false)

  const [
    submitError,
    setSubmitError
  ] = useState(null)

  const [
    confirmation,
    setConfirmation
  ] = useState(null)

  const [
    draftOffer,
    setDraftOffer
  ] = useState(null)

  useEffect(() => {
    if (
      typeof window === 'undefined'
    ) {
      return
    }

    try {
      const saved =
        localStorage.getItem(
          DRAFT_KEY
        )

      if (saved) {
        setDraftOffer(
          JSON.parse(saved)
        )
      }
    } catch {
      // Ignore unreadable drafts.
    }
  }, [])

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      confirmation
    ) {
      return
    }

    const hasContent =
      sponsorEmail.trim() ||
      members.length > 0

    if (!hasContent) {
      return
    }

    const draft = {
      sponsorName,
      sponsorEmail,
      sponsorPhone,
      sponsorDocs,
      members
    }

    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify(draft)
    )
  }, [
    sponsorName,
    sponsorEmail,
    sponsorPhone,
    sponsorDocs,
    members,
    confirmation
  ])

  useEffect(() => {
    getFamilyRequirements()
      .then(setRequirements)
      .catch((error) => {
        setReqError(
          error.message
        )
      })
  }, [])

  useEffect(() => {
    setAvailability(null)
    setSelectedSlot(null)
  }, [members.length])

  function resumeDraft() {
    setSponsorName(
      draftOffer.sponsorName
    )

    setSponsorEmail(
      draftOffer.sponsorEmail
    )

    setSponsorPhone(
      draftOffer.sponsorPhone
    )

    setSponsorDocs(
      draftOffer.sponsorDocs
    )

    setMembers(
      draftOffer.members
    )

    setDraftOffer(null)
  }

  function discardDraft() {
    localStorage.removeItem(
      DRAFT_KEY
    )

    setDraftOffer(null)
  }

  const selectedMember =
    members.find(
      (member) =>
        member.id ===
        selectedMemberId
    ) || null

  const membersForTree =
    useMemo(() => {
      if (!requirements) {
        return members.map(
          (member) => ({
            ...member,
            requiredCount: 0,
            providedCount: 0
          })
        )
      }

      return members.map(
        (member) => {
          const required =
            requirements[
              member.relationship
            ] || []

          const providedCount =
            required.filter(
              (document) =>
                member.docs?.[
                  document
                ]
            ).length

          return {
            ...member,
            requiredCount:
              required.length,
            providedCount
          }
        }
      )
    }, [
      members,
      requirements
    ])

  const sponsorRequired =
    requirements?.sponsor || []

  const sponsorProvidedCount =
    sponsorRequired.filter(
      (document) =>
        sponsorDocs[document]
    ).length

  const totalRequired =
    sponsorRequired.length +
    membersForTree.reduce(
      (total, member) =>
        total +
        member.requiredCount,
      0
    )

  const totalProvided =
    sponsorProvidedCount +
    membersForTree.reduce(
      (total, member) =>
        total +
        member.providedCount,
      0
    )

  const readinessPercent =
    totalRequired > 0
      ? Math.round(
          (
            totalProvided /
            totalRequired
          ) * 100
        )
      : 0

  const whatsLeft =
    useMemo(() => {
      const items = []

      const sponsorMissing =
        sponsorRequired.filter(
          (document) =>
            !sponsorDocs[
              document
            ]
        )

      if (
        sponsorMissing.length > 0
      ) {
        items.push({
          label:
            t.sponsorTag ||
            'Sponsor',

          missing:
            sponsorMissing
        })
      }

      membersForTree.forEach(
        (member) => {
          if (!requirements) {
            return
          }

          const required =
            requirements[
              member.relationship
            ] || []

          const missingDocuments =
            required.filter(
              (document) =>
                !member.docs?.[
                  document
                ]
            )

          const missing = [
            ...(
              member.fullName?.trim()
                ? []
                : [
                    t.fullNameLabel ||
                    'Full name'
                  ]
            ),

            ...missingDocuments
          ]

          if (!missing.length) {
            return
          }

          items.push({
            label:
              member.fullName?.trim() ||
              (
                member.relationship ===
                'spouse'
                  ? t.spouseLabel
                  : t.childLabel
              ) ||
              'Member',

            missing
          })
        }
      )

      return items
    }, [
      sponsorRequired,
      sponsorDocs,
      membersForTree,
      requirements,
      t
    ])

  const selectedMemberDocuments =
    selectedMember &&
    requirements
      ? (
          requirements[
            selectedMember
              .relationship
          ] || []
        )
      : []

  const selectedMemberMissingDocuments =
    selectedMemberDocuments.filter(
      (document) =>
        !selectedMember?.docs?.[
          document
        ]
    )

  const familyMissingDocuments =
    whatsLeft.flatMap(
      (item) =>
        item.missing.map(
          (document) =>
            `${item.label}: ` +
            document
        )
    )

  let familyStepId =
    'family-details'

  let familyStepName =
    'Family application details'

  if (selectedMember) {
    familyStepId =
      'member-details'

    familyStepName =
      'Family member details'
  }

  if (selectedDate) {
    familyStepId =
      'appointment'

    familyStepName =
      'Shared appointment'
  }

  if (confirmation) {
    familyStepId =
      'confirmation'

    familyStepName =
      'Application confirmation'
  }

  usePublishApplicationContext({
    contextId:
      'family-application',

    applicationType:
      'family-residence',

    serviceId:
      'family-residence',

    serviceName:
      'Family Residence Permit',

    stepId:
      familyStepId,

    stepName:
      familyStepName,

    selectedCategory:
      selectedMember
        ?.relationship || '',

    // No applicant name is published.
    selectedApplicant: '',

    requiredDocuments:
      selectedMember
        ? selectedMemberDocuments
        : sponsorRequired,

    missingDocuments:
      selectedMember
        ? selectedMemberMissingDocuments
        : familyMissingDocuments,

    visibleErrors: [
      reqError,
      availabilityError,
      submitError
    ].filter(Boolean),

    acceptedFileTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png'
    ],

    maximumFileSize: ''
  })

  const feePerDependent =
    requirements
      ?.feePerDependentAed || 0

  const totalFee =
    feePerDependent *
    members.length

  function addMember(
    relationship
  ) {
    const id = newMemberId()

    let fullName = ''

    if (
      relationship === 'child'
    ) {
      const parts =
        sponsorName
          .trim()
          .split(/\s+/)

      if (parts.length > 1) {
        fullName =
          parts[
            parts.length - 1
          ]
      }
    }

    setMembers(
      (current) => [
        ...current,
        {
          id,
          relationship,
          fullName,
          dateOfBirth: '',
          docs: {}
        }
      ]
    )

    setSelectedMemberId(id)
  }

  function removeMember(id) {
    setMembers(
      (current) =>
        current.filter(
          (member) =>
            member.id !== id
        )
    )

    if (
      selectedMemberId === id
    ) {
      setSelectedMemberId(null)
    }
  }

  function updateMember(
    id,
    field,
    value
  ) {
    setMembers(
      (current) =>
        current.map(
          (member) =>
            member.id === id
              ? {
                  ...member,
                  [field]: value
                }
              : member
        )
    )
  }

  function toggleMemberDoc(
    id,
    document
  ) {
    setMembers(
      (current) =>
        current.map(
          (member) =>
            member.id === id
              ? {
                  ...member,

                  docs: {
                    ...member.docs,

                    [document]:
                      !member.docs?.[
                        document
                      ]
                  }
                }
              : member
        )
    )
  }

  function toggleSponsorDoc(
    document
  ) {
    setSponsorDocs(
      (current) => ({
        ...current,

        [document]:
          !current[document]
      })
    )
  }

  async function checkAvailability(
    date
  ) {
    setSelectedDate(date)
    setAvailabilityLoading(true)
    setAvailabilityError(null)
    setSelectedSlot(null)

    try {
      const result =
        await getFamilyAvailability(
          date,
          Math.max(
            members.length,
            1
          )
        )

      setAvailability(result)
    } catch (error) {
      setAvailabilityError(
        error.message
      )
    } finally {
      setAvailabilityLoading(false)
    }
  }

  async function handleSubmit() {
    setSubmitError(null)

    if (
      !sponsorName.trim() ||
      !sponsorEmail.trim()
    ) {
      setSubmitError(
        t.validationSponsor ||
        'Please enter the sponsor name and email.'
      )

      return
    }

    if (!members.length) {
      setSubmitError(
        t.validationMembers ||
        'Add at least one family member before submitting.'
      )

      return
    }

    if (
      members.some(
        (member) =>
          !member.fullName.trim()
      )
    ) {
      setSubmitError(
        t.validationMemberNames ||
        'Every family member needs a full name.'
      )

      return
    }

    if (!selectedSlot) {
      setSubmitError(
        t.validationSlot ||
        'Pick a shared appointment time for the whole family.'
      )

      return
    }

    setSubmitting(true)

    try {
      const result =
        await submitFamilyApplication({
          sponsorName,
          sponsorEmail,
          sponsorPhone,

          sponsorDocumentsProvided:
            Object.keys(
              sponsorDocs
            ).filter(
              (document) =>
                sponsorDocs[
                  document
                ]
            ),

          members:
            members.map(
              (member) => ({
                id: member.id,

                relationship:
                  member.relationship,

                fullName:
                  member.fullName,

                dateOfBirth:
                  member.dateOfBirth,

                documentsProvided:
                  Object.keys(
                    member.docs || {}
                  ).filter(
                    (document) =>
                      member.docs[
                        document
                      ]
                  )
              })
            ),

          centerId:
            selectedSlot.centerId,

          date:
            selectedSlot.date,

          time:
            selectedSlot.time
        })

      setConfirmation(result)

      localStorage.removeItem(
        DRAFT_KEY
      )
    } catch (error) {
      if (
        error.data?.alternatives
      ) {
        setAvailability({
          ...availability,

          slots:
            error.data
              .alternatives,

          recommended:
            error.data
              .alternatives[0]
        })
      }

      setSubmitError(
        error.message
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'status') {
    return (
      <FamilyStatusLookup
        onBack={() =>
          setMode('apply')
        }
      />
    )
  }

  if (confirmation) {
    return (
      <div class="family-flow family-confirmation">
        <div class="family-confirmation-check">
          ✓
        </div>

        <h2>
          {t.confirmedTitle ||
            'Family application submitted'}
        </h2>

        <p class="family-confirmation-reference">
          {confirmation.reference}
        </p>

        <p class="family-confirmation-note">
          {t.confirmedNote
            ? t.confirmedNote(
                confirmation.partySize
              )
            : `One shared appointment for all ${confirmation.partySize} applicants.`}
        </p>

        <FamilyTree
          sponsorName={
            confirmation.sponsorName
          }
          members={
            confirmation.members.map(
              (member) => ({
                ...member,

                requiredCount:
                  (
                    member
                      .documentsProvided
                      ?.length || 0
                  ) +
                  (
                    member
                      .missingDocuments
                      ?.length || 0
                  ),

                providedCount:
                  member
                    .documentsProvided
                    ?.length || 0
              })
            )
          }
          selectedMemberId={null}
          onSelectMember={() => {}}
          onAddSpouse={() => {}}
          onAddChild={() => {}}
          t={{
            sponsorTag:
              t.sponsorTag ||
              'Sponsor',

            sponsorPlaceholder:
              t.sponsorPlaceholder ||
              'You',

            spouseLabel:
              t.spouseLabel ||
              'Spouse',

            childLabel:
              t.childLabel ||
              'Child',

            addSpouse: '',
            addChild: ''
          }}
        />

        <div class="family-summary-card">
          <div class="family-summary-row">
            <span>
              {t.totalFeeLabel ||
                'Total government fee'}
            </span>

            <strong>
              {confirmation.feeAed}{' '}
              AED
            </strong>
          </div>

          <div class="family-summary-row">
            <span>
              {t.appointmentLabel ||
                'Appointment'}
            </span>

            <strong>
              {
                confirmation
                  .centerName
              }{' '}
              {confirmation.date}{' '}
              {confirmation.time}
            </strong>
          </div>

          {confirmation.visitsSaved >
            0 && (
            <p class="family-visits-saved">
              {t.visitsSavedLabel
                ? t.visitsSavedLabel(
                    confirmation
                      .visitsSaved
                  )
                : `One shared visit instead of ${confirmation.visitsSaved} separate visits.`}
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div class="family-flow">
      <button
        type="button"
        class="family-back-link"
        onClick={() =>
          setMode('status')
        }
      >
        {t.trackExistingLink ||
          "Already applied? Check your family's status"}
      </button>

      <h2>
        {t.title ||
          'Apply for your family'}
      </h2>

      <p class="family-intro">
        {t.intro ||
          'Add your spouse and children to one application, book one shared appointment and submit everything together.'}
      </p>

      {draftOffer && (
        <div class="family-draft-banner">
          <span>
            {t.draftFoundTitle ||
              'We saved a previous family application draft.'}
          </span>

          <div class="family-draft-banner-actions">
            <button
              type="button"
              class="family-draft-resume-btn"
              onClick={resumeDraft}
            >
              {t.resumeDraftButton ||
                'Resume'}
            </button>

            <button
              type="button"
              class="family-draft-discard-btn"
              onClick={discardDraft}
            >
              {t.discardDraftButton ||
                'Start fresh'}
            </button>
          </div>
        </div>
      )}

      {reqError && (
        <p class="family-error">
          {reqError}
        </p>
      )}

      {requirements && (
        <>
          <FamilyTree
            sponsorName={sponsorName}
            members={membersForTree}
            selectedMemberId={
              selectedMemberId
            }
            onSelectMember={
              setSelectedMemberId
            }
            onAddSpouse={() =>
              addMember('spouse')
            }
            onAddChild={() =>
              addMember('child')
            }
            t={{
              sponsorTag:
                t.sponsorTag ||
                'Sponsor',

              sponsorPlaceholder:
                t.sponsorPlaceholder ||
                'You',

              spouseLabel:
                t.spouseLabel ||
                'Spouse',

              childLabel:
                t.childLabel ||
                'Child',

              addSpouse:
                t.addSpouse ||
                '+ Add spouse',

              addChild:
                t.addChild ||
                '+ Add child'
            }}
          />

          {!members.length && (
            <p class="family-empty-hint">
              {t.emptyTreeHint ||
                'Add a spouse or child to begin the family application.'}
            </p>
          )}

          <div class="family-section">
            <h3>
              {t.sponsorSectionTitle ||
                'Your details (the sponsor)'}
            </h3>

            <div class="family-field-row">
              <div class="family-field">
                <label>
                  {t.sponsorNameLabel ||
                    'Full name'}
                </label>

                <input
                  type="text"
                  value={sponsorName}
                  onInput={(event) =>
                    setSponsorName(
                      event.target.value
                    )
                  }
                />
              </div>

              <div class="family-field">
                <label>
                  {t.sponsorEmailLabel ||
                    'Email'}
                </label>

                <input
                  type="email"
                  value={sponsorEmail}
                  onInput={(event) =>
                    setSponsorEmail(
                      event.target.value
                    )
                  }
                />
              </div>

              <div class="family-field">
                <label>
                  {t.sponsorPhoneLabel ||
                    'Phone (optional)'}
                </label>

                <input
                  type="tel"
                  value={sponsorPhone}
                  onInput={(event) =>
                    setSponsorPhone(
                      event.target.value
                    )
                  }
                />
              </div>
            </div>

            <label class="family-doc-note">
              {t.sponsorDocsTitle ||
                'Sponsor documents'}
            </label>

            <div class="family-doc-list">
              {sponsorRequired.map(
                (document) => (
                  <label
                    key={document}
                    class="family-doc-checkbox"
                  >
                    <input
                      type="checkbox"
                      checked={
                        !!sponsorDocs[
                          document
                        ]
                      }
                      onChange={() =>
                        toggleSponsorDoc(
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

          {selectedMember && (
            <div class="family-section family-member-editor">
              <div class="family-member-editor-header">
                <h3>
                  {selectedMember
                    .relationship ===
                  'spouse'
                    ? t.spouseLabel ||
                      'Spouse'
                    : t.childLabel ||
                      'Child'}{' '}
                  {t.detailsSuffix ||
                    'details'}
                </h3>

                <button
                  type="button"
                  class="family-remove-btn"
                  onClick={() =>
                    removeMember(
                      selectedMember.id
                    )
                  }
                >
                  {t.removeMemberButton ||
                    'Remove'}
                </button>
              </div>

              <div class="family-field-row">
                <div class="family-field">
                  <label>
                    {t.fullNameLabel ||
                      'Full name'}
                  </label>

                  <input
                    type="text"
                    value={
                      selectedMember
                        .fullName
                    }
                    onInput={(event) =>
                      updateMember(
                        selectedMember.id,
                        'fullName',
                        event.target.value
                      )
                    }
                  />
                </div>

                <div class="family-field">
                  <label>
                    {t.dobLabel ||
                      'Date of birth'}
                  </label>

                  <input
                    type="date"
                    value={
                      selectedMember
                        .dateOfBirth
                    }
                    onInput={(event) =>
                      updateMember(
                        selectedMember.id,
                        'dateOfBirth',
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <label class="family-doc-note">
                {t.requiredDocumentsLabel ||
                  'Required documents'}
              </label>

              <div class="family-doc-list">
                {selectedMemberDocuments.map(
                  (document) => (
                    <label
                      key={document}
                      class="family-doc-checkbox"
                    >
                      <input
                        type="checkbox"
                        checked={
                          !!selectedMember
                            .docs?.[
                              document
                            ]
                        }
                        onChange={() =>
                          toggleMemberDoc(
                            selectedMember.id,
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
          )}

          {members.length > 0 && (
            <div class="family-summary-card">
              <div class="family-summary-row">
                <span>
                  {t.readinessLabel ||
                    'Household paperwork complete'}
                </span>

                <strong>
                  {readinessPercent}%
                </strong>
              </div>

              <div class="family-readiness-bar">
                <div
                  class="family-readiness-bar-fill"
                  style={{
                    width:
                      `${readinessPercent}%`
                  }}
                />
              </div>

              {whatsLeft.length > 0 && (
                <div class="family-whatsleft family-whatsleft-inline">
                  <strong>
                    {t.whatsLeftTitle ||
                      'Still needed'}
                  </strong>

                  {whatsLeft.map(
                    (item) => (
                      <p
                        key={
                          item.label
                        }
                      >
                        <strong>
                          {item.label}:
                        </strong>{' '}
                        {item.missing.join(
                          ', '
                        )}
                      </p>
                    )
                  )}
                </div>
              )}

              <div class="family-summary-row">
                <span>
                  {t.feePerPersonLabel ||
                    'Fee per dependent'}
                </span>

                <strong>
                  {feePerDependent}{' '}
                  AED
                </strong>
              </div>

              <div class="family-summary-row family-summary-total">
                <span>
                  {t.totalFeeLabel ||
                    'Total'}{' '}
                  ({members.length}{' '}
                  {members.length === 1
                    ? t.dependentSingular ||
                      'dependent'
                    : t.dependentPlural ||
                      'dependents'})
                </span>

                <strong>
                  {totalFee} AED
                </strong>
              </div>

              {members.length > 1 && (
                <p class="family-visits-saved">
                  {t.visitsSavedLabel
                    ? t.visitsSavedLabel(
                        members.length - 1
                      )
                    : `One shared visit instead of ${members.length} separate visits.`}
                </p>
              )}
            </div>
          )}

          <div class="family-section">
            <h3>
              {t.scheduleTitle ||
                'Book one shared appointment'}
            </h3>

            <p class="family-hint">
              {t.scheduleHint ||
                'Choose a date to see appointments with capacity for the family.'}
            </p>

            <div class="family-date-grid">
              {nextNDates(14).map(
                (date) => (
                  <button
                    key={date}
                    type="button"
                    class={
                      `family-date-card ` +
                      (
                        selectedDate ===
                        date
                          ? 'selected'
                          : ''
                      )
                    }
                    onClick={() =>
                      checkAvailability(
                        date
                      )
                    }
                  >
                    {new Date(
                      date
                    ).toLocaleDateString(
                      'en-GB',
                      {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                      }
                    )}
                  </button>
                )
              )}
            </div>

            {availabilityLoading && (
              <p class="family-hint">
                {t.checkingAvailability ||
                  'Checking availability...'}
              </p>
            )}

            {availabilityError && (
              <p class="family-error">
                {availabilityError}
              </p>
            )}

            {availability &&
              !availability.slots
                .length && (
                <p class="family-hint">
                  {t.noSlotsFound ||
                    'No suitable appointments were found for this date.'}
                </p>
              )}

            {availability &&
              availability.slots
                .length > 0 && (
                <div class="family-slot-list">
                  {availability.slots
                    .slice(0, 6)
                    .map(
                      (slot) => (
                        <button
                          type="button"
                          key={
                            `${slot.centerId}-` +
                            slot.time
                          }
                          class={
                            `family-slot-card ` +
                            (
                              selectedSlot
                                ?.centerId ===
                                slot.centerId &&
                              selectedSlot
                                ?.time ===
                                slot.time
                                ? 'selected'
                                : ''
                            )
                          }
                          onClick={() =>
                            setSelectedSlot(
                              slot
                            )
                          }
                        >
                          <strong>
                            {
                              slot.centerName
                            }
                          </strong>

                          <span>
                            {slot.time}
                          </span>

                          <span class="family-slot-remaining">
                            {
                              slot.remaining
                            }{' '}
                            {t.spotsLeft ||
                              'spots left'}
                          </span>
                        </button>
                      )
                    )}
                </div>
              )}
          </div>

          {submitError && (
            <p class="family-error">
              {submitError}
            </p>
          )}

          <button
            type="button"
            class="family-submit-button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? t.submitting ||
                'Submitting...'
              : t.submitButton ||
                'Submit family application'}
          </button>
        </>
      )}
    </div>
  )
}