// Checks whether uploaded files actually match the document types a
// service requires (passport, Emirates ID, photo, visa page, etc).
//
// Three ways this can run, tried in this order:
//   1. Gemini vision API — FREE, no credit card. Set GEMINI_API_KEY.
//      Get a key at https://aistudio.google.com/apikey
//   2. Claude vision API — paid. Set ANTHROPIC_API_KEY.
//   3. Filename heuristic — no key needed, but NOT real document
//      verification. Used only if neither key above is set, so the
//      feature still degrades gracefully instead of hard-failing.
//
// You only need ONE of the two API keys, not both. Gemini is the free
// option and is tried first if both happen to be set.

const PROMPT_INSTRUCTIONS = (requirements, fileCount) =>
  `A visa-services applicant needs to provide these documents:\n` +
  requirements.map((r, i) => `${i + 1}. ${r}`).join('\n') +
  `\n\nThey uploaded ${fileCount} file(s), shown below in order. For each ` +
  `uploaded file, identify which required document (if any) it best matches, and ` +
  `whether it looks legible and complete. Then say which of the required documents, ` +
  `if any, still have nothing uploaded for them.\n\n` +
  `Respond ONLY with JSON, no other text, no markdown fences, in this exact shape:\n` +
  `{"files":[{"index":0,"matchesRequirement":"<exact requirement text or null>","legible":true,"reason":"<short reason>"}],"missingRequirements":["<requirement text>"]}`

function parseJsonReply(text) {
  const cleaned = (text || '{}').replace(/```json|```/g, '').trim()
  return JSON.parse(cleaned)
}

// --- Option 1: Gemini (free) --------------------------------------------

async function callGeminiVision(requirements, files) {
  const model = 'gemini-flash-latest'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`

  const parts = [{ text: PROMPT_INSTRUCTIONS(requirements, files.length) }]
  for (const file of files) {
    parts.push({ inline_data: { mime_type: file.mimeType, data: file.dataBase64 } })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }] })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 300)}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '{}'
  return parseJsonReply(text)
}

// --- Option 2: Claude (paid) ---------------------------------------------

async function callClaudeVision(requirements, files) {
  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const content = [{ type: 'text', text: PROMPT_INSTRUCTIONS(requirements, files.length) }]
  for (const file of files) {
    content.push({ type: 'image', source: { type: 'base64', media_type: file.mimeType, data: file.dataBase64 } })
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1000,
    messages: [{ role: 'user', content }]
  })

  const text = response.content.find((block) => block.type === 'text')?.text || '{}'
  return parseJsonReply(text)
}

// --- Option 3: filename heuristic (no key, not real verification) -------

function heuristicFallback(requirements, files) {
  const keywordsFor = (label) => label.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3)

  const fileResults = files.map((file, index) => {
    const name = (file.name || '').toLowerCase()
    let bestMatch = null
    let bestScore = 0
    for (const req of requirements) {
      const score = keywordsFor(req).filter((kw) => name.includes(kw)).length
      if (score > bestScore) {
        bestScore = score
        bestMatch = req
      }
    }
    return {
      index,
      matchesRequirement: bestScore > 0 ? bestMatch : null,
      legible: true,
      reason: bestScore > 0 ? 'Matched by filename (AI scanning not configured).' : 'Could not tell what this file is from its name — AI scanning is not configured.'
    }
  })

  const matched = new Set(fileResults.map((f) => f.matchesRequirement).filter(Boolean))
  const missingRequirements = requirements.filter((r) => !matched.has(r))

  return { files: fileResults, missingRequirements }
}

// --------------------------------------------------------------------------

function activeProvider() {
  if (process.env.GEMINI_API_KEY) return 'gemini'
  if (process.env.ANTHROPIC_API_KEY) return 'claude'
  return 'none'
}

export async function verifyDocuments(requirements, files) {
  const provider = activeProvider()

  let raw
  if (provider === 'gemini') {
    raw = await callGeminiVision(requirements, files)
  } else if (provider === 'claude') {
    raw = await callClaudeVision(requirements, files)
  } else {
    raw = heuristicFallback(requirements, files)
  }

  const matchedByRequirement = new Map()
  for (const fileResult of raw.files || []) {
    if (fileResult.matchesRequirement) {
      matchedByRequirement.set(fileResult.matchesRequirement, fileResult)
    }
  }

  const requirementResults = requirements.map((label) => {
    const match = matchedByRequirement.get(label)
    if (!match) {
      return { label, status: 'missing', reason: 'No uploaded file matched this requirement.' }
    }
    if (match.legible === false) {
      return { label, status: 'unclear', reason: match.reason || 'Uploaded file could not be read clearly.' }
    }
    return { label, status: 'ok', reason: match.reason || 'Looks correct.' }
  })

  return {
    requirements: requirementResults,
    allSatisfied: requirementResults.every((r) => r.status === 'ok'),
    aiEnabled: provider !== 'none',
    provider
  }
}
