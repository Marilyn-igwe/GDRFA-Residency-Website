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

export async function getServices() {
  return handle(await fetch(`${API_BASE}/services`))
}

export async function getCenters() {
  return handle(await fetch(`${API_BASE}/centers`))
}

export async function getAvailability(serviceId, date) {
  const params = new URLSearchParams({ serviceId, date })
  return handle(await fetch(`${API_BASE}/availability?${params}`))
}

export async function createAppointment(payload) {
  return handle(
    await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  )
}

export async function getAppointment(reference) {
  return handle(await fetch(`${API_BASE}/appointments/${reference}`))
}

export async function cancelAppointment(reference) {
  return handle(await fetch(`${API_BASE}/appointments/${reference}`, { method: 'DELETE' }))
}

// files: [{ name, mimeType, dataBase64 }]
export async function verifyDocuments(serviceId, files) {
  return handle(
    await fetch(`${API_BASE}/documents/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, files })
    })
  )
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.readAsDataURL(file)
  })
}
