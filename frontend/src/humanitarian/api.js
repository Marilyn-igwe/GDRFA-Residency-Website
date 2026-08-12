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

export async function getCategories() {
  return handle(await fetch(`${API_BASE}/humanitarian/categories`))
}

export async function checkReadiness(payload) {
  return handle(
    await fetch(`${API_BASE}/humanitarian/check-readiness`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  )
}

export async function submitCase(payload) {
  return handle(
    await fetch(`${API_BASE}/humanitarian/cases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  )
}

export async function listCases() {
  return handle(await fetch(`${API_BASE}/humanitarian/cases`))
}

export async function getCase(reference) {
  return handle(await fetch(`${API_BASE}/humanitarian/cases/${reference}`))
}

export async function updateCase(reference, payload) {
  return handle(
    await fetch(`${API_BASE}/humanitarian/cases/${reference}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  )
}
