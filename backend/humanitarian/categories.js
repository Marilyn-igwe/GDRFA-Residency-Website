// Humanitarian case categories. Each defines what "complete" means for
// that category — this is the entire basis for the readiness score.
// Deliberately NOT scored on merit/eligibility — only on whether the
// paperwork a committee would need to review the case is present.

// `eligibility` is plain-language explainer content for the ⓘ tooltip next
// to each category in the UI — not used in scoring. Written for someone
// who has never seen an immigration form before (IRCC/USCIS-style "what
// does this mean, am I eligible" popovers).
export const humanitarianCategories = [
  {
    id: 'medical-hardship',
    name: 'Medical Hardship',
    description: 'For applicants facing a serious medical condition requiring ongoing treatment in the UAE.',
    eligibility: {
      whatItMeans:
        "This category is for people who need to stay in the UAE because they, or someone they're responsible for, are undergoing serious medical treatment that can't be safely stopped or moved elsewhere.",
      whoItsFor: [
        'You or a dependent has a serious medical condition being treated in the UAE',
        'A licensed doctor confirms treatment is ongoing or planned',
        'Interrupting treatment or relocating would put health at serious risk',
      ],
      notFor: 'Routine or elective medical care on its own usually does not qualify.',
    },
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
    eligibility: {
      whatItMeans:
        'For family situations that fall outside the normal sponsorship rules — for example, a child with no other parent or guardian present, or someone who is the sole caregiver for a family member.',
      whoItsFor: [
        "You're the only parent or guardian available for a minor child",
        "You're the sole caregiver for a family member who depends on you",
        "Your situation doesn't fit standard sponsorship rules but keeping the family together matters",
      ],
      notFor: 'Standard spouse/child sponsorship under normal visa rules should use the regular sponsorship service, not this form.',
    },
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
    eligibility: {
      whatItMeans:
        'For applicants with a genuine, specific safety or protection concern connected to their residency status — for example, a documented threat or risk of harm.',
      whoItsFor: [
        'You have a specific, documented safety concern',
        'You can provide evidence where possible (police report, official correspondence, etc.)',
        'The concern directly affects your ability to stay in or return to the UAE',
      ],
      notFor: "General worry about relocating, without a specific documented concern, usually isn't enough on its own — ask the AI Assistant if you're unsure this fits.",
    },
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
    eligibility: {
      whatItMeans:
        "A catch-all for genuine hardship situations that don't fit the other three categories, but that the committee should still be able to review.",
      whoItsFor: [
        "Your situation involves real hardship not covered by the other categories",
        'You can explain clearly, with evidence where possible, why it deserves special consideration',
      ],
      notFor: '',
    },
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
