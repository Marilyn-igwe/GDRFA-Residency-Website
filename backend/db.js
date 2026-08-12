import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, 'data', 'store.json')

function loadStore() {
  if (!existsSync(DB_FILE)) {
    const initial = { appointments: [], slotBookings: {}, humanitarianCases: [] }
    writeFileSync(DB_FILE, JSON.stringify(initial, null, 2))
    return initial
  }
  const store = JSON.parse(readFileSync(DB_FILE, 'utf-8'))
  // Backfill fields for store.json files created before this feature existed.
  if (!store.humanitarianCases) store.humanitarianCases = []
  return store
}

function saveStore(store) {
  writeFileSync(DB_FILE, JSON.stringify(store, null, 2))
}

// slotKey uniquely identifies one bookable slot: center + service + date + time
export function slotKey(centerId, serviceId, date, time) {
  return `${centerId}__${serviceId}__${date}__${time}`
}

export function getBookedCount(centerId, serviceId, date, time) {
  const store = loadStore()
  return store.slotBookings[slotKey(centerId, serviceId, date, time)] || 0
}

export function incrementBookedCount(centerId, serviceId, date, time) {
  const store = loadStore()
  const key = slotKey(centerId, serviceId, date, time)
  store.slotBookings[key] = (store.slotBookings[key] || 0) + 1
  saveStore(store)
  return store.slotBookings[key]
}

export function decrementBookedCount(centerId, serviceId, date, time) {
  const store = loadStore()
  const key = slotKey(centerId, serviceId, date, time)
  store.slotBookings[key] = Math.max(0, (store.slotBookings[key] || 0) - 1)
  saveStore(store)
}

export function createAppointment(appointment) {
  const store = loadStore()
  store.appointments.push(appointment)
  saveStore(store)
  return appointment
}

export function getAppointment(reference) {
  const store = loadStore()
  return store.appointments.find((a) => a.reference === reference) || null
}

export function cancelAppointment(reference) {
  const store = loadStore()
  const appt = store.appointments.find((a) => a.reference === reference)
  if (!appt || appt.status === 'cancelled') return null
  appt.status = 'cancelled'
  saveStore(store)
  decrementBookedCount(appt.centerId, appt.serviceId, appt.date, appt.time)
  return appt
}

export function listAppointments() {
  const store = loadStore()
  return store.appointments
}

export function createHumanitarianCase(caseRecord) {
  const store = loadStore()
  store.humanitarianCases.push(caseRecord)
  saveStore(store)
  return caseRecord
}

export function getHumanitarianCase(reference) {
  const store = loadStore()
  return store.humanitarianCases.find((c) => c.reference === reference) || null
}

export function listHumanitarianCases() {
  const store = loadStore()
  return store.humanitarianCases
}

// Committee-only update: status and internal notes. This never touches
// the readiness assessment itself — that's recomputed independently from
// the submitted documents/statement, not something a reviewer overwrites.
export function updateHumanitarianCaseStatus(reference, { status, committeeNotes }) {
  const store = loadStore()
  const caseRecord = store.humanitarianCases.find((c) => c.reference === reference)
  if (!caseRecord) return null

  if (status) caseRecord.status = status
  if (typeof committeeNotes === 'string') caseRecord.committeeNotes = committeeNotes
  caseRecord.updatedAt = new Date().toISOString()

  saveStore(store)
  return caseRecord
}
