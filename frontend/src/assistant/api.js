import { KNOWLEDGE_BASE_UPDATED, matchKnowledge, relatedTopics, knowledgeBase } from './knowledgeBase'

const API_BASE = import.meta.env.VITE_BOOKING_API || 'http://localhost:4000/api'

// Simulated "thinking" latency for the offline fallback, so the UI's
// loading state reads as genuine retrieval rather than an instant lookup.
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function offlineAnswer(message) {
  const match = matchKnowledge(message)

  if (!match) {
    return {
      reply:
        "I don't have indexed guidance on that yet. Log it for the regulatory affairs team, or check the latest circular index directly before advising the applicant.",
      sources: [],
      followups: relatedTopics(null, 3).map((e) => e.title),
      escalate: true,
    }
  }

  return {
    reply: match.answer,
    sources: [match.source],
    followups: relatedTopics(match.id, 3).map((e) => e.title),
    escalate: false,
  }
}

export async function askAssistant(message, { history = [] } = {}) {
  try {
    const res = await fetch(`${API_BASE}/employee-assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
    })
    if (!res.ok) throw new Error('Assistant backend unavailable')
    return await res.json()
  } catch (err) {
    // No live backend in this environment (or it's unreachable) — answer
    // from the local knowledge base instead of surfacing an error, since a
    // counter officer mid-conversation with an applicant needs an answer,
    // not a connection failure.
    await wait(500 + Math.random() * 500)
    return offlineAnswer(message)
  }
}

export function listTopics() {
  return knowledgeBase.map((e) => ({ id: e.id, title: e.title, category: e.category }))
}

export function knowledgeUpdatedDate() {
  return KNOWLEDGE_BASE_UPDATED
}
