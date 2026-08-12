const API_BASE = import.meta.env.VITE_BOOKING_API || 'http://localhost:4000/api'

export async function askChatbot(message, { history = [], language = 'en' } = {}) {
  const res = await fetch(`${API_BASE}/chatbot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, language })
  })
  if (!res.ok) {
    throw new Error('Chatbot request failed')
  }
  return res.json()
}
