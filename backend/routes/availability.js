import { Router } from 'express'
import { services } from '../data/seedData.js'
import { getAvailability } from '../services/scheduler.js'

const router = Router()

// GET /api/availability?serviceId=residence-renewal&date=2026-08-05
router.get('/availability', (req, res) => {
  const { serviceId, date } = req.query

  if (!serviceId || !date) {
    return res.status(400).json({ error: 'serviceId and date are required' })
  }

  const service = services.find((s) => s.id === serviceId)
  if (!service) {
    return res.status(404).json({ error: 'Unknown serviceId' })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' })
  }

  const slots = getAvailability(serviceId, date)

  res.json({
    serviceId,
    date,
    recommended: slots[0] || null,
    slots
  })
})

export default router
