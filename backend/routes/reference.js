import { Router } from 'express'
import { centers, services } from '../data/seedData.js'

const router = Router()

router.get('/centers', (req, res) => {
  res.json(centers)
})

router.get('/services', (req, res) => {
  res.json(services)
})

router.get('/services/:id', (req, res) => {
  const service = services.find((s) => s.id === req.params.id)
  if (!service) return res.status(404).json({ error: 'Service not found' })
  res.json(service)
})

export default router
