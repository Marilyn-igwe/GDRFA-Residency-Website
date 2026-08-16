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
    closeHour: 16
  },
  {
    id: 'amer-albarsha',
    name: 'Amer Center - Al Barsha',
    type: 'Amer',
    location: 'Al Barsha 1, Dubai',
    slotCapacity: 3,
    openHour: 8,
    closeHour: 20
  },
  {
    id: 'amer-deira',
    name: 'Amer Center - Deira',
    type: 'Amer',
    location: 'Deira, Dubai',
    slotCapacity: 3,
    openHour: 8,
    closeHour: 20
  },
  {
    id: 'amer-karama',
    name: 'Amer Center - Al Karama',
    type: 'Amer',
    location: 'Al Karama, Dubai',
    slotCapacity: 2,
    openHour: 9,
    closeHour: 18
  }
]

export const services = [
  {
    id: 'residence-renewal',
    name: 'Residence Visa Renewal',
    feeAed: 500,
    avgDurationMinutes: 20,
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
    documents: [
      'Passport copy',
      'Proof of eligibility (property, investment, or talent criteria)',
      'Passport-size photo (white background)',
      'Emirates ID (if resident)'
    ]
  }
]

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

