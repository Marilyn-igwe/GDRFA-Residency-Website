import { Router } from 'express'
import { centers } from '../data/seedData.js'
import { listAppointments, listHumanitarianCases, listFamilyApplications } from '../db.js'
import { issueToken, checkPasscode, revokeToken, requireStaffAuth } from '../middleware/staffAuth.js'

const router = Router()

const PENDING_STATUSES = ['submitted', 'under_review', 'additional_info_requested']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// POST /api/staff/login
// body: { passcode }
router.post('/staff/login', (req, res) => {
  const { passcode } = req.body || {}
  if (!checkPasscode(passcode)) {
    return res.status(401).json({ error: 'Incorrect passcode' })
  }
  res.json({ token: issueToken() })
})

// POST /api/staff/logout
router.post('/staff/logout', (req, res) => {
  const token = req.get('x-staff-token')
  if (token) revokeToken(token)
  res.json({ ok: true })
})

// GET /api/staff/overview — the numbers behind the employee dashboard's
// landing tab. Computed fresh on every request from the same store the
// three staff panels (appointments/humanitarian/family) already read,
// so there's nothing here that can drift out of sync with them.
router.get('/staff/overview', requireStaffAuth, (req, res) => {
  const appointments = listAppointments()
  const today = todayStr()

  const appointmentsToday = appointments.filter((a) => a.date === today)
  const byCenterToday = {}
  appointmentsToday.forEach((a) => {
    if (a.status === 'cancelled') return
    byCenterToday[a.centerId] = (byCenterToday[a.centerId] || 0) + 1
  })

  const revenueAed = appointments
    .filter((a) => a.status === 'confirmed' || a.status === 'completed')
    .reduce((sum, a) => sum + (a.feeAed || 0), 0)

  const humanitarianCases = listHumanitarianCases()
  const familyApplications = listFamilyApplications()

  res.json({
    appointments: {
      total: appointments.length,
      today: appointmentsToday.filter((a) => a.status !== 'cancelled').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled').length,
      noShow: appointments.filter((a) => a.status === 'no_show').length,
      revenueAed
    },
    humanitarianCases: {
      total: humanitarianCases.length,
      pending: humanitarianCases.filter((c) => PENDING_STATUSES.includes(c.status)).length
    },
    familyApplications: {
      total: familyApplications.length,
      pending: familyApplications.filter((f) => PENDING_STATUSES.includes(f.status)).length
    },
    centers: centers.map((c) => ({
      id: c.id,
      name: c.name,
      appointmentsToday: byCenterToday[c.id] || 0
    }))
  })
})

export default router
