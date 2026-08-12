import { Router } from 'express'
import { humanitarianCategories, getCategory } from '../humanitarian/categories.js'
import { assessReadiness } from '../humanitarian/readiness.js'
import { createCase, getCase, listCases, updateCase, generateCaseReference } from '../humanitarian/store.js'
import { generateCaseSummary } from '../humanitarian/summary.js'

const router = Router()

// GET /api/humanitarian/categories
router.get('/humanitarian/categories', (req, res) => {
  res.json(humanitarianCategories)
})

// POST /api/humanitarian/check-readiness
// body: { categoryId, documentsProvided: [...], statement }
// Live check before submission — no case is created here.
router.post('/humanitarian/check-readiness', (req, res) => {
  const { categoryId, documentsProvided, statement } = req.body || {}

  if (!categoryId) {
    return res.status(400).json({ error: 'categoryId is required' })
  }
  if (!getCategory(categoryId)) {
    return res.status(404).json({ error: 'Unknown categoryId' })
  }

  try {
    const readiness = assessReadiness({ categoryId, documentsProvided: documentsProvided || [], statement })
    res.json(readiness)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// POST /api/humanitarian/cases
// body: { categoryId, documentsProvided, statement, applicantName, applicantEmail }
router.post('/humanitarian/cases', (req, res) => {
  const { categoryId, documentsProvided, statement, applicantName, applicantEmail } = req.body || {}

  if (!categoryId || !applicantName || !applicantEmail) {
    return res.status(400).json({ error: 'categoryId, applicantName and applicantEmail are required' })
  }

  const category = getCategory(categoryId)
  if (!category) {
    return res.status(404).json({ error: 'Unknown categoryId' })
  }

  let readiness
  try {
    readiness = assessReadiness({ categoryId, documentsProvided: documentsProvided || [], statement })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  const reference = generateCaseReference()
  const summary = generateCaseSummary({
    categoryName: category.name,
    applicantName,
    documentsProvided: documentsProvided || [],
    readiness,
    statement,
  })

  const caseRecord = {
    reference,
    categoryId,
    categoryName: category.name,
    applicantName,
    applicantEmail,
    documentsProvided: documentsProvided || [],
    statement: statement || '',
    readiness,
    summary,
    status: 'submitted',
    committeeNotes: '',
    createdAt: new Date().toISOString(),
  }

  createCase(caseRecord)

  res.status(201).json({ reference, readiness })
})

// GET /api/humanitarian/cases — full list for the committee dashboard.
// NOTE: no auth on this route yet. Add real staff authentication before
// any real deployment — see README.
router.get('/humanitarian/cases', (req, res) => {
  res.json(listCases())
})

// GET /api/humanitarian/cases/:reference
router.get('/humanitarian/cases/:reference', (req, res) => {
  const record = getCase(req.params.reference)
  if (!record) return res.status(404).json({ error: 'Case not found' })
  res.json(record)
})

// PATCH /api/humanitarian/cases/:reference
// body: { status?, committeeNotes? } — committee-driven updates only.
router.patch('/humanitarian/cases/:reference', (req, res) => {
  const { status, committeeNotes } = req.body || {}
  const updated = updateCase(req.params.reference, { status, committeeNotes })
  if (!updated) return res.status(404).json({ error: 'Case not found' })
  res.json(updated)
})

export default router
