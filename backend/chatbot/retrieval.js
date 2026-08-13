// Retrieval layer for the AI chatbot path. Loads the deep-crawled service
// pages (from Scrapeservices.js) and, given a user's question, picks the
// handful of pages actually relevant to it — so the LLM gets grounded in
// real content instead of either (a) one shallow page with nothing on it,
// or (b) every page dumped in regardless of relevance.

import { readFile } from 'node:fs/promises'
import { normalize } from './knowledgeBase.js'

const SCRAPED_DATA_PATH = new URL('../data/services.scraped.json', import.meta.url)

// Cache the scraped file in memory so we're not hitting disk on every
// chat message — refreshed periodically in case a new scrape just ran.
let cache = null
let cacheLoadedAt = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 min — cheap disk read, but no need to hit it constantly

async function loadScrapedServices() {
  const now = Date.now()
  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) return cache

  try {
    const raw = await readFile(SCRAPED_DATA_PATH, 'utf-8')
    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed?.services)) {
      throw new Error('services.scraped.json is malformed (missing services array)')
    }

    cache = parsed.services
    cacheLoadedAt = now
    return cache
  } catch (error) {
    // Not scraped yet, or the file is missing/corrupt — the caller
    // (chatbot.js) falls back to the local matcher.js in this case.
    console.warn('Could not load scraped service data:', error.message)
    return []
  }
}

/** Flattens one scraped service into plain text the LLM can read directly. */
function serviceToText(service) {
  const lines = [`# ${service.name}`, `Source: ${service.sourceUrl}`]

  if (service.documents?.length) {
    lines.push('Requirements:')
    lines.push(...service.documents.map((d) => `- ${d}`))
  }

  if (service.feeBreakdown?.length) {
    lines.push('Fees:')
    lines.push(...service.feeBreakdown.map((f) => `- ${f.label}: AED ${f.amount}`))
    if (service.feeTotalAed) lines.push(`- Total: AED ${service.feeTotalAed}`)
  }

  if (service.expectedCompletionHours) {
    lines.push(`Expected completion time: ${service.expectedCompletionHours} hour(s)`)
  }

  if (service.availability) lines.push(`Availability: ${service.availability}`)
  if (service.additionalInfo) lines.push(`Additional info: ${service.additionalInfo}`)

  return lines.join('\n')
}

function scoreService(service, queryTokens) {
  const serviceTokens = normalize(
    `${service.name} ${service.documents?.join(' ') || ''} ${service.additionalInfo || ''}`
  )
  const serviceSet = new Set(serviceTokens)

  let matches = 0
  for (const token of queryTokens) {
    if (serviceSet.has(token)) matches++
  }

  return matches
}

/**
 * Returns the top-N scraped services relevant to the question, formatted
 * as text ready to drop into an LLM prompt, plus the source URLs used —
 * so the reply can cite exactly which pages it was grounded in.
 */
export async function retrieveRelevantServices(message, { topN = 4 } = {}) {
  const services = await loadScrapedServices()
  if (services.length === 0) return { context: '', sources: [], available: false }

  const queryTokens = normalize(message)

  const ranked = services
    .map((service) => ({ service, score: scoreService(service, queryTokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)

  // No specific match — hand over a broader slice (e.g. general "what
  // services do you offer" questions) rather than nothing at all.
  const chosen = ranked.length > 0
    ? ranked.map((entry) => entry.service)
    : services.slice(0, topN)

  return {
    context: chosen.map(serviceToText).join('\n\n---\n\n'),
    sources: chosen.map((s) => ({ title: s.name, url: s.sourceUrl })),
    available: true,
  }
}