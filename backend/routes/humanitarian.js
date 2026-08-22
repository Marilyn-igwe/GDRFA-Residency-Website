import { Router } from 'express'
import { humanitarianCategories, getCategory } from '../humanitarian/categories.js'
import { assessReadiness } from '../humanitarian/readiness.js'
import { createCase, getCase, listCases, updateCase, generateCaseReference } from '../humanitarian/store.js'
import { generateCaseSummary } from '../humanitarian/summary.js'
import { assessStatementWithAI, generateAiBrief } from '../humanitarian/aiAssist.js'
import { verifyDocuments } from '../services/documentAi.js'
import { requireStaffAuth } from '../middleware/staffAuth.js'

const router = Router()

// POST /api/humanitarian/verify-documents
// body: { categoryId, files: [{ name, mimeType, dataBase64 }] }
// Same AI document-matching engine as the general booking flow
// (services/documentAi.js), pointed at a humanitarian category's required
// document list instead of a service's. Live check before submission —
// nothing is stored here.
router.post('/humanitarian/verify-documents', async (req, res) => {
  const { categoryId, files } = req.body || {}

  if (!categoryId || !Array.isArray(files)) {
    return res.status(400).json({ error: 'categoryId and files[] are required' })
  }
  const category = getCategory(categoryId)
  if (!category) {
    return res.status(404).json({ error: 'Unknown categoryId' })
  }

  if (files.length === 0) {
    return res.json({
      categoryId,
      requirements: category.requiredDocuments.map((label) => ({
        label,
        status: 'missing',
        reason: 'No file uploaded for this requirement yet.',
      })),
      allSatisfied: false,
      aiEnabled: false,
    })
  }

  try {
    const result = await verifyDocuments(category.requiredDocuments, files)
    res.json({ categoryId, ...result })
  } catch (err) {
    console.error('Humanitarian document verification failed:', err)
    res.status(502).json({
      error: 'Document check is temporarily unavailable. You can still mark documents manually and submit — staff will verify at review.',
    })
  }
})

// POST /api/humanitarian/ai-statement-check
// body: { categoryId, statement }
// Plain-language writing/completeness feedback for the applicant. Never
// evaluates the merits of the case — see aiAssist.js.
router.post('/humanitarian/ai-statement-check', async (req, res) => {
  const { categoryId, statement } = req.body || {}
  if (!categoryId) {
    return res.status(400).json({ error: 'categoryId is required' })
  }
  const category = getCategory(categoryId)
  if (!category) {
    return res.status(404).json({ error: 'Unknown categoryId' })
  }

  try {
    const feedback = await assessStatementWithAI({ category, statement: statement || '' })
    res.json(feedback)
  } catch (err) {
    console.error('AI statement check failed:', err)
    res.status(502).json({ error: 'AI writing feedback is temporarily unavailable. You can still submit your case as-is.' })
  }
})

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
router.post('/humanitarian/cases', async (req, res) => {
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

  // Best-effort — a failed/slow AI call never blocks a case from being
  // submitted. The committee dashboard falls back to the template summary
  // above (always available) if this comes back null.
  let aiBrief = null
  try {
    aiBrief = await generateAiBrief({
      categoryName: category.name,
      categoryDescription: category.description,
      documentsProvided: documentsProvided || [],
      missingDocuments: readiness.missingDocuments,
      statement,
    })
  } catch (err) {
    console.error('AI brief generation failed at submission, continuing without it:', err)
  }

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
    aiBrief,
    status: 'submitted',
    committeeNotes: '',
    createdAt: new Date().toISOString(),
  }

  createCase(caseRecord)

  res.status(201).json({ reference, readiness })
})

// GET /api/humanitarian/cases — full list for the committee dashboard.
router.get('/humanitarian/cases', requireStaffAuth, (req, res) => {
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
router.patch('/humanitarian/cases/:reference', requireStaffAuth, (req, res) => {
  const { status, committeeNotes } = req.body || {}
  const updated = updateCase(req.params.reference, { status, committeeNotes })
  if (!updated) return res.status(404).json({ error: 'Case not found' })
  res.json(updated)
})

// POST /api/humanitarian/cases/:reference/ai-brief
// Committee-triggered (re)generation — used when a case predates this
// feature, or the automatic generation at submission time failed/was
// skipped (no AI key configured yet, transient error).
router.post('/humanitarian/cases/:reference/ai-brief', requireStaffAuth, async (req, res) => {
  const record = getCase(req.params.reference)
  if (!record) return res.status(404).json({ error: 'Case not found' })

  try {
    const aiBrief = await generateAiBrief({
      categoryName: record.categoryName,
      categoryDescription: getCategory(record.categoryId)?.description || '',
      documentsProvided: record.documentsProvided,
      missingDocuments: record.readiness.missingDocuments,
      statement: record.statement,
    })
    const updated = updateCase(req.params.reference, { aiBrief })
    res.json(updated)
  } catch (err) {
    console.error('AI brief regeneration failed:', err)
    res.status(502).json({ error: 'AI brief is temporarily unavailable. The standard case summary above is still accurate.' })
  }
})

export default router
