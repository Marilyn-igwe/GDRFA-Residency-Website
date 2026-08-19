import { centers, centerServiceMap } from '../data/seedData.js'
import { getBookedCount } from '../db.js'

const SLOT_MINUTES = 30

function generateTimesForCenter(center) {
  const times = []
  for (let hour = center.openHour; hour < center.closeHour; hour++) {
    for (let minute = 0; minute < 60; minute += SLOT_MINUTES) {
      // Skip a lunch break window 13:00-13:30 across all centers.
      if (hour === 13 && minute === 0) continue
      const hh = String(hour).padStart(2, '0')
      const mm = String(minute).padStart(2, '0')
      times.push(`${hh}:${mm}`)
    }
  }
  return times
}

function centersForService(serviceId) {
  return centers.filter((c) => centerServiceMap[c.type]?.includes(serviceId))
}

/**
 * Returns every slot across every eligible center for a given service+date,
 * annotated with current load, ranked so the "best" option (most
 * availability, soonest time) comes first. This ranking is the load-
 * balancing piece: it actively steers demand away from centers that are
 * already busy, which is the core of "optimizing visitor flow".
 *
 * `partySize` filters out slots that can't fit the whole group in one
 * go — used by the family application flow to book one shared slot for
 * the sponsor + every dependent, instead of one slot per person.
 */
export function getAvailability(serviceId, date, partySize = 1) {
  const eligibleCenters = centersForService(serviceId)

  const allSlots = []
  for (const center of eligibleCenters) {
    const times = generateTimesForCenter(center)
    for (const time of times) {
      const booked = getBookedCount(center.id, serviceId, date, time)
      const remaining = center.slotCapacity - booked
      if (remaining < partySize) continue // wouldn't fit the whole party

      allSlots.push({
        centerId: center.id,
        centerName: center.name,
        centerType: center.type,
        location: center.location,
        hasVipLounge: Boolean(center.hasVipLounge),
        date,
        time,
        capacity: center.slotCapacity,
        booked,
        remaining,
        loadPercent: Math.round((booked / center.slotCapacity) * 100)
      })
    }
  }

  // Ranking: prioritize low load (spreads visitors across centers/times),
  // then earlier time of day, then centers with more total remaining
  // capacity so a "recommended" choice tends to have breathing room.
  allSlots.sort((a, b) => {
    if (a.loadPercent !== b.loadPercent) return a.loadPercent - b.loadPercent
    if (a.time !== b.time) return a.time.localeCompare(b.time)
    return b.remaining - a.remaining
  })

  return allSlots
}

export function findSlot(serviceId, date, centerId, time, partySize = 1) {
  const center = centers.find((c) => c.id === centerId)
  if (!center) return null
  const booked = getBookedCount(centerId, serviceId, date, time)
  const remaining = center.slotCapacity - booked
  return {
    center,
    booked,
    remaining,
    fitsParty: remaining >= partySize
  }
}

export function generateReference() {
  const rand = Math.floor(1000 + Math.random() * 9000)
  const year = new Date().getFullYear()
  return `GDRFA-${year}-${rand}${Math.floor(Math.random() * 10)}`
}
