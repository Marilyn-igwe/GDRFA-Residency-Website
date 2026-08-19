import { services, centers, centerServiceMap } from '../data/seedData.js'

// Small synonym map so "how much does it cost" matches "fee" intents, etc.
// This is the main lever for making the no-API-key bot feel smarter —
// add more synonyms here any time you notice a real question it misses.
const SYNONYMS = {
  cost: 'fee',
  price: 'fee',
  charge: 'fee',
  aed: 'fee',
  papers: 'documents',
  document: 'documents',
  paperwork: 'documents',
  required: 'documents',
  need: 'documents',
  renew: 'renewal',
  renewing: 'renewal',
  visa: 'permit',
  status: 'application',
  track: 'application',
  address: 'location',
  branch: 'center',
  centre: 'center',
  hour: 'hours',
  open: 'hours',
  timing: 'hours',
  timings: 'hours',
}

function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => SYNONYMS[word] || word)
}

function serviceKeywords(service) {
  // e.g. "Residence Visa Renewal" -> residence, visa->permit, renewal
  return normalize(service.name).concat(service.id.split('-'))
}

// Static, general knowledge — anything not tied to a specific service.
const staticEntries = [
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'salam', 'marhaba', 'assalam'],
    answer:
      "Hello! I can help with residency and entry permit services — document requirements, fees, application status, and general questions. What do you need help with?",
    followups: ['What documents do I need for residence renewal?', 'What are your center hours?', 'Check my application status'],
  },
  {
    id: 'hours',
    keywords: ['hours', 'timing', 'time', 'when', 'center', 'open', 'close'],
    answer: () => {
      const lines = centers
        .map((c) => `• ${c.name}: ${c.openHour}:00–${c.closeHour}:00`)
        .join('\n')
      return `Here are the operating hours by center:\n${lines}`
    },
    followups: ['Which centers process Golden Visa applications?', 'How do I book an appointment?'],
  },
  {
    id: 'centers-list',
    keywords: ['location', 'centers', 'address', 'amer', 'office'],
    answer: () => {
      const lines = centers.map((c) => `• ${c.name} — ${c.location}`).join('\n')
      return `Here are all service centers:\n${lines}`
    },
    followups: ['What services does each center offer?'],
  },
  {
    id: 'services-overview',
    keywords: ['services', 'offer', 'what can', 'help with', 'list'],
    answer: () => {
      const lines = services.map((s) => `• ${s.name} (${s.feeAed} AED)`).join('\n')
      return `I can help with the following services:\n${lines}\n\nAsk me about documents, fees, or availability for any of these.`
    },
    followups: services.slice(0, 3).map((s) => `What documents do I need for ${s.name}?`),
  },
  {
    id: 'booking-howto',
    keywords: ['book', 'booking', 'appointment', 'schedule', 'apply', 'start', 'begin', 'reserve'],
    answer:
      "You can book an appointment through the 'Start a Service' button on the homepage. Pick your service, choose a date, and I'll show you the least busy center and time so you spend less time waiting.",
    followups: ['What documents will I need to bring?'],
  },
  {
    id: 'application-status-help',
    keywords: ['application', 'reference', 'tracking', 'progress'],
    answer:
      'To check an application or appointment, enter its reference number. Appointment references begin with GDRFA, and humanitarian case references begin with HCASE.',
    followups: ['How do I book an appointment?'],
  },
  {
    id: 'humanitarian-medical',
    keywords: ['sick', 'ill', 'illness', 'dying', 'critical', 'medical', 'condition', 'treatment', 'hospital'],
    answer:
      "If you or a family member has a serious medical situation, there's a Humanitarian Case option (Medical Hardship category) for that — it's different from a regular application, since a review committee looks at it directly. You can find it under 'Humanitarian Case' on the homepage. I can check your paperwork is complete before you submit, but the committee makes the actual decision on your case.",
    followups: ['What documents does a humanitarian case need?', 'How long does committee review take?'],
  },
  {
    id: 'humanitarian-safety',
    keywords: ['safety', 'danger', 'unsafe', 'threat', 'protection', 'refuge', 'harm', 'concern'],
    answer:
      "If you have a safety or protection concern, there's a Humanitarian Case option (Protection/Safety Concern category) for that — a review committee looks at it directly rather than automatic processing. You can find it under 'Humanitarian Case' on the homepage.",
    followups: ['What documents does a humanitarian case need?'],
  },
  {
    id: 'humanitarian-overview',
    keywords: ['humanitarian', 'compassionate', 'hardship', 'exceptional', 'emergency', 'circumstances'],
    answer:
      "If your situation doesn't fit standard services — for example, a medical emergency, an urgent family circumstance, or a safety concern — there's a Humanitarian Case option for that. You describe your situation, and a review committee looks at it directly rather than it going through automatic processing. You can find it under 'Humanitarian Case' on the homepage. I can check your paperwork is complete before you submit, but the committee makes the actual decision.",
    followups: ['What documents does a humanitarian case need?', 'How long does committee review take?'],
  },
  {
    id: 'humanitarian-documents',
    keywords: ['humanitarian', 'compassionate', 'hardship', 'documents', 'need', 'require', 'medical', 'report'],
    answer:
      "Humanitarian case documents depend on the category:\n• Medical Hardship: medical report, proof of treatment, ID, proof of address\n• Family Reunification: proof of relationship, ID copies, proof of living arrangement\n• Protection/Safety Concern: ID, any supporting documentation of the concern\n• Other Compassionate Grounds: ID, any relevant supporting documents\n\nAll categories also need a written statement describing your situation. The form will check your paperwork for you before you submit.",
    followups: ['How do I start a humanitarian case?'],
  },
  {
    id: 'humanitarian-timeline',
    keywords: ['humanitarian', 'committee', 'timeline', 'when', 'review', 'decision'],
    answer:
      "There isn't a fixed timeline for committee review since each case is looked at individually — that's different from standard services, which usually have a set processing time. The committee may also follow up if anything is missing from your submission. You can check your case status anytime with your reference number.",
    followups: ['What documents does a humanitarian case need?'],
  },
  {
    id: 'not-sure-what-to-do',
    keywords: ['confused', 'lost', 'unsure', 'guidance', 'direction', 'overwhelmed'],
    answer:
      "No problem — here's a quick guide:\n• Renewing a visa or applying for a standard permit → use 'Start a Service' to book an appointment\n• A medical emergency, safety concern, or situation that doesn't fit normal categories → use 'Humanitarian Case' for committee review\n• Checking on something you already submitted → give me your reference number and I'll look it up\n\nWhat's your situation? I can point you in the right direction.",
    followups: ['I have a medical emergency', 'I need to renew my residency', 'Check my application status'],
  },
  {
    id: 'golden-visa-eligibility',
    keywords: ['golden', 'eligibility', 'qualify', 'investor', 'talent'],
    answer:
      "Golden Visa eligibility is generally based on property investment, business investment, or specialized talent/skill criteria. Only GDRFA Head Office processes Golden Visa applications — Amer centers don't handle this service.",
    followups: ['What documents do I need for Golden Visa?', 'What is the Golden Visa fee?'],
  },
]

// Auto-generate document/fee entries for every service so this stays in
// sync automatically if you add/edit services in seedData.js — no need to
// hand-write an entry every time.
function generateServiceEntries() {
  const entries = []

  for (const service of services) {
    const kw = serviceKeywords(service)

    entries.push({
      id: `${service.id}-documents`,
      keywords: [...kw, 'documents', 'need', 'bring', 'require'],
      answer: `For ${service.name}, bring:\n${service.documents.map((d) => `• ${d}`).join('\n')}`,
      followups: [`What is the fee for ${service.name}?`, 'How do I book this?'],
    })

    entries.push({
      id: `${service.id}-fee`,
      keywords: [...kw, 'fee', 'cost'],
      answer: `The fee for ${service.name} is ${service.feeAed} AED. Processing typically takes about ${service.avgDurationMinutes} minutes at the center.`,
      followups: [`What documents do I need for ${service.name}?`],
    })

    const eligibleCenters = centers.filter((c) => centerServiceMap[c.type]?.includes(service.id))
    entries.push({
      id: `${service.id}-where`,
      keywords: [...kw, 'where', 'center', 'location', 'available'],
      answer: `${service.name} is available at: ${eligibleCenters.map((c) => c.name).join(', ')}.`,
      followups: [`What documents do I need for ${service.name}?`],
    })
  }

  return entries
}

export function buildKnowledgeBase() {
  return [...staticEntries, ...generateServiceEntries()]
}

export { normalize }
