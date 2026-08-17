import { useState, useEffect } from 'preact/hooks'
import { getServices, getAvailability, createAppointment, verifyDocuments, fileToBase64 } from './api'
import { useUaePass } from '../uaepass/UaePassContext'
import { UaePassBadge, UaePassBanner } from '../uaepass/UaePassDocuments'
import './booking.css'

const STEPS = ['service', 'date', 'slot', 'documents', 'details', 'confirmation']

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function nextNDates(n) {
  const dates = []
  const start = new Date()
  for (let i = 1; i <= n; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

export function BookingFlow({ onSelectFamilyService }) {
  const { profile, matchDocument } = useUaePass()
  const [step, setStep] = useState('service')

  const [services, setServices] = useState([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [servicesError, setServicesError] = useState(null)

  const [selectedService, setSelectedService] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)

  const [availability, setAvailability] = useState(null)
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState(null)

  const [selectedSlot, setSelectedSlot] = useState(null)

  // documentFiles: { [requirementLabel]: File }
  const [documentFiles, setDocumentFiles] = useState({})
  const [aiResults, setAiResults] = useState(null)
  const [aiChecking, setAiChecking] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [overrideAiCheck, setOverrideAiCheck] = useState(false)

  const [form, setForm] = useState({
    customerName: profile?.fullNameEnglish || '',
    customerEmail: profile?.email || '',
    customerPhone: profile?.mobileNumber || ''
  })
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)

  useEffect(() => {
    setServicesLoading(true)
    getServices()
      .then(setServices)
      .catch((e) => setServicesError(e.message))
      .finally(() => setServicesLoading(false))
  }, [])

  useEffect(() => {
    if (!profile) return
    setForm((current) => ({
      customerName: current.customerName || profile.fullNameEnglish || '',
      customerEmail: current.customerEmail || profile.email || '',
      customerPhone: current.customerPhone || profile.mobileNumber || ''
    }))
  }, [profile])

  function chooseService(service) {
    // Family Residence Permit gets the dedicated multi-member flow
    // (tree builder, one shared appointment, per-member documents)
    // instead of the generic single-applicant path — whichever way
    // someone reaches it, "family" should mean the same thing.
    if (service.id === 'family-residence' && onSelectFamilyService) {
      onSelectFamilyService()
      return
    }
    setSelectedService(service)
    setStep('date')
  }

  function chooseDate(date) {
    setSelectedDate(date)
    setStep('slot')
    setAvailabilityLoading(true)
    setAvailabilityError(null)
    getAvailability(selectedService.id, date)
      .then(setAvailability)
      .catch((e) => setAvailabilityError(e.message))
      .finally(() => setAvailabilityLoading(false))
  }

  function chooseSlot(slot) {
    setSelectedSlot(slot)
    setDocumentFiles({})
    setAiResults(null)
    setAiError(null)
    setOverrideAiCheck(false)
    setStep('documents')
  }

  function attachDocument(label, file) {
    setDocumentFiles((prev) => ({ ...prev, [label]: file }))
    // Uploading a new/replacement file invalidates the last AI check.
    setAiResults(null)
    setOverrideAiCheck(false)
  }

  function removeDocument(label) {
    setDocumentFiles((prev) => {
      const next = { ...prev }
      delete next[label]
      return next
    })
    setAiResults(null)
    setOverrideAiCheck(false)
  }

  async function runAiCheck() {
    setAiChecking(true)
    setAiError(null)
    try {
      const entries = Object.entries(documentFiles)
      const files = await Promise.all(
        entries.map(async ([label, file]) => ({
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataBase64: await fileToBase64(file),
          requirementLabel: label
        }))
      )
      const result = await verifyDocuments(selectedService.id, files)
      setAiResults(result)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setAiChecking(false)
    }
  }

  function continueFromDocuments() {
    setStep('details')
  }

  async function submitBooking(e) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitError(null)
    try {
      const appointment = await createAppointment({
        serviceId: selectedService.id,
        centerId: selectedSlot.centerId,
        date: selectedSlot.date,
        time: selectedSlot.time,
        customerName: form.customerName,
        customerEmail: form.customerEmail,
        customerPhone: form.customerPhone
      })
      setConfirmation(appointment)
      setStep('confirmation')
    } catch (err) {
      if (err.data?.alternatives) {
        setAvailability({ ...availability, slots: err.data.alternatives, recommended: err.data.alternatives[0] })
        setSubmitError('That slot filled up just now — pick one of the fresh options below.')
        setStep('slot')
      } else {
        setSubmitError(err.message)
      }
    } finally {
      setSubmitting(false)
    }
  }

  function restart() {
    setStep('service')
    setSelectedService(null)
    setSelectedDate(null)
    setAvailability(null)
    setSelectedSlot(null)
    setDocumentFiles({})
    setAiResults(null)
    setAiError(null)
    setOverrideAiCheck(false)
    setForm({
      customerName: profile?.fullNameEnglish || '',
      customerEmail: profile?.email || '',
      customerPhone: profile?.mobileNumber || ''
    })
    setConfirmation(null)
    setSubmitError(null)
  }

  const stepIndex = STEPS.indexOf(step)
  const allDocumentsProvided = selectedService?.documents?.every(
    (label) => Boolean(matchDocument(label) || documentFiles[label])
  ) || false

  return (
    <div class="booking-flow">
      <UaePassBanner />
      <div class="booking-progress">
        {STEPS.slice(0, 5).map((s, i) => (
          <div key={s} class={`booking-progress-step ${i <= stepIndex ? 'done' : ''} ${i === stepIndex ? 'current' : ''}`}>
            <span class="booking-progress-dot">{i < stepIndex ? '✓' : i + 1}</span>
            <span class="booking-progress-label">
              {s === 'service'
                ? 'Service'
                : s === 'date'
                ? 'Date'
                : s === 'slot'
                ? 'Center & Time'
                : s === 'documents'
                ? 'Documents'
                : 'Your Details'}
            </span>
          </div>
        ))}
      </div>

      {step === 'service' && (
        <div class="booking-step booking-step-anim">
          <h2>What would you like to do?</h2>
          {servicesLoading && <p class="booking-hint">Loading services…</p>}
          {servicesError && (
            <p class="booking-error">
              Couldn't reach the booking service ({servicesError}). Make sure the backend is running.
            </p>
          )}
          <div class="booking-service-grid">
            {services.map((service) => (
              <button key={service.id} class="booking-service-card" onClick={() => chooseService(service)} type="button">
                <strong>{service.name}</strong>
                <span class="booking-fee">{service.feeAed} AED</span>
                <span class="booking-duration">~{service.avgDurationMinutes} min</span>
                {service.id === 'family-residence' && (
                  <span class="booking-family-hint">Includes spouse &amp; children — one shared visit →</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'date' && selectedService && (
        <div class="booking-step booking-step-anim">
          <button type="button" class="booking-back" onClick={() => setStep('service')}>← Back</button>
          <h2>Choose a date for {selectedService.name}</h2>

          <div class="booking-docs-callout">
            <div class="booking-docs-callout-header">
              <span class="booking-docs-callout-icon">📄</span>
              <strong>Bring these documents — you'll also scan them here before you go</strong>
            </div>
            <ul class="booking-docs-callout-list">
              {selectedService.documents.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </div>

          <div class="booking-date-grid">
            {nextNDates(14).map((date) => (
              <button key={date} class="booking-date-card" type="button" onClick={() => chooseDate(date)}>
                {new Date(date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'slot' && selectedService && selectedDate && (
        <div class="booking-step booking-step-anim">
          <button type="button" class="booking-back" onClick={() => setStep('date')}>← Back</button>
          <h2>Available centers & times</h2>
          <p class="booking-hint">
            {selectedService.name} · {new Date(selectedDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>

          {submitError && <p class="booking-error">{submitError}</p>}
          {availabilityLoading && <p class="booking-hint">Checking real-time availability…</p>}
          {availabilityError && <p class="booking-error">{availabilityError}</p>}

          {availability && availability.recommended && (
            <div class="booking-recommended">
              <span class="booking-recommended-badge">
                Recommended — lowest wait
                <span class="booking-tooltip-wrap">
                  <span class="booking-tooltip-trigger" tabIndex={0}>ⓘ</span>
                  <span class="booking-tooltip-bubble">
                    Ranked from live bookings at each center for this date — not random. We compare how full
                    every slot already is and put the least-booked, soonest option first.
                  </span>
                </span>
              </span>
              <SlotCard slot={availability.recommended} onSelect={chooseSlot} highlight />
            </div>
          )}

          <div class="booking-slot-list">
            {availability?.slots
              ?.filter((s) => !(availability.recommended && s.centerId === availability.recommended.centerId && s.time === availability.recommended.time))
              .slice(0, 12)
              .map((slot) => (
                <SlotCard key={`${slot.centerId}-${slot.time}`} slot={slot} onSelect={chooseSlot} />
              ))}
          </div>

          {availability && availability.slots?.length === 0 && (
            <p class="booking-error">No availability in the next visible window for this date. Try another date.</p>
          )}
        </div>
      )}

      {step === 'documents' && selectedService && selectedSlot && (
        <div class="booking-step booking-step-anim">
          <button type="button" class="booking-back" onClick={() => setStep('slot')}>← Back</button>
          <h2>Scan your documents</h2>
          <p class="booking-hint">
            Upload each document below. Our AI checks that you have the right file for each requirement
            before you head to the center — so a wrong or missing document doesn't cost you the trip.
          </p>

          <div class="booking-doc-upload-list">
            {selectedService.documents.map((label) => {
              const file = documentFiles[label]
              const uaeDocument = matchDocument(label)
              const result = aiResults?.requirements?.find((r) => r.label === label)
              return (
                <div key={label} class={`booking-doc-upload-row ${uaeDocument ? 'status-ok' : result ? `status-${result.status}` : ''}`}>
                  <div class="booking-doc-upload-info">
                    <span class="booking-doc-upload-label">{label}</span>
                    {uaeDocument && (
                      <>
                        <UaePassBadge />
                        <span class="booking-doc-upload-filename">{uaeDocument.fileName}</span>
                      </>
                    )}
                    {file && <span class="booking-doc-upload-filename">{file.name}</span>}
                    {result && (
                      <span class={`booking-doc-status booking-doc-status-${result.status}`}>
                        {result.status === 'ok' && '✓ Looks good'}
                        {result.status === 'missing' && '✗ Missing'}
                        {result.status === 'unclear' && '! Unclear — try a clearer photo'}
                        <span class="booking-doc-status-reason">{result.reason}</span>
                      </span>
                    )}
                  </div>
                  <div class="booking-doc-upload-actions">
                    {!uaeDocument && <label class="booking-doc-upload-btn">
                      {file ? 'Replace' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => e.target.files[0] && attachDocument(label, e.target.files[0])}
                      />
                    </label>}
                    {file && (
                      <button type="button" class="booking-doc-remove-btn" onClick={() => removeDocument(label)}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {aiError && <p class="booking-error">{aiError}</p>}

          {aiResults && !aiResults.aiEnabled && (
            <p class="booking-hint booking-ai-note">
              AI document scanning isn't fully configured in this environment yet — results above are a basic
              filename check only.
            </p>
          )}

          <div class="booking-doc-check-actions">
            <button
              type="button"
              class="booking-scan-btn"
              disabled={Object.keys(documentFiles).length === 0 || aiChecking}
              onClick={runAiCheck}
            >
              {aiChecking ? (
                <>
                  <span class="booking-spinner" /> Scanning documents…
                </>
              ) : (
                'Scan with AI'
              )}
            </button>

            {aiResults && !aiResults.allSatisfied && (
              <label class="booking-doc-override">
                <input
                  type="checkbox"
                  checked={overrideAiCheck}
                  onChange={(e) => setOverrideAiCheck(e.target.checked)}
                />
                I've checked myself and want to continue anyway
              </label>
            )}

            <button
              type="button"
              class="booking-continue-btn"
              disabled={!allDocumentsProvided || (Object.keys(documentFiles).length > 0 && (!aiResults || (!aiResults.allSatisfied && !overrideAiCheck)))}
              onClick={continueFromDocuments}
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 'details' && selectedSlot && (
        <div class="booking-step booking-step-anim">
          <button type="button" class="booking-back" onClick={() => setStep('documents')}>← Back</button>
          <h2>Confirm your appointment</h2>

          <div class="booking-summary">
            <div><span>Service</span><strong>{selectedService.name}</strong></div>
            <div><span>Center</span><strong>{selectedSlot.centerName}</strong></div>
            <div><span>Date</span><strong>{new Date(selectedSlot.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></div>
            <div><span>Time</span><strong>{selectedSlot.time}</strong></div>
            <div><span>Fee</span><strong>{selectedService.feeAed} AED</strong></div>
          </div>

          <div class="booking-documents">
            <strong>Bring these documents:</strong>
            <ul>
              {selectedService.documents.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </div>

          <form class="booking-form" onSubmit={submitBooking}>
            <label>
              Full name
              <UaePassBadge />
              <input
                type="text"
                required
                value={form.customerName}
                onInput={(e) => setForm({ ...form, customerName: e.target.value })}
              />
            </label>
            <label>
              Email
              <UaePassBadge />
              <input
                type="email"
                required
                value={form.customerEmail}
                onInput={(e) => setForm({ ...form, customerEmail: e.target.value })}
              />
            </label>
            <label>
              Phone (optional)
              <UaePassBadge />
              <input
                type="tel"
                value={form.customerPhone}
                onInput={(e) => setForm({ ...form, customerPhone: e.target.value })}
              />
            </label>

            {submitError && <p class="booking-error">{submitError}</p>}

            <button type="submit" class="booking-submit" disabled={submitting}>
              {submitting ? 'Booking…' : 'Confirm Appointment'}
            </button>
          </form>
        </div>
      )}

      {step === 'confirmation' && confirmation && (
        <div class="booking-step booking-step-anim booking-confirmation">
          <div class="booking-check">✓</div>
          <h2>Appointment confirmed</h2>
          <p class="booking-reference">{confirmation.reference}</p>

          <div class="booking-summary">
            <div><span>Service</span><strong>{confirmation.serviceName}</strong></div>
            <div><span>Center</span><strong>{confirmation.centerName}</strong></div>
            <div><span>Date</span><strong>{new Date(confirmation.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</strong></div>
            <div><span>Time</span><strong>{confirmation.time}</strong></div>
            <div><span>Fee due</span><strong>{confirmation.feeAed} AED</strong></div>
          </div>

          <p class="booking-hint">A confirmation has been sent to {confirmation.customerEmail}.</p>
          <button type="button" class="booking-submit" onClick={restart}>Book another appointment</button>
        </div>
      )}
    </div>
  )
}

function SlotCard({ slot, onSelect, highlight }) {
  const busyLabel =
    slot.loadPercent >= 80 ? 'Almost full' : slot.loadPercent >= 50 ? 'Filling up' : 'Good availability'
  const busyClass =
    slot.loadPercent >= 80 ? 'busy-high' : slot.loadPercent >= 50 ? 'busy-mid' : 'busy-low'

  return (
    <button type="button" class={`booking-slot-card ${highlight ? 'highlight' : ''}`} onClick={() => onSelect(slot)}>
      <div class="booking-slot-top">
        <strong>{slot.centerName}</strong>
        <span class={`booking-slot-load ${busyClass}`}>{busyLabel}</span>
      </div>
      <div class="booking-slot-bottom">
        <span>{slot.time}</span>
        <span class="booking-slot-location">{slot.location}</span>
        <span class="booking-slot-remaining">{slot.remaining} spot{slot.remaining === 1 ? '' : 's'} left</span>
      </div>
    </button>
  )
}
