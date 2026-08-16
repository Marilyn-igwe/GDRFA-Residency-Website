import { Router } from 'express'
import {
  familySponsorDocuments,
  familyMemberDocuments,
  familyFeePerDependentAed,
  centers
} from '../data/seedData.js'
import { getAvailability, findSlot, generateReference } from '../services/scheduler.js'
import {
  incrementBookedCount,
  createFamilyApplication,
  getFamilyApplication,
  listFamilyApplications,
  updateFamilyApplication
} from '../db.js'

const FAMILY_SERVICE_ID = 'family-residence'

const router = Router()

// GET /api/family/requirements
// The document lists that build the tree's per-node checklists — sponsor
// documents are given ONCE for the household, each dependent only needs
// what's actually about them.
router.get('/family/requirements', (req, res) => {
  res.json({
    sponsor: familySponsorDocuments,
    spouse: familyMemberDocuments.spouse,
    child: familyMemberDocuments.child,
    feePerDependentAed: familyFeePerDependentAed
  })
})

// GET /api/family/availability?date=YYYY-MM-DD&partySize=3
// Same slot data as the general booking flow, but filtered to slots that
// can actually fit the whole household in one visit — this is what makes
// "one integrated process" a real constraint, not just a label.
router.get('/family/availability', (req, res) => {
  const { date, partySize } = req.query
  const size = Math.max(1, parseInt(partySize, 10) || 1)

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date is required in YYYY-MM-DD format' })
  }

  const slots = getAvailability(FAMILY_SERVICE_ID, date, size)
  res.json({ date, partySize: size, recommended: slots[0] || null, slots })
})

// POST /api/family/applications
// body: {
//   sponsorName, sponsorEmail, sponsorPhone,
//   sponsorDocumentsProvided: string[],
//   members: [{ id, relationship: 'spouse'|'child', fullName, dateOfBirth, documentsProvided: string[] }],
//   centerId, date, time
// }
router.post('/family/applications', (req, res) => {
  const {
    sponsorName,
    sponsorEmail,
    sponsorPhone,
    sponsorDocumentsProvided,
    members,
    centerId,
    date,
    time
  } = req.body || {}

  if (!sponsorName || !sponsorEmail) {
    return res.status(400).json({ error: 'sponsorName and sponsorEmail are required' })
  }
  if (!Array.isArray(members) || members.length === 0) {
    return res.status(400).json({ error: 'At least one family member (spouse or child) is required' })
  }
  if (!centerId || !date || !time) {
    return res.status(400).json({ error: 'centerId, date and time are required' })
  }
  for (const m of members) {
    if (!m.fullName || !['spouse', 'child'].includes(m.relationship)) {
      return res.status(400).json({ error: 'Each member needs a fullName and relationship of spouse or child' })
    }
  }

  const center = centers.find((c) => c.id === centerId)
  if (!center) return res.status(404).json({ error: 'Unknown centerId' })

  const partySize = members.length
  const slot = findSlot(FAMILY_SERVICE_ID, date, centerId, time, partySize)

  if (!slot.fitsParty) {
    const alternatives = getAvailability(FAMILY_SERVICE_ID, date, partySize).slice(0, 5)
    return res.status(409).json({
      error:
        slot.remaining <= 0
          ? 'This slot was just filled by another booking.'
          : `This slot only has room for ${slot.remaining} more — your family of ${partySize} won't all fit. Here are slots that will.`,
      alternatives
    })
  }

  // Readiness — mirrors the humanitarian module's approach: purely
  // mechanical (which required documents are checked off), never a
  // judgment call. Computed per member and rolled up for the household.
  const membersWithReadiness = members.map((m) => {
    const required = familyMemberDocuments[m.relationship]
    const provided = new Set(m.documentsProvided || [])
    const missingDocuments = required.filter((d) => !provided.has(d))
    return {
      id: m.id,
      relationship: m.relationship,
      fullName: m.fullName,
      dateOfBirth: m.dateOfBirth || null,
      documentsProvided: m.documentsProvided || [],
      missingDocuments,
      complete: missingDocuments.length === 0,
      // Each dependent's own case can move independently of the others
      // (and of the household's overall status) once staff start review —
      // one member being approved doesn't mean the whole family is.
      status: 'submitted'
    }
  })

  const sponsorProvided = new Set(sponsorDocumentsProvided || [])
  const sponsorMissing = familySponsorDocuments.filter((d) => !sponsorProvided.has(d))

  const reference = `FAM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`

  const record = {
    reference,
    sponsorName,
    sponsorEmail,
    sponsorPhone: sponsorPhone || null,
    sponsorDocumentsProvided: sponsorDocumentsProvided || [],
    sponsorMissingDocuments: sponsorMissing,
    members: membersWithReadiness,
    centerId,
    centerName: center.name,
    date,
    time,
    partySize,
    feeAed: familyFeePerDependentAed * partySize,
    feePerDependentAed: familyFeePerDependentAed,
    visitsSaved: partySize - 1, // vs. one separate appointment per person
    status: 'submitted',
    staffNotes: '',
    createdAt: new Date().toISOString()
  }

  incrementBookedCount(centerId, FAMILY_SERVICE_ID, date, time, partySize)
  createFamilyApplication(record)

  res.status(201).json(record)
})

// GET /api/family/applications
// Staff-only listing — every submitted household, newest first.
router.get('/family/applications', (req, res) => {
  const all = listFamilyApplications()
  res.json([...all].reverse())
})

// GET /api/family/applications/:reference
router.get('/family/applications/:reference', (req, res) => {
  const record = getFamilyApplication(req.params.reference)
  if (!record) return res.status(404).json({ error: 'Family application not found' })
  res.json(record)
})

// PATCH /api/family/applications/:reference
// Staff-only update. body: { status?, staffNotes?, memberStatuses?: [{id, status}] }
router.patch('/family/applications/:reference', (req, res) => {
  const { status, staffNotes, memberStatuses } = req.body || {}
  const updated = updateFamilyApplication(req.params.reference, { status, staffNotes, memberStatuses })
  if (!updated) return res.status(404).json({ error: 'Family application not found' })
  res.json(updated)
})

export default router
