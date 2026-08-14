// AI assistance for humanitarian cases.
//
// Two distinct helpers, both deliberately scoped the same way readiness.js
// is: they help with COMPLETENESS AND CLARITY, never with the merits of a
// case. Neither function is allowed to say whether a case is strong, weak,
// likely to succeed, or eligible — that judgment belongs to the committee.
//
// Same provider order as services/documentAi.js:
//   1. Gemini (GEMINI_API_KEY) — free
//   2. Claude (ANTHROPIC_API_KEY) — paid
//   3. Heuristic fallback — no key needed, generic (not personalized) advice
//
// This keeps the app working end-to-end even with no AI key configured,
// same "degrade gracefully" principle as the rest of the codebase.

function parseJsonReply(text) {
  const cleaned = (text || '{}').replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    return null
  }
}

function activeProvider() {
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.ANTHROPIC_API_KEY) return 'claude'
  return 'none'
}

async function callGeminiText(prompt) {
  const model = process.env.GEMINI_MODEL || 'gemini-flash-latest'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 300)}`)
  }

  const data = await response.json()
  return data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}'
}

async function callClaudeText(prompt) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content.find((block) => block.type === 'text')?.text || '{}'
}

async function callAiText(prompt) {
  const provider = activeProvider()
  if (provider === 'gemini') return { text: await callGeminiText(prompt), provider }
  if (provider === 'claude') return { text: await callClaudeText(prompt), provider }
  return { text: null, provider: 'none' }
}

// --- 1. Statement writing/completeness feedback ---------------------------
//
// Helps the APPLICANT before they submit. Never comments on whether the
// underlying situation is compelling — only on whether the statement is
// clear and includes the kind of concrete detail a reviewer would need.

const GENERIC_MISSING_ELEMENTS = [
  'Specific dates (when this began, key events, how long it has been ongoing)',
  'Names of the people, doctors, or officials involved, where relevant',
  'Any supporting evidence you have and where it is referenced in your documents',
]

function statementHeuristicFallback(statement) {
  const wordCount = (statement || '').trim().split(/\s+/).filter(Boolean).length
  const hasDigits = /\d/.test(statement || '')
  const missingElements = []
  if (!hasDigits) missingElements.push('A specific date or timeframe — statements with dates are easier for the committee to follow')
  if (wordCount < 40) missingElements.push('More detail about your specific circumstances')
  missingElements.push(...GENERIC_MISSING_ELEMENTS.filter((m) => !missingElements.includes(m)).slice(0, 2))

  return {
    strengths: wordCount > 0 ? ['You have a statement drafted to build on.'] : [],
    missingElements,
    clarityTip: 'Write in plain, direct sentences and lead with the most important fact — the committee reads many statements and clarity helps yours get understood quickly.',
  }
}

export async function assessStatementWithAI({ category, statement }) {
  const provider = activeProvider()

  if (provider === 'none' || !statement || !statement.trim()) {
    return { ...statementHeuristicFallback(statement), aiEnabled: false, provider: 'none' }
  }

  const prompt =
    `A person is writing a statement to a UAE residency committee explaining why their case ` +
    `("${category.name}": ${category.description}) deserves special consideration.\n\n` +
    `Do NOT judge whether their case is strong, likely to succeed, credible, or eligible — that is ` +
    `for the committee alone to decide. Only give writing and completeness feedback, the way a ` +
    `helpful editor would, focused on whether the statement is clear and includes the kind of concrete ` +
    `detail a reviewer would need to understand the situation.\n\n` +
    `Statement:\n"""${statement}"""\n\n` +
    `Respond ONLY with JSON, no markdown fences, no other text, in this exact shape:\n` +
    `{"strengths":["..."],"missingElements":["..."],"clarityTip":"..."}\n` +
    `strengths: 1-3 short things the statement already does well (e.g. gives a specific date, names a ` +
    `treating doctor). Empty array if none stand out.\n` +
    `missingElements: 1-4 short, specific, plain-language, encouraging suggestions of concrete details ` +
    `to consider adding if they are not already there (e.g. "the name of your doctor or hospital", ` +
    `"how long the treatment is expected to last"). Phrase each as something to add, never as criticism.\n` +
    `clarityTip: one short, encouraging sentence of general writing advice for this specific statement.`

  try {
    const { text } = await callAiText(prompt)
    const parsed = parseJsonReply(text)
    if (!parsed || !Array.isArray(parsed.missingElements)) {
      throw new Error('Unexpected AI response shape')
    }
    return {
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 3) : [],
      missingElements: parsed.missingElements.slice(0, 4),
      clarityTip: typeof parsed.clarityTip === 'string' ? parsed.clarityTip : '',
      aiEnabled: true,
      provider,
    }
  } catch (err) {
    console.error('AI statement feedback failed, using fallback:', err.message)
    return { ...statementHeuristicFallback(statement), aiEnabled: false, provider: 'none' }
  }
}

// --- 2. Committee brief -----------------------------------------------------
//
// Helps the COMMITTEE read a case faster. Strictly factual extraction plus
// neutral, checkable flags — e.g. "statement mentions a lease but no lease
// document was provided." Never a recommendation, risk score, or opinion on
// the case's merits. If AI isn't available, this returns null and the UI
// falls back to the existing template summary (summary.js), which is
// already fully mechanical and always available.

export async function generateAiBrief({ categoryName, categoryDescription, documentsProvided, missingDocuments, statement }) {
  const provider = activeProvider()
  if (provider === 'none' || !statement || !statement.trim()) return null

  const prompt =
    `You are preparing a neutral briefing note for a UAE residency review committee about a ` +
    `humanitarian case, to save the committee reading time. You must NOT recommend approval, denial, ` +
    `or any outcome, and must NOT comment on the merits, credibility, or eligibility of the case — only ` +
    `extract and organize the facts that are actually stated.\n\n` +
    `Case category: ${categoryName} — ${categoryDescription}\n` +
    `Documents provided: ${documentsProvided.length ? documentsProvided.join(', ') : 'none marked'}\n` +
    `Documents missing: ${missingDocuments.length ? missingDocuments.join(', ') : 'none'}\n` +
    `Applicant statement:\n"""${statement}"""\n\n` +
    `Respond ONLY with JSON, no markdown fences, no other text, in this exact shape:\n` +
    `{"keyFacts":["..."],"pointsToVerify":["..."]}\n` +
    `keyFacts: 3-6 short, neutral bullet points pulling out the concrete facts actually stated (who, ` +
    `what, when, relevant details). No opinions, no adjectives implying strength or weakness.\n` +
    `pointsToVerify: 0-4 short bullets flagging things staff may want to double-check — e.g. a document ` +
    `mentioned in the statement that isn't in the provided list, a date that seems inconsistent, or a ` +
    `detail that's vague. Phrase each neutrally as a thing to check, never as a judgment on the case.`

  try {
    const { text } = await callAiText(prompt)
    const parsed = parseJsonReply(text)
    if (!parsed || !Array.isArray(parsed.keyFacts)) {
      throw new Error('Unexpected AI response shape')
    }
    return {
      keyFacts: parsed.keyFacts.slice(0, 6),
      pointsToVerify: Array.isArray(parsed.pointsToVerify) ? parsed.pointsToVerify.slice(0, 4) : [],
      provider,
      generatedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('AI committee brief failed:', err.message)
    return null
  }
}
