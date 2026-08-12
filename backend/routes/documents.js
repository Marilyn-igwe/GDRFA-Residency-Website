import { Router } from 'express'
import { services } from '../data/seedData.js'
import { verifyDocuments } from '../services/documentAi.js'

const router = Router()

// POST /api/documents/verify
// body: { serviceId, files: [{ name, mimeType, dataBase64 }] }
//
// Runs each uploaded file past an AI check against the service's required
// document list and returns, per requirement, whether something was
// uploaded for it and whether it looks like the right kind of document.
// This lets the booking UI stop the user *before* they arrive at a center
// with the wrong paperwork, instead of just printing a sentence and hoping
// they read it.
router.post('/documents/verify', async (req, res) => {
  const { serviceId, files } = req.body || {}

  if (!serviceId || !Array.isArray(files)) {
    return res.status(400).json({ error: 'serviceId and files[] are required' })
  }

  const service = services.find((s) => s.id === serviceId)
  if (!service) {
    return res.status(404).json({ error: 'Unknown serviceId' })
  }

  if (files.length === 0) {
    return res.json({
      serviceId,
      requirements: service.documents.map((label) => ({
        label,
        status: 'missing',
        reason: 'No file uploaded for this requirement yet.'
      })),
      allSatisfied: false
    })
  }

  try {
    const result = await verifyDocuments(service.documents, files)
    res.json({ serviceId, ...result })
  } catch (err) {
    console.error('Document verification failed:', err)
    res.status(502).json({ error: 'Document check is temporarily unavailable. You can still proceed and staff will verify documents at the counter.' })
  }
})

export default router
