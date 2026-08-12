// Local knowledge base for the employee-facing Regulations Copilot.
//
// SCOPE NOTE: in production this matching would happen server-side against
// an indexed, versioned set of circulars (see askAssistant() in ./api.js,
// which already calls out to `${API_BASE}/employee-assistant` first). This
// file is the offline fallback so the Copilot still works end-to-end during
// local development or a demo where that backend isn't running — the shape
// of each entry (answer + source + updated date) mirrors what a real
// retrieval backend would return, so swapping it out later is a drop-in.
//
// Entries are intentionally written in a compact, front-of-house register:
// something a counter officer can read once and act on, not a legal brief.

export const KNOWLEDGE_BASE_UPDATED = '2026-01-12'

export const knowledgeBase = [
  {
    id: 'golden-visa',
    category: 'Long-term residence',
    title: 'Golden Visa eligibility & fees',
    keywords: ['golden visa', 'golden', '10 year', '10-year', 'long term residence', 'investor visa', 'property investor', 'how much is the golden'],
    answer:
      "The 10-year Golden Visa covers investors (property ≥ AED 2M or an approved fund), entrepreneurs, specialised talents, and outstanding students. It does not require a national sponsor, and dependents can be included regardless of age for children still in education. Ask applicants for the underlying eligibility proof (title deed, business licence, or nomination letter) up front — transfers stall most often because that document is missing or expired.",
    source: { title: 'Golden Visa Eligibility & Fee Schedule', ref: 'Circular 07/2025', updated: '2025-11-03' },
  },
  {
    id: 'overstay-fine',
    category: 'Fines & penalties',
    title: 'Overstay fine calculation',
    keywords: ['overstay', 'fine', 'penalty', 'late fine', 'grace period fine', 'expired visa fine', 'how much is the fine', 'overstayed'],
    answer:
      'Overstay fines run AED 50 for the first day past the grace period, then AED 25 per day after. Always pull the live case in the system to confirm the running total rather than calculating manually, since amnesty periods can reset it. If the applicant is still inside the grace window, no fine applies yet.',
    source: { title: 'Residency Fines Schedule', ref: 'Circular 14/2025', updated: '2025-12-18' },
  },
  {
    id: 'renewal-grace-period',
    category: 'Residence renewal',
    title: 'Residence visa renewal grace period',
    keywords: ['grace period', 'renewal grace', 'expired residence', 'renew late', 'renewal deadline', 'my visa expired', 'visa expired'],
    answer:
      'Residence visa holders get a 30-day grace period after expiry with no fine and no travel-ban risk. Renewal can be filed any time from 30 days before expiry up to the end of the grace window. After day 30, standard overstay fines begin accruing from day 31.',
    source: { title: 'Residence Renewal Procedures', ref: 'Circular 03/2026', updated: '2026-01-08' },
  },
  {
    id: 'sponsorship-salary',
    category: 'Family sponsorship',
    title: 'Family sponsorship minimum salary',
    keywords: ['sponsor family', 'family sponsorship', 'minimum salary', 'sponsor spouse', 'sponsor children', 'dependent visa', 'how much salary', 'salary to sponsor'],
    answer:
      "The baseline minimum salary to sponsor a spouse and children is AED 4,000, or AED 3,000 plus employer-provided accommodation. Sponsors also need a qualifying occupation on their labour card — a short list of excluded job titles can't sponsor regardless of salary, so check the applicant's job title against that list before promising approval.",
    source: { title: 'Family Sponsorship Requirements', ref: 'Circular 19/2025', updated: '2025-09-22' },
  },
  {
    id: 'daughters-age-out',
    category: 'Family sponsorship',
    title: "Daughters' and sons' age-out rule",
    keywords: ['age out', 'daughter sponsorship', 'son sponsorship', '18 years old', 'adult child visa', 'unmarried daughter', 'my daughter', 'my son', 'daughter turns', 'son turns', 'child sponsorship'],
    answer:
      "Unmarried daughters can remain on a father's or husband's sponsorship with no upper age limit. Sons age out at 18, or up to 25 if in full-time education — proof of enrolment must be renewed every academic year for the extension to hold. Sons with a determined disability are exempt from the age limit.",
    source: { title: 'Dependent Sponsorship Age Rules', ref: 'Circular 19/2025', updated: '2025-09-22' },
  },
  {
    id: 'humanitarian-docs',
    category: 'Humanitarian cases',
    title: 'Humanitarian case document checklist',
    keywords: ['humanitarian case', 'humanitarian documents', 'special consideration', 'humanitarian committee', 'compassionate case'],
    answer:
      "Every humanitarian case needs proof of identity, a written statement in the applicant's own words, and category-specific evidence (medical reports for a medical case, a death certificate for bereavement, and so on). The intake form on this dashboard already scores paperwork completeness — if it's under 80%, walk the applicant through exactly what's listed as missing before they submit, so the case doesn't bounce back for basic gaps.",
    source: { title: 'Humanitarian Case Intake Standards', ref: 'Circular 21/2025', updated: '2025-10-05' },
  },
  {
    id: 'domestic-worker',
    category: 'Domestic workers',
    title: 'Domestic worker sponsorship rules',
    keywords: ['domestic worker', 'housemaid', 'nanny visa', 'driver visa', 'maid sponsorship'],
    answer:
      'Sponsoring a domestic worker requires a minimum household income threshold (AED 25,000/month combined, or AED 20,000 with accommodation provided), a signed standard employment contract, and health insurance arranged before the entry permit is issued. Direct-hire and agency-hire routes have different processing timelines, so confirm which route was used before quoting a date.',
    source: { title: 'Domestic Worker Sponsorship Guidelines', ref: 'Circular 11/2025', updated: '2025-08-14' },
  },
  {
    id: 'emirates-id-replacement',
    category: 'Identity documents',
    title: 'Lost or damaged Emirates ID replacement',
    keywords: ['lost emirates id', 'damaged id', 'replace emirates id', 'emirates id renewal', 'id card lost'],
    answer:
      'A lost or damaged Emirates ID should be reported immediately — a small penalty applies for reporting more than 30 days after the loss date. Replacement needs a police report only for theft, not for simple loss, and biometrics are only retaken if more than 5 years have passed since they were last captured.',
    source: { title: 'Emirates ID Replacement Procedure', ref: 'Circular 09/2025', updated: '2025-07-02' },
  },
  {
    id: 'exit-reentry',
    category: 'Travel & permits',
    title: 'Exit & re-entry for residence visa holders',
    keywords: ['exit re-entry', 'travel ban', 'leave country residence visa', 'residence visa travel', 'multiple entry'],
    answer:
      'Residence visa holders can leave and re-enter freely as long as the visa is valid and they do not stay outside the country for more than 6 consecutive months, which auto-cancels residence status. No separate exit permit is needed for a standard residence visa — that only applies to specific labour-related cases flagged in the system.',
    source: { title: 'Travel & Re-entry Rules for Residents', ref: 'Circular 05/2025', updated: '2025-04-18' },
  },
  {
    id: 'cancellation-procedure',
    category: 'Residence renewal',
    title: 'Residence visa cancellation procedure',
    keywords: ['cancel visa', 'cancellation', 'cancel residence', 'cancel sponsorship', 'cancel a residence', 'cancel my visa', 'cancelling'],
    answer:
      'Cancellation must be initiated by the sponsor, clears within 24-48 hours once submitted correctly, and automatically grants the holder a 30-day grace period to leave, transfer sponsorship, or apply for a new status. Confirm salary and any end-of-service dues are settled before submitting — an open labour complaint will hold the cancellation.',
    source: { title: 'Residence Cancellation Procedure', ref: 'Circular 03/2026', updated: '2026-01-08' },
  },
  {
    id: 'medical-fitness',
    category: 'Residence renewal',
    title: 'Medical fitness test requirement',
    keywords: ['medical test', 'medical fitness', 'health screening', 'blood test visa', 'x-ray visa'],
    answer:
      'A medical fitness test is required for every new residence visa and every renewal, valid for 60 days from the test date. Children under 18 and GCC nationals are exempt. A failed communicable-disease result blocks issuance and triggers a mandatory case referral, which cannot be appealed at counter level.',
    source: { title: 'Medical Fitness Testing Requirements', ref: 'Circular 16/2025', updated: '2025-08-30' },
  },
]

// Very small keyword-overlap scorer — enough to route a free-text question
// to the right entry without needing an embeddings model client-side. A
// real backend would replace this with proper semantic retrieval.
export function matchKnowledge(query) {
  const q = query.toLowerCase()

  let best = null
  let bestScore = 0

  for (const entry of knowledgeBase) {
    let score = 0
    for (const kw of entry.keywords) {
      if (q.includes(kw)) score += kw.split(' ').length // reward longer/more specific phrase matches
    }
    // The entry's own title is always a valid way to ask for it — this is
    // what guarantees a quick-topic chip (which sends its own title as the
    // question) reliably routes back to itself, even if the hand-picked
    // keyword list above doesn't happen to cover every wording.
    if (q.includes(entry.title.toLowerCase())) score += 10

    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  return bestScore > 0 ? best : null
}

export function relatedTopics(excludeId, count = 3) {
  return knowledgeBase.filter((e) => e.id !== excludeId).slice(0, count)
}
