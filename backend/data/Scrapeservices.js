// Crawls gdrfad.gov.ae's service catalog and produces a services.json
// file shaped to match backend/data/seedData.js's `services` export.
//
// Run manually or on a schedule:
//   node scrapeServices.js
//
// Usage in seedData.js — see the comment at the bottom of this file.

import * as cheerio from 'cheerio'
import { writeFile } from 'node:fs/promises'

const BASE_URL = 'https://www.gdrfad.gov.ae'
const SERVICES_ROOT = `${BASE_URL}/en/services`
const OUTPUT_PATH = new URL('./services.scraped.json', import.meta.url)

// Be polite — this is a real government site, not an API meant for
// bulk automated traffic. Space requests out and cap concurrency.
const REQUEST_DELAY_MS = 400
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function fetchPage(url) {
  const res = await fetch(url, {
    headers: {
      // Identify the bot honestly rather than spoofing a browser —
      // you're working with GDRFA directly, so there's no reason to hide.
      'User-Agent': 'GDRFA-Chatbot-DataSync/1.0 (+internal service data sync)',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`)
  }

  return cheerio.load(await res.text())
}

/**
 * A page is a "leaf" service page (has real details to scrape) if it has
 * a "Service Details" section. Category/index pages only list child links.
 */
function isLeafServicePage($) {
  return $('h2, h3, h4, h5, h6')
    .filter((_, el) => $(el).text().trim().toLowerCase() === 'service details')
    .length > 0
}

/**
 * Category pages list child services/categories as plain links back into
 * /en/services/{uuid}. Leaf pages also contain a "Related Services" list
 * we deliberately do NOT want to re-crawl as if they were children.
 */
function extractChildServiceLinks($) {
  const links = new Set()

  $('a[href*="/en/services/"]').each((_, el) => {
    const href = $(el).attr('href')
    if (!href) return

    const match = href.match(/\/en\/services\/([a-f0-9-]{36})/i)
    if (match) links.add(`${BASE_URL}/en/services/${match[1]}`)
  })

  return [...links]
}

/**
 * Pulls the text of the section that follows a given heading label
 * (e.g. "Requirements", "Fees") up until the next heading of the same
 * level. This site renders each section as a heading + a following block,
 * so this is more robust than hardcoding specific CSS classes that could
 * change with a theme update.
 */
function sectionTextAfterHeading($, label) {
  const heading = $('h2, h3, h4, h5, h6').filter(
    (_, el) => $(el).text().trim().toLowerCase() === label.toLowerCase()
  )

  if (heading.length === 0) return ''

  const headingTag = heading.get(0).tagName
  let text = ''
  let node = heading.next()

  while (node.length && node.get(0).tagName !== headingTag) {
    text += `${node.text()}\n`
    node = node.next()
  }

  return text.trim()
}

function parseRequirementsToDocuments(text) {
  if (!text) return []

  return text
    .split('\n')
    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
    .filter(Boolean)
}

/**
 * Fee text looks like:
 *   "Residency permit renewal fee: AED200
 *    Extra charge :
 *    Knowledge Dirham: AED10
 *    Innovation Dirham: AED10
 *    Fee inside the country: AED500
 *    Delivery fees:
 *    AED20"
 *
 * We extract every AED figure as a labeled line item, and separately
 * report a total — since seedData.js currently expects a single
 * `feeAed` number, and collapsing a multi-part fee into one number is a
 * real decision, not just parsing. Keeping the breakdown lets whoever
 * wires this in choose base fee only vs. full total.
 */
function parseFees(text) {
  const lineItems = []
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  for (const line of lines) {
    const match = line.match(/^(.*?):?\s*AED\s*([\d,.]+)\s*$/i)
    if (match) {
      const label = match[1].replace(/:$/, '').trim() || 'Fee'
      const amount = Number(match[2].replace(/,/g, ''))
      if (!Number.isNaN(amount)) lineItems.push({ label, amount })
    }
  }

  const baseFee = lineItems[0]?.amount ?? null
  const totalFee = lineItems.reduce((sum, item) => sum + item.amount, 0) || null

  return { lineItems, baseFee, totalFee }
}

function parseExpectedCompletionHours(text) {
  const match = text.match(/([\d.]+)\s*Hour/i)
  return match ? Number(match[1]) : null
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function scrapeLeafPage(url, $) {
  const name = $('h1').first().text().trim()
  const id = url.match(/\/en\/services\/([a-f0-9-]{36})/i)?.[1] || slugify(name)

  const requirementsText = sectionTextAfterHeading($, 'Requirements')
  const feesText = sectionTextAfterHeading($, 'Fees')
  const completionText = sectionTextAfterHeading($, 'Expected Completion Time')
  const availabilityText = sectionTextAfterHeading($, 'Service Availability Channels')
  const additionalInfoText = sectionTextAfterHeading($, 'Additional Information')

  const fees = parseFees(feesText)

  return {
    id,
    sourceUrl: url,
    name,
    documents: parseRequirementsToDocuments(requirementsText),
    feeAed: fees.baseFee,
    feeBreakdown: fees.lineItems,
    feeTotalAed: fees.totalFee,
    expectedCompletionHours: parseExpectedCompletionHours(completionText),
    availability: availabilityText,
    additionalInfo: additionalInfoText,
    scrapedAt: new Date().toISOString(),
  }
}

async function crawl() {
  const visited = new Set()
  const queue = [SERVICES_ROOT]
  const scrapedServices = []

  while (queue.length > 0) {
    const url = queue.shift()
    if (visited.has(url)) continue
    visited.add(url)

    console.log(`Fetching: ${url}`)

    let $
    try {
      $ = await fetchPage(url)
    } catch (error) {
      console.warn(`  Skipping (fetch failed): ${error.message}`)
      continue
    }

    if (isLeafServicePage($)) {
      try {
        const service = await scrapeLeafPage(url, $)
        scrapedServices.push(service)
        console.log(`  Parsed leaf service: ${service.name}`)
      } catch (error) {
        console.warn(`  Failed to parse leaf page ${url}: ${error.message}`)
      }
    } else {
      const children = extractChildServiceLinks($)
      for (const child of children) {
        if (!visited.has(child)) queue.push(child)
      }
      console.log(`  Category page — queued ${children.length} child link(s)`)
    }

    await sleep(REQUEST_DELAY_MS)
  }

  return scrapedServices
}

async function main() {
  const services = await crawl()

  if (services.length === 0) {
    // Don't overwrite a previously good file with an empty result — that
    // would silently blank out the bot's knowledge if the site structure
    // changed and nothing matched anymore.
    throw new Error(
      'Scrape produced zero services — aborting without writing output. ' +
      'The site structure may have changed; check the section-heading labels this script looks for.'
    )
  }

  await writeFile(OUTPUT_PATH, JSON.stringify({ scrapedAt: new Date().toISOString(), services }, null, 2))
  console.log(`\nWrote ${services.length} services to ${OUTPUT_PATH.pathname}`)
}

main().catch((error) => {
  console.error('Scrape failed:', error)
  process.exitCode = 1
})

/*
 * ── Wiring this into seedData.js ──────────────────────────────────────
 *
 * seedData.js currently exports `services` as a static array. Point it
 * at this scraper's output instead, with a static fallback in case the
 * scraped file is missing or stale:
 *
 *   import scraped from './services.scraped.json' assert { type: 'json' }
 *
 *   const FALLBACK_SERVICES = [ ...your current hardcoded array... ]
 *
 *   export const services = (scraped?.services?.length
 *     ? scraped.services.map((s) => ({
 *         id: s.id,
 *         name: s.name,
 *         feeAed: s.feeAed ?? 0,
 *         // NOTE: this is total government processing time, NOT
 *         // in-center appointment duration — keep booking-slot logic
 *         // on its own separately-maintained number, don't reuse this.
 *         avgDurationMinutes: FALLBACK_SERVICES.find((f) => f.id === s.id)?.avgDurationMinutes ?? 20,
 *         documents: s.documents,
 *       }))
 *     : FALLBACK_SERVICES)
 *
 * Then run `node scrapeServices.js` on a schedule (cron/GitHub Action/etc.)
 * to keep services.scraped.json fresh, and restart or hot-reload the
 * backend to pick up changes — or better, have seedData.js re-read the
 * JSON file periodically instead of only at process start.
 */