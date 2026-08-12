// Humanitarian case categories. Each defines what "complete" means for
// that category — this is the entire basis for the readiness score.
// Deliberately NOT scored on merit/eligibility — only on whether the
// paperwork a committee would need to review the case is present.

export const humanitarianCategories = [
  {
    id: 'medical-hardship',
    name: 'Medical Hardship',
    description: 'For applicants facing a serious medical condition requiring ongoing treatment in the UAE.',
    requiredDocuments: [
      'Medical report from a licensed physician',
      'Proof of ongoing/planned treatment',
      'Passport or Emirates ID copy',
      'Proof of current address',
    ],
    minStatementWords: 50,
  },
  {
    id: 'family-reunification',
    name: 'Family Reunification (Exceptional Circumstances)',
    description: 'For cases outside standard sponsorship rules — e.g. sole caregiver situations, orphaned minors, or similar.',
    requiredDocuments: [
      'Proof of family relationship (birth/marriage certificate, attested)',
      'Passport copies of all parties',
      'Proof of current living arrangement',
      'Sponsor Emirates ID and passport copy',
    ],
    minStatementWords: 50,
  },
  {
    id: 'protection-concern',
    name: 'Protection / Safety Concern',
    description: 'For applicants raising a safety or protection concern relevant to their residency status.',
    requiredDocuments: [
      'Passport or identification copy',
      'Any supporting documentation of the concern (police report, correspondence, etc.)',
    ],
    minStatementWords: 75,
  },
  {
    id: 'compassionate-other',
    name: 'Other Compassionate Grounds',
    description: "For cases that don't fit the other categories but involve genuine hardship the committee should review.",
    requiredDocuments: [
      'Passport or Emirates ID copy',
      'Any supporting documentation relevant to the circumstances',
    ],
    minStatementWords: 50,
  },
]

export function getCategory(id) {
  return humanitarianCategories.find((c) => c.id === id) || null
}
