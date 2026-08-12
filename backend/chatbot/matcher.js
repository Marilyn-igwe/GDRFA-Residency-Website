import { buildKnowledgeBase, normalize } from './knowledgeBase.js'
import { getAppointment } from '../db.js'
import { getCase as getHumanitarianCase } from '../humanitarian/store.js'

const knowledgeBase = buildKnowledgeBase()
const BOOKING_REFERENCE_PATTERN = /GDRFA-\d{4}-\d{4,6}/i
const HUMANITARIAN_REFERENCE_PATTERN = /HCASE-\d{4}-\d{4,6}/i

function scoreEntry(entryKeywords, messageTokens) {
  const messageSet = new Set(messageTokens)
  let matches = 0
  for (const kw of entryKeywords) {
    if (messageSet.has(kw)) matches++
  }
  // Normalize by entry length so short, precise entries aren't drowned out
  // by long ones — this is the whole "ranking" logic, kept deliberately
  // simple so it's easy to reason about and extend.
  return entryKeywords.length ? matches / Math.sqrt(entryKeywords.length) : 0
}

function resolveAnswer(entry) {
  return typeof entry.answer === 'function' ? entry.answer() : entry.answer
}

/**
 * Looks up a booking or humanitarian case by reference number and returns
 * a conversational status update — the "application status" requirement,
 * answered from real data rather than guesswork.
 */
function tryApplicationStatus(message) {
  const humanitarianMatch = message.match(HUMANITARIAN_REFERENCE_PATTERN)
  if (humanitarianMatch) {
    const reference = humanitarianMatch[0].toUpperCase()
    const caseRecord = getHumanitarianCase(reference)

    if (!caseRecord) {
      return {
        reply: `I couldn't find a humanitarian case with reference ${reference}. Double-check the reference number, or contact GDRFA support if you believe this is an error.`,
        followups: ['What documents does a humanitarian case need?'],
        matchedIntent: 'humanitarian-status-not-found',
      }
    }

    return {
      reply: `Case ${reference}:\n• Category: ${caseRecord.categoryName}\n• Status: ${caseRecord.status}\n• Paperwork readiness: ${caseRecord.readiness.readinessPercent}%${caseRecord.readiness.missingDocuments.length > 0 ? `\n• Still missing: ${caseRecord.readiness.missingDocuments.join(', ')}` : ''}\n\nThe review committee makes the final decision — this only reflects paperwork completeness and current status.`,
      followups: ['What documents does a humanitarian case need?'],
      matchedIntent: 'humanitarian-status-found',
    }
  }

  const bookingMatch = message.match(BOOKING_REFERENCE_PATTERN)
  if (!bookingMatch) return null

  const reference = bookingMatch[0].toUpperCase()
  const appointment = getAppointment(reference)

  if (!appointment) {
    return {
      reply: `I couldn't find an appointment with reference ${reference}. Double-check the reference number, or contact GDRFA support if you believe this is an error.`,
      followups: ['What are your center hours?'],
      matchedIntent: 'application-status-not-found',
    }
  }

  if (appointment.status === 'cancelled') {
    return {
      reply: `Appointment ${reference} for ${appointment.serviceName} was cancelled. If this wasn't intentional, you can book a new appointment.`,
      followups: ['How do I book an appointment?'],
      matchedIntent: 'application-status-cancelled',
    }
  }

  return {
    reply: `Appointment ${reference}:\n• Service: ${appointment.serviceName}\n• Center: ${appointment.centerName}\n• Date: ${appointment.date}\n• Time: ${appointment.time}\n• Status: ${appointment.status}\n• Fee: ${appointment.feeAed} AED`,
    followups: ['What documents should I bring?'],
    matchedIntent: 'application-status-found',
  }
}

export function getChatbotReply(message) {
  if (!message || !message.trim()) {
    return {
      reply: "I didn't catch that — could you rephrase your question?",
      followups: ['What services do you offer?'],
      matchedIntent: 'empty',
    }
  }

  const statusReply = tryApplicationStatus(message)
  if (statusReply) return statusReply

  const messageTokens = normalize(message)

  let best = null
  let bestScore = 0

  for (const entry of knowledgeBase) {
    const score = scoreEntry(entry.keywords, messageTokens)
    if (score > bestScore) {
      bestScore = score
      best = entry
    }
  }

  // Threshold: below this, we don't trust the match enough to answer
  // confidently — better to say so than to guess and get GDRFA policy wrong.
  if (!best || bestScore < 0.3) {
    return {
      reply:
        "I'm not fully sure about that one. I can help with document requirements, fees, service availability, application status (paste your reference number, e.g. GDRFA-2026-1234 or HCASE-2026-1234), and humanitarian cases. You can also reach GDRFA support directly for anything outside that.",
      followups: ['What services do you offer?', 'What documents do I need for residence renewal?'],
      matchedIntent: 'fallback',
    }
  }

  return {
    reply: resolveAnswer(best),
    followups: best.followups || [],
    matchedIntent: best.id,
  }
}
