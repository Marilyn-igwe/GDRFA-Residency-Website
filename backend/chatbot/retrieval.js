import { readFile } from 'node:fs/promises'
import * as cheerio from 'cheerio'
import { normalize } from './knowledgeBase.js'

const SCRAPED_DATA_PATH = new URL(
  '../data/services.scraped.json',
  import.meta.url
)

const CACHE_TTL_MS = 5 * 60 * 1000
const LIVE_CACHE_TTL_MS = 15 * 60 * 1000
const GDRFA_ORIGIN = 'https://www.gdrfad.gov.ae'

let cache = null
let cacheLoadedAt = 0

const liveCache = new Map()

async function loadScrapedServices() {
  const now = Date.now()

  if (cache && now - cacheLoadedAt < CACHE_TTL_MS) {
    return cache
  }

  try {
    const raw = await readFile(
      SCRAPED_DATA_PATH,
      'utf-8'
    )

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed?.services)) {
      throw new Error(
        'services.scraped.json is missing its services array'
      )
    }

    cache = parsed.services
    cacheLoadedAt = now

    return cache
  } catch (error) {
    console.warn(
      'Could not load the local GDRFA service index:',
      error.message
    )

    return []
  }
}

function serviceToText(service) {
  const lines = [
    `# ${service.name}`,
    `Source: ${service.sourceUrl}`
  ]

  if (service.documents?.length) {
    lines.push('Requirements:')

    lines.push(
      ...service.documents.map(
        (document) => `- ${document}`
      )
    )
  }

  if (service.feeBreakdown?.length) {
    lines.push('Fees:')

    lines.push(
      ...service.feeBreakdown.map(
        (fee) => `- ${fee.label}: AED ${fee.amount}`
      )
    )

    if (service.feeTotalAed) {
      lines.push(
        `- Total: AED ${service.feeTotalAed}`
      )
    }
  }

  if (service.expectedCompletionHours) {
    lines.push(
      `Expected completion time: ` +
        `${service.expectedCompletionHours} hour(s)`
    )
  }

  if (service.availability) {
    lines.push(
      `Availability: ${service.availability}`
    )
  }

  if (service.additionalInfo) {
    lines.push(
      `Additional information: ${service.additionalInfo}`
    )
  }

  return lines.join('\n')
}

function editDistance(left, right) {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index
  )

  for (let i = 1; i <= left.length; i++) {
    let diagonal = previous[0]

    previous[0] = i

    for (let j = 1; j <= right.length; j++) {
      const saved = previous[j]

      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal +
          (left[i - 1] === right[j - 1] ? 0 : 1)
      )

      diagonal = saved
    }
  }

  return previous[right.length]
}

function wordSimilarity(left, right) {
  if (left === right) {
    return 1
  }

  if (left.length < 4 || right.length < 4) {
    return 0
  }

  const distance = editDistance(left, right)

  const ratio =
    1 -
    distance /
      Math.max(left.length, right.length)

  return ratio >= 0.72 ? ratio : 0
}

function trigrams(text) {
  const value = `  ${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()}  `

  const result = new Set()

  for (
    let index = 0;
    index < value.length - 2;
    index++
  ) {
    result.add(value.slice(index, index + 3))
  }

  return result
}

function phraseSimilarity(leftText, rightText) {
  const left = trigrams(leftText)
  const right = trigrams(rightText)

  if (!left.size || !right.size) {
    return 0
  }

  let shared = 0

  for (const gram of left) {
    if (right.has(gram)) {
      shared++
    }
  }

  return (
    (2 * shared) /
    (left.size + right.size)
  )
}

function searchableText(service) {
  return [
    service.name,
    ...(service.documents || []),
    ...(service.feeBreakdown || []).map(
      (fee) => fee.label
    ),
    service.availability,
    service.additionalInfo
  ]
    .filter(Boolean)
    .join(' ')
}

function scoreService(service, message) {
  const queryTokens = normalize(message).filter(
    (token) => token.length > 2
  )

  const serviceTokens = [
    ...new Set(
      normalize(
        searchableText(service)
      ).filter((token) => token.length > 2)
    )
  ]

  let tokenScore = 0

  for (const queryToken of queryTokens) {
    let best = 0

    for (const serviceToken of serviceTokens) {
      best = Math.max(
        best,
        wordSimilarity(
          queryToken,
          serviceToken
        )
      )

      if (best === 1) {
        break
      }
    }

    tokenScore += best
  }

  const titleScore =
    phraseSimilarity(
      message,
      service.name
    ) * 4

  const coverage = queryTokens.length
    ? tokenScore /
      Math.sqrt(queryTokens.length)
    : 0

  return titleScore + coverage
}

function queryFromMessage(message) {
  const application = message.match(
    /Application:\s*([^\n]+)/i
  )?.[1]?.trim()

  const question = message
    .split('\n')[0]
    .trim()

  const combined =
    `${application || ''} ${question}`

  return [
    ...new Set(
      normalize(combined).filter(
        (word) => word.length > 2
      )
    )
  ]
    .slice(0, 12)
    .join(' ')
}

async function fetchHtml(url) {
  const controller = new AbortController()

  const timeout = setTimeout(() => {
    controller.abort()
  }, 9000)

  try {
    const response = await fetch(url, {
      signal: controller.signal,

      headers: {
        'User-Agent':
          'GDRFA-Application-Support/1.0'
      }
    })

    if (!response.ok) {
      throw new Error(
        `GDRFA request failed with ` +
          `${response.status}`
      )
    }

    return response.text()
  } finally {
    clearTimeout(timeout)
  }
}

function extractOfficialPage(url, html) {
  const $ = cheerio.load(html)

  const title =
    $('h1')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim() ||
    $('title').text().trim()

  const usefulLabels =
    /service details|requirements|required documents|fees|completion|availability|additional information|terms and conditions|service steps|eligibility/i

  const sections = []

  $('h2, h3, h4, h5, h6').each(
    (_, heading) => {
      const label = $(heading)
        .text()
        .replace(/\s+/g, ' ')
        .trim()

      if (!usefulLabels.test(label)) {
        return
      }

      let node = $(heading).next()
      let text = ''

      while (
        node.length &&
        !/^h[2-6]$/i.test(
          node.get(0)?.tagName || ''
        )
      ) {
        text += ` ${node.text()}`
        node = node.next()
      }

      text = text
        .replace(/\s+/g, ' ')
        .trim()

      if (text) {
        sections.push(
          `${label}: ${text}`
        )
      }
    }
  )

  if (!sections.length) {
    const mainText = $('#main-content, main')
      .first()
      .text()
      .replace(/\s+/g, ' ')
      .trim()

    if (mainText) {
      sections.push(
        mainText.slice(0, 12000)
      )
    }
  }

  return {
    name: title,
    sourceUrl: url,
    content: sections
      .join('\n')
      .slice(0, 14000)
  }
}

async function retrieveLiveServices(
  message,
  { topN }
) {
  const query = queryFromMessage(message)

  if (!query) {
    return {
      context: '',
      sources: [],
      available: false
    }
  }

  const cached = liveCache.get(query)

  if (
    cached &&
    Date.now() - cached.loadedAt <
      LIVE_CACHE_TTL_MS
  ) {
    return cached.result
  }

  try {
    const searchUrl =
      `${GDRFA_ORIGIN}/en/search-website?` +
      `search_api_fulltext=` +
      encodeURIComponent(query)

    const searchHtml =
      await fetchHtml(searchUrl)

    const $ = cheerio.load(searchHtml)
    const urls = []

    $('a[href*="/en/services/"]').each(
      (_, element) => {
        const href =
          $(element).attr('href')

        if (!href) return

        const url = new URL(
          href,
          GDRFA_ORIGIN
        )

        if (
          url.hostname !==
          'www.gdrfad.gov.ae'
        ) {
          return
        }

        if (
          !/^\/en\/services\/[a-f0-9-]{36}\/?$/i.test(
            url.pathname
          )
        ) {
          return
        }

        const normalized =
          `${url.origin}` +
          url.pathname.replace(/\/$/, '')

        if (!urls.includes(normalized)) {
          urls.push(normalized)
        }
      }
    )

    const pages = (
      await Promise.all(
        urls
          .slice(
            0,
            Math.max(topN, 3)
          )
          .map(async (url) => {
            try {
              const html =
                await fetchHtml(url)

              return extractOfficialPage(
                url,
                html
              )
            } catch {
              return null
            }
          })
      )
    ).filter((page) => page?.content)

    const result = pages.length
      ? {
          context: pages
            .map(
              (page) =>
                `# ${page.name}\n` +
                `Source: ${page.sourceUrl}\n` +
                page.content
            )
            .join('\n\n---\n\n'),

          sources: pages.map((page) => ({
            title: page.name,
            url: page.sourceUrl
          })),

          available: true,
          live: true
        }
      : {
          context: '',
          sources: [],
          available: false
        }

    liveCache.set(query, {
      loadedAt: Date.now(),
      result
    })

    return result
  } catch (error) {
    console.warn(
      'Live GDRFA service search failed:',
      error.message
    )

    return {
      context: '',
      sources: [],
      available: false
    }
  }
}

export async function retrieveRelevantServices(
  message,
  { topN = 4 } = {}
) {
  const services =
    await loadScrapedServices()

  if (services.length === 0) {
    return retrieveLiveServices(
      message,
      { topN }
    )
  }

  const ranked = services
    .map((service) => ({
      service,
      score: scoreService(
        service,
        message
      )
    }))
    .filter(
      (entry) => entry.score >= 0.65
    )
    .sort(
      (left, right) =>
        right.score - left.score
    )
    .slice(0, topN)

  const chosen = ranked.length
    ? ranked.map(
        (entry) => entry.service
      )
    : services.slice(0, topN)

  return {
    context: chosen
      .map(serviceToText)
      .join('\n\n---\n\n'),

    sources: chosen.map((service) => ({
      title: service.name,
      url: service.sourceUrl
    })),

    available: true
  }
}