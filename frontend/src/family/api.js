const API_BASE = import.meta.env.VITE_BOOKING_API || 'http://localhost:4000/api'

async function handle(res) {
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || 'Request failed')
    err.data = data
    throw err
  }
  return data
}

export async function getFamilyRequirements() {
  return handle(await fetch(`${API_BASE}/family/requirements`))
}

export async function getFamilyAvailability(date, partySize) {
  return handle(await fetch(`${API_BASE}/family/availability?date=${date}&partySize=${partySize}`))
}

export async function submitFamilyApplication(payload) {
  return handle(
    await fetch(`${API_BASE}/family/applications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  )
}

export async function getFamilyApplication(reference) {
  return handle(await fetch(`${API_BASE}/family/applications/${reference}`))
}

export async function listFamilyApplications() {
  return handle(await fetch(`${API_BASE}/family/applications`))
}

export async function updateFamilyApplication(reference, payload) {
  return handle(
    await fetch(`${API_BASE}/family/applications/${reference}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  )
}
