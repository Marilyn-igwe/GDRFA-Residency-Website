import { staffAuthHeaders, notifyStaffUnauthorized, setStaffToken } from './auth'

const API_BASE = import.meta.env.VITE_BOOKING_API || 'http://localhost:4000/api'

async function handle(res) {
  const data = await res.json()
  if (!res.ok) {
    if (res.status === 401) notifyStaffUnauthorized()
    const err = new Error(data.error || 'Request failed')
    err.data = data
    throw err
  }
  return data
}

export async function login(passcode) {
  const data = await handle(
    await fetch(`${API_BASE}/staff/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode })
    })
  )
  setStaffToken(data.token)
  return data
}

export async function logout() {
  const token = staffAuthHeaders()['x-staff-token']
  if (!token) return
  try {
    await fetch(`${API_BASE}/staff/logout`, { method: 'POST', headers: staffAuthHeaders() })
  } catch {
    // Best-effort — the client-side token clear (in notifyStaffUnauthorized/
    // the caller) is what actually matters for signing out this device.
  }
}

export async function getOverview() {
  return handle(await fetch(`${API_BASE}/staff/overview`, { headers: staffAuthHeaders() }))
}

// filters: { status?, centerId?, serviceId?, date?, q? }
export async function listAppointments(filters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.set(key, value)
  })
  const qs = params.toString()
  return handle(
    await fetch(`${API_BASE}/appointments${qs ? `?${qs}` : ''}`, { headers: staffAuthHeaders() })
  )
}

export async function updateAppointmentStatus(reference, status) {
  return handle(
    await fetch(`${API_BASE}/appointments/${reference}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...staffAuthHeaders() },
      body: JSON.stringify({ status })
    })
  )
}

// Centers/services are public reference data — no auth needed.
export async function getCenters() {
  return handle(await fetch(`${API_BASE}/centers`))
}

export async function getServices() {
  return handle(await fetch(`${API_BASE}/services`))
}
