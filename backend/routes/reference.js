import { Router } from 'express'
import { centers, services, serviceTiers, resolveTierPricing } from '../data/seedData.js'

const router = Router()

// Attaches a `tiers` array to a service — the fee/duration for Standard,
// Express and VIP, computed once here so the frontend never has to
// duplicate the pricing math. This is what makes tiers visible to users
// instead of just sitting in seedData.js unused.
function withTiers(service) {
  return {
    ...service,
    tiers: serviceTiers.map((tier) => ({
      ...resolveTierPricing(service, tier.id),
      description: tier.description
    }))
  }
}

router.get('/centers', (req, res) => {
  res.json(centers)
})

router.get('/services', (req, res) => {
  res.json(services.map(withTiers))
})

router.get('/services/:id', (req, res) => {
  const service = services.find((s) => s.id === req.params.id)
  if (!service) return res.status(404).json({ error: 'Service not found' })
  res.json(withTiers(service))
})

export default router
