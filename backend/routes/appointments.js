import { Router } from 'express'
import { services, centers, resolveTierPricing } from '../data/seedData.js'
import { findSlot, generateReference, getAvailability } from '../services/scheduler.js'
import {
  incrementBookedCount,
  createAppointment,
  getAppointment,
  cancelAppointment
} from '../db.js'

const router = Router()

// POST /api/appointments
// body: { serviceId, centerId, date, time, customerName, customerEmail, customerPhone, tierId }
router.post('/appointments', (req, res) => {
  const { serviceId, centerId, date, time, customerName, customerEmail, customerPhone, tierId } = req.body || {}

  if (!serviceId || !centerId || !date || !time || !customerName || !customerEmail) {
    return res.status(400).json({
      error: 'serviceId, centerId, date, time, customerName and customerEmail are required'
    })
  }

  const service = services.find((s) => s.id === serviceId)
  const center = centers.find((c) => c.id === centerId)
  if (!service) return res.status(404).json({ error: 'Unknown serviceId' })
  if (!center) return res.status(404).json({ error: 'Unknown centerId' })

  // VIP is a real, dedicated-lounge experience — only bookable at centers
  // that actually have one. Anything else (standard/express) is available
  // everywhere, so this check only ever blocks VIP at the wrong center.
  if (tierId === 'vip' && !center.hasVipLounge) {
    return res.status(400).json({
      error: `${center.name} doesn't have a VIP lounge. Choose a VIP-enabled center or a different tier.`
    })
  }

  const slot = findSlot(serviceId, date, centerId, time)

  if (slot.remaining <= 0) {
    // Slot filled between the user viewing availability and submitting —
    // return fresh alternatives instead of a bare error.
    const alternatives = getAvailability(serviceId, date).slice(0, 5)
    return res.status(409).json({
      error: 'This slot was just filled by another booking.',
      alternatives
    })
  }

  const pricing = resolveTierPricing(service, tierId || 'standard')
  const reference = generateReference()

  const appointment = {
    reference,
    serviceId,
    serviceName: service.name,
    tierId: pricing.tierId,
    tierName: pricing.tierName,
    feeAed: pricing.feeAed,
    estimatedDurationMinutes: pricing.durationMinutes,
    centerId,
    centerName: center.name,
    date,
    time,
    customerName,
    customerEmail,
    customerPhone: customerPhone || null,
    status: 'confirmed',
    createdAt: new Date().toISOString()
  }

  incrementBookedCount(centerId, serviceId, date, time)
  createAppointment(appointment)

  res.status(201).json(appointment)
})

// GET /api/appointments/:reference
router.get('/appointments/:reference', (req, res) => {
  const appointment = getAppointment(req.params.reference)
  if (!appointment) return res.status(404).json({ error: 'Appointment not found' })
  res.json(appointment)
})

// DELETE /api/appointments/:reference
router.delete('/appointments/:reference', (req, res) => {
  const appointment = cancelAppointment(req.params.reference)
  if (!appointment) {
    return res.status(404).json({ error: 'Appointment not found or already cancelled' })
  }
  res.json(appointment)
})

export default router
