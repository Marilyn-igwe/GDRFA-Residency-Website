// Static reference data. In a real system this would live in a database
// and be managed through an admin panel — kept as plain JS here so the
// whole backend runs with zero external services.

export const centers = [
  {
    id: 'gdrfa-hq',
    name: 'GDRFA Head Office',
    type: 'GDRFA',
    location: 'Al Jafiliya, Dubai',
    // How many customers can be served per 30-minute slot, per service.
    // Larger main office => higher base capacity.
    slotCapacity: 6,
    openHour: 8,
    closeHour: 16,
    hasVipLounge: true
  },
  {
    id: 'amer-albarsha',
    name: 'Amer Center - Al Barsha',
    type: 'Amer',
    location: 'Al Barsha 1, Dubai',
    slotCapacity: 3,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-deira',
    name: 'Amer Center - Deira',
    type: 'Amer',
    location: 'Deira, Dubai',
    slotCapacity: 3,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-deira-247',
    name: 'Amer Center - Deira (24/7)',
    type: 'Amer',
    location: 'Near Abu Baker Al Siddique Metro, Deira, Dubai',
    slotCapacity: 2,
    openHour: 0,
    closeHour: 24,
    hasVipLounge: false
  },
  {
    id: 'amer-karama',
    name: 'Amer Center - Al Karama',
    type: 'Amer',
    location: 'Al Karama, Dubai',
    slotCapacity: 2,
    openHour: 9,
    closeHour: 18,
    hasVipLounge: false
  },
  {
    id: 'amer-mankhool',
    name: 'Amer Center - Mankhool',
    type: 'Amer',
    location: 'Mankhool, Bur Dubai',
    slotCapacity: 2,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-qusais',
    name: 'Amer Center - Al Qusais',
    type: 'Amer',
    location: 'Al Qusais, Dubai',
    slotCapacity: 3,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-silicon-oasis',
    name: 'Amer Center - Dubai Silicon Oasis',
    type: 'Amer',
    location: 'Dubai Silicon Oasis',
    slotCapacity: 2,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-dafza',
    name: 'Amer Center - DAFZA',
    type: 'Amer',
    location: 'Dubai Airport Free Zone',
    slotCapacity: 2,
    openHour: 7,
    closeHour: 19,
    hasVipLounge: false
  },
  {
    id: 'amer-alnahda',
    name: 'Amer Center - Al Nahda',
    type: 'Amer',
    location: 'Al Nahda, Dubai',
    slotCapacity: 2,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-altwar',
    name: 'Amer Center - Al Twar',
    type: 'Amer',
    location: 'Al Twar, Dubai',
    slotCapacity: 2,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-satwa',
    name: 'Amer Center - Al Satwa',
    type: 'Amer',
    location: 'Al Satwa, Dubai',
    slotCapacity: 2,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-garhoud',
    name: 'Amer Center - Garhoud',
    type: 'Amer',
    location: 'Garhoud, Dubai',
    slotCapacity: 2,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-mirdif',
    name: 'Amer Center - Mirdif',
    type: 'Amer',
    location: 'Mirdif, Dubai',
    slotCapacity: 2,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-rashidiya',
    name: 'Amer Center - Al Rashidiya',
    type: 'Amer',
    location: 'Al Rashidiya, Dubai',
    slotCapacity: 2,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-difc',
    name: 'Amer Center - DIFC (Smart Lounge)',
    type: 'Amer',
    location: 'Oasis Towers, DIFC, Dubai',
    slotCapacity: 3,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: true
  },
  {
    id: 'amer-kifaf',
    name: 'Amer Center - Al Kifaf',
    type: 'Amer',
    location: 'Al Kifaf, Dubai',
    slotCapacity: 2,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: false
  },
  {
    id: 'amer-businessbay',
    name: 'Amer Center - Business Bay',
    type: 'Amer',
    location: 'Business Bay, Dubai',
    slotCapacity: 3,
    openHour: 8,
    closeHour: 20,
    hasVipLounge: true
  },
  {
    id: 'gdrfa-airport-t3',
    name: 'GDRFA - Dubai Airport Terminal 3',
    type: 'GDRFA',
    location: 'DXB Terminal 3, Gate 2 Arrivals, Dubai',
    slotCapacity: 2,
    openHour: 0,
    closeHour: 24,
    hasVipLounge: false
  }
]

// --- Service tiers ------------------------------------------------------
//
// Every service can be booked at one of three service levels. The
// top-level `feeAed` / `avgDurationMinutes` on each service below are the
// STANDARD tier figures (kept as-is so existing booking/appointment code
// that reads those fields directly doesn't need to change). `tiers` is
// additive detail for the booking UI and employee interface to offer
// Express / VIP options with their own fee and turnaround.
export const serviceTiers = [
  {
    id: 'standard',
    name: 'Standard',
    feeMultiplier: 1,
    durationMultiplier: 1,
    description: 'Regular queue, standard processing time.'
  },
  {
    id: 'express',
    name: 'Express',
    feeMultiplier: 1.5,
    durationMultiplier: 0.6,
    description: 'Priority queue position, faster counter processing.'
  },
  {
    id: 'vip',
    name: 'VIP',
    feeMultiplier: 2.5,
    durationMultiplier: 0.4,
    description: 'Dedicated VIP lounge, private counter, fastest turnaround. Available only at centers with hasVipLounge: true.'
  }
]

// Importance/category classification used to prioritize cases in the
// employee interface and to flag special cases that need extra review
// (as opposed to routine, high-volume transactions).
// One of: 'routine' | 'family' | 'investment' | 'sensitive'
export const services = [
  {
    id: 'residence-renewal',
    name: 'Residence Visa Renewal',
    feeAed: 500,
    avgDurationMinutes: 20,
    category: 'routine',
    documents: [
      'Valid passport (original + copy)',
      'Emirates ID (original + copy)',
      'Passport-size photo (white background)',
      'Current residence visa page copy'
    ]
  },
  {
    id: 'entry-permit',
    name: 'Entry Permit Issuance',
    feeAed: 700,
    avgDurationMinutes: 25,
    category: 'routine',
    documents: [
      'Sponsor passport copy',
      'Applicant passport copy',
      'Passport-size photo (white background)',
      'Employment contract or relationship proof'
    ]
  },
  {
    id: 'family-residence',
    name: 'Family Residence Permit',
    feeAed: 600,
    avgDurationMinutes: 30,
    category: 'family',
    documents: [
      'Sponsor Emirates ID and passport copy',
      'Family member passport copy',
      'Marriage/birth certificate (attested)',
      'Salary certificate or bank statement'
    ]
  },
  {
    id: 'golden-visa',
    name: 'Golden Visa Application',
    feeAed: 2800,
    avgDurationMinutes: 40,
    category: 'investment',
    documents: [
      'Passport copy',
      'Proof of eligibility (property, investment, or talent criteria)',
      'Passport-size photo (white background)',
      'Emirates ID (if resident)'
    ]
  }
]

// Convenience helper: resolve the fee/duration for a given service at a
// given tier. Falls back to the service's base (standard) figures if the
// tier isn't recognized.
export function resolveTierPricing(service, tierId = 'standard') {
  const tier = serviceTiers.find((t) => t.id === tierId) || serviceTiers[0]
  return {
    tierId: tier.id,
    tierName: tier.name,
    feeAed: Math.round(service.feeAed * tier.feeMultiplier),
    durationMinutes: Math.max(5, Math.round(service.avgDurationMinutes * tier.durationMultiplier))
  }
}

// Which services each center type is able to process.
// Amer centers don't process Golden Visa applications, for example.
export const centerServiceMap = {
  GDRFA: ['residence-renewal', 'entry-permit', 'family-residence', 'golden-visa'],
  Amer: ['residence-renewal', 'entry-permit', 'family-residence']
}

// --- Family Group Application ------------------------------------------
//
// The sponsor's own paperwork (Emirates ID, salary proof) is provided
// ONCE for the whole household — not re-collected per dependent — because
// it proves the sponsor's eligibility to sponsor, not anything about the
// individual dependent. Each dependent then only needs the documents that
// are actually about THEM.
export const familySponsorDocuments = [
  'Sponsor Emirates ID and passport copy',
  'Salary certificate or bank statement'
]

export const familyMemberDocuments = {
  spouse: [
    'Marriage certificate (attested)',
    "Spouse's passport copy",
    "Spouse's passport-size photo (white background)"
  ],
  child: [
    'Birth certificate (attested)',
    "Child's passport copy",
    "Child's passport-size photo (white background)"
  ]
}

// One government fee per dependent added to the sponsorship — this is
// what actually changes as the household grows, unlike the old flat
// per-booking fee. The sponsor themselves isn't charged again; they
// already hold their own residency.
export const familyFeePerDependentAed = 600

