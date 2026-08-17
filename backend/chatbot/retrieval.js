import { readFile } from 'node:fs/promises'
import * as cheerio from 'cheerio'
import { normalize } from './knowledgeBase.js'

const SCRAPED_DATA_PATH = new URL(
  '../data/services.scraped.json',
  import.meta.url
)

const GDRFA_ORIGIN =
  'https://www.gdrfad.gov.ae'

const LOCAL_CACHE_TTL_MS =
  5 * 60 * 1000

const LIVE_CACHE_TTL_MS =
  15 * 60 * 1000

const REQUEST_TIMEOUT_MS = 9000

const MIN_SERVICE_SCORE = 1.15
const MIN_SECTION_SCORE = 0.85

const MAX_SEARCH_RESULTS = 10
const MAX_SELECTED_SECTIONS = 6
const MAX_CONTEXT_CHARACTERS = 18000

const STOP_WORDS = new Set([
  'about',
  'after',
  'again',
  'application',
  'asking',
  'before',
  'being',
  'cannot',
  'complete',
  'completing',
  'context',
  'could',
  'current',
  'explain',
  'field',
  'form',
  'from',
  'guidance',
  'help',
  'information',
  'label',
  'labels',
  'need',
  'please',
  'question',
  'requirements',
  'service',
  'should',
  'step',
  'that',
  'their',
  'there',
  'these',
  'this',
  'visible',
  'what',
  'when',
  'where',
  'which',
  'with',
  'would',
  'your'
])

const QUERY_SYNONYMS = {
  apply: ['application', 'issuance'],
  cancel: ['cancellation'],
  child: ['children', 'dependent', 'family'],
  cost: ['fee', 'fees', 'price'],
  daughter: ['child', 'family', 'dependent'],
  document: ['documents', 'requirement', 'paper'],
  documents: ['requirements', 'papers'],
  expiry: ['expiration', 'validity'],
  family: ['dependent', 'spouse', 'children'],
  husband: ['spouse', 'family'],
  job: ['employment', 'work'],
  marriage: ['spouse', 'relationship'],
  paper: ['document', 'requirement'],
  passport: ['travel document'],
  price: ['fee', 'cost'],
  renew: ['renewal'],
  renewing: ['renewal'],
  residence: ['residency', 'permit'],
  residency: ['residence', 'permit'],
  salary: ['income', 'employment'],
  son: ['child', 'family', 'dependent'],
  upload: ['file', 'document'],
  visa: ['residence', 'permit'],
  wife: ['spouse', 'family']
}

const COMMON_CORRECTIONS = {
  aplication: 'application',
  appliction: 'application',
  docment: 'document',
  docments: 'documents',
  documant: 'document',
  documants: 'documents',
  documnet: 'document',
  documnts: 'documents',
  eligibile: 'eligible',
  eligibilty: 'eligibility',
  expiary: 'expiry',
  famly: 'family',
  pasport: 'passport',
  passprt: 'passport',
  reqired: 'required',
  requirment: 'requirement',
  requirments: 'requirements',
  resdence: 'residence',
  residance: 'residence',
  residensy: 'residency',
  residncy: 'residency',
  renawal: 'renewal',
  renual: 'renewal',
  renuwal: 'renewal',
  uplod: 'upload',
  uploud: 'upload'
}

const SECTION_PATTERNS = [
  {
    id: 'details',
    pattern: /service details|description|about the service/i
  },
  {
    id: 'requirements',
    pattern: /requirements|required documents|documents required/i
  },
  {
    id: 'eligibility',
    pattern: /eligibility|eligible|terms and conditions|conditions/i
  },
  {
    id: 'fees',
    pattern: /fees|service fee|cost/i
  },
  {
    id: 'completion',
    pattern: /expected completion|completion time|processing time/i
  },
  {
    id: 'channels',
    pattern: /availability|service channels|channels/i
  },
  {
    id: 'steps',
    pattern: /service steps|steps and procedures|procedure/i
  },
  {
    id: 'additional',
    pattern: /additional information|important information|notes/i
  }
]

let localCache = null
let localCacheLoadedAt = 0

const liveSearchCache = new Map()

function cleanText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function unique(values) {
  return [...new Set(values)]
}

function correctToken(token) {
  return COMMON_CORRECTIONS[token] || token
}

function tokenize(value) {
  return normalize(value)
    .map(correctToken)
    .filter(
      (token) =>
        token.length > 2 &&
        !STOP_WORDS.has(token)
    )
}

function expandTokens(tokens) {
  const expanded = []

  for (const token of tokens) {
    expanded.push(token)

    const synonyms =
      QUERY_SYNONYMS[token] || []

    expanded.push(...synonyms)
  }

  return unique(
    expanded.flatMap((value) =>
      tokenize(value)
    )
  )
}

function extractApplicationContext(message) {
  const application =
    message.match(
      /Application:\s*([^\n]+)/i
    )?.[1]?.trim() || ''

  const step =
    message.match(
      /Current step:\s*([^\n]+)/i
    )?.[1]?.trim() || ''

  const visibleDetails =
    message.match(
      /Visible requirements and labels:\s*([^\n]+)/i
    )?.[1]?.trim() || ''

  const question =
    message.split('\n')[0]?.trim() || ''

  return {
    application,
    step,
    visibleDetails,
    question
  }
}

function createSearchQuery(message) {
  const context =
    extractApplicationContext(message)

  const applicationTokens =
    expandTokens(
      tokenize(context.application)
    )

  const questionTokens =
    expandTokens(
      tokenize(context.question)
    )

  const detailTokens =
    expandTokens(
      tokenize(context.visibleDetails)
    )

  const selected = unique([
    ...applicationTokens,
    ...questionTokens,
    ...detailTokens
  ]).slice(0, 14)

  return selected.join(' ')
}

function editDistance(left, right) {
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index
  )

  for (
    let leftIndex = 1;
    leftIndex <= left.length;
    leftIndex++
  ) {
    let diagonal = previous[0]

    previous[0] = leftIndex

    for (
      let rightIndex = 1;
      rightIndex <= right.length;
      rightIndex++
    ) {
      const saved =
        previous[rightIndex]

      previous[rightIndex] =
        Math.min(
          previous[rightIndex] + 1,
          previous[rightIndex - 1] + 1,
          diagonal +
            (
              left[leftIndex - 1] ===
              right[rightIndex - 1]
                ? 0
                : 1
            )
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

  if (
    left.length < 4 ||
    right.length < 4
  ) {
    return 0
  }

  const distance =
    editDistance(left, right)

  const similarity =
    1 -
    distance /
      Math.max(
        left.length,
        right.length
      )

  return similarity >= 0.72
    ? similarity
    : 0
}

function createTrigrams(value) {
  const normalized =
    `  ${cleanText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')}  `

  const grams = new Set()

  for (
    let index = 0;
    index < normalized.length - 2;
    index++
  ) {
    grams.add(
      normalized.slice(
        index,
        index + 3
      )
    )
  }

  return grams
}

function phraseSimilarity(left, right) {
  const leftGrams =
    createTrigrams(left)

  const rightGrams =
    createTrigrams(right)

  if (
    !leftGrams.size ||
    !rightGrams.size
  ) {
    return 0
  }

  let shared = 0

  for (const gram of leftGrams) {
    if (rightGrams.has(gram)) {
      shared++
    }
  }

  return (
    (2 * shared) /
    (
      leftGrams.size +
      rightGrams.size
    )
  )
}

function tokenCoverage(
  queryTokens,
  candidateTokens
) {
  if (!queryTokens.length) {
    return 0
  }

  let score = 0

  for (const queryToken of queryTokens) {
    let bestMatch = 0

    for (
      const candidateToken
      of candidateTokens
    ) {
      bestMatch = Math.max(
        bestMatch,
        wordSimilarity(
          queryToken,
          candidateToken
        )
      )

      if (bestMatch === 1) {
        break
      }
    }

    score += bestMatch
  }

  return score / queryTokens.length
}

function determineRequestedSection(
  message
) {
  const tokens = new Set(
    tokenize(message)
  )

  if (
    tokens.has('document') ||
    tokens.has('documents') ||
    tokens.has('paper') ||
    tokens.has('papers') ||
    tokens.has('passport')
  ) {
    return 'requirements'
  }

  if (
    tokens.has('fee') ||
    tokens.has('fees') ||
    tokens.has('cost') ||
    tokens.has('price')
  ) {
    return 'fees'
  }

  if (
    tokens.has('eligible') ||
    tokens.has('eligibility') ||
    tokens.has('qualify')
  ) {
    return 'eligibility'
  }

  if (
    tokens.has('time') ||
    tokens.has('processing') ||
    tokens.has('completion')
  ) {
    return 'completion'
  }

  if (
    tokens.has('apply') ||
    tokens.has('procedure') ||
    tokens.has('steps')
  ) {
    return 'steps'
  }

  if (
    tokens.has('where') ||
    tokens.has('channel') ||
    tokens.has('channels')
  ) {
    return 'channels'
  }

  return null
}

function scoreService(
  service,
  message
) {
  const context =
    extractApplicationContext(message)

  const queryTokens =
    expandTokens(tokenize(message))

  const titleTokens =
    expandTokens(
      tokenize(service.name)
    )

  const serviceTokens =
    expandTokens(
      tokenize(
        [
          service.name,
          ...(service.sections || [])
            .map(
              (section) =>
                section.text
            )
        ].join(' ')
      )
    )

  const applicationTitleScore =
    context.application
      ? phraseSimilarity(
          context.application,
          service.name
        ) * 5
      : 0

  const questionTitleScore =
    phraseSimilarity(
      context.question,
      service.name
    ) * 2.5

  const titleCoverage =
    tokenCoverage(
      queryTokens,
      titleTokens
    ) * 2

  const contentCoverage =
    tokenCoverage(
      queryTokens,
      serviceTokens
    )

  return (
    applicationTitleScore +
    questionTitleScore +
    titleCoverage +
    contentCoverage
  )
}

function scoreSection(
  service,
  section,
  message
) {
  const requestedSection =
    determineRequestedSection(message)

  const queryTokens =
    expandTokens(tokenize(message))

  const sectionTokens =
    expandTokens(
      tokenize(
        `${section.title} ${section.text}`
      )
    )

  const serviceScore =
    scoreService(service, message)

  const coverage =
    tokenCoverage(
      queryTokens,
      sectionTokens
    ) * 2

  const phraseScore =
    phraseSimilarity(
      message,
      `${service.name} ${section.title}`
    )

  const sectionTypeBonus =
    requestedSection &&
    requestedSection === section.id
      ? 2.5
      : 0

  return (
    serviceScore * 0.45 +
    coverage +
    phraseScore +
    sectionTypeBonus
  )
}

async function fetchHtml(url) {
  const controller =
    new AbortController()

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  )

  try {
    const response =
      await fetch(url, {
        signal: controller.signal,

        headers: {
          Accept: 'text/html',
          'User-Agent':
            'GDRFA-Application-Support/1.0'
        }
      })

    if (!response.ok) {
      throw new Error(
        `Official site returned ` +
          `${response.status}`
      )
    }

    return response.text()
  } finally {
    clearTimeout(timeout)
  }
}

function findSectionType(title) {
  for (
    const section
    of SECTION_PATTERNS
  ) {
    if (
      section.pattern.test(title)
    ) {
      return section.id
    }
  }

  return 'general'
}

function extractFollowingText(
  $,
  heading
) {
  const headingLevel =
    heading.tagName?.toLowerCase()

  let node = $(heading).next()
  let text = ''

  while (node.length) {
    const tagName =
      node.get(0)
        ?.tagName
        ?.toLowerCase()

    if (
      tagName &&
      /^h[2-6]$/.test(tagName)
    ) {
      break
    }

    text += ` ${node.text()}`
    node = node.next()
  }

  if (!text && headingLevel) {
    const parent = $(heading).parent()

    text = parent
      .text()
      .replace(
        $(heading).text(),
        ''
      )
  }

  return cleanText(text)
}

function extractOfficialService(
  url,
  html
) {
  const $ = cheerio.load(html)

  const name =
    cleanText(
      $('h1').first().text()
    ) ||
    cleanText(
      $('title').text()
    )

  const sections = []

  $('h2, h3, h4, h5, h6').each(
    (_, heading) => {
      const title =
        cleanText(
          $(heading).text()
        )

      if (!title) {
        return
      }

      const sectionType =
        SECTION_PATTERNS.find(
          (section) =>
            section.pattern.test(title)
        )

      if (!sectionType) {
        return
      }

      const text =
        extractFollowingText(
          $,
          heading
        )

      if (!text) {
        return
      }

      sections.push({
        id: sectionType.id,
        title,
        text: text.slice(0, 7000)
      })
    }
  )

  if (!sections.length) {
    const mainText =
      cleanText(
        $('#main-content, main')
          .first()
          .text()
      )

    if (mainText) {
      sections.push({
        id: 'general',
        title: 'Service information',
        text: mainText.slice(
          0,
          10000
        )
      })
    }
  }

  return {
    name,
    sourceUrl: url,
    sections
  }
}

async function loadLocalServices() {
  const now = Date.now()

  if (
    localCache &&
    now - localCacheLoadedAt <
      LOCAL_CACHE_TTL_MS
  ) {
    return localCache
  }

  try {
    const raw = await readFile(
      SCRAPED_DATA_PATH,
      'utf-8'
    )

    const parsed = JSON.parse(raw)

    if (
      !Array.isArray(
        parsed?.services
      )
    ) {
      return []
    }

    localCache =
      parsed.services.map(
        (service) => {
          const sections = []

          if (
            service.documents?.length
          ) {
            sections.push({
              id: 'requirements',
              title: 'Requirements',
              text:
                service.documents.join(
                  '\n'
                )
            })
          }

          if (
            service.feeBreakdown?.length
          ) {
            sections.push({
              id: 'fees',
              title: 'Fees',
              text:
                service.feeBreakdown
                  .map(
                    (fee) =>
                      `${fee.label}: ` +
                      `AED ${fee.amount}`
                  )
                  .join('\n')
            })
          }

          if (
            service
              .expectedCompletionHours
          ) {
            sections.push({
              id: 'completion',
              title:
                'Expected completion time',
              text:
                `${service.expectedCompletionHours} hour(s)`
            })
          }

          if (
            service.availability
          ) {
            sections.push({
              id: 'channels',
              title:
                'Service availability',
              text:
                service.availability
            })
          }

          if (
            service.additionalInfo
          ) {
            sections.push({
              id: 'additional',
              title:
                'Additional information',
              text:
                service.additionalInfo
            })
          }

          return {
            name: service.name,
            sourceUrl:
              service.sourceUrl,
            sections
          }
        }
      )

    localCacheLoadedAt = now

    return localCache
  } catch {
    return []
  }
}

async function searchOfficialWebsite(
  message
) {
  const query =
    createSearchQuery(message)

  if (!query) {
    return []
  }

  const cacheKey =
    query.toLowerCase()

  const cached =
    liveSearchCache.get(cacheKey)

  if (
    cached &&
    Date.now() - cached.loadedAt <
      LIVE_CACHE_TTL_MS
  ) {
    return cached.services
  }

  const searchUrl =
    `${GDRFA_ORIGIN}` +
    `/en/search-website?` +
    `search_api_fulltext=` +
    encodeURIComponent(query)

  const searchHtml =
    await fetchHtml(searchUrl)

  const $ =
    cheerio.load(searchHtml)

  const urls = []

  $('a[href*="/en/services/"]').each(
    (_, element) => {
      const href =
        $(element).attr('href')

      if (!href) {
        return
      }

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
        url.pathname.replace(
          /\/$/,
          ''
        )

      if (!urls.includes(normalized)) {
        urls.push(normalized)
      }
    }
  )

  const services = (
    await Promise.all(
      urls
        .slice(
          0,
          MAX_SEARCH_RESULTS
        )
        .map(async (url) => {
          try {
            const html =
              await fetchHtml(url)

            return extractOfficialService(
              url,
              html
            )
          } catch {
            return null
          }
        })
    )
  ).filter(
    (service) =>
      service?.name &&
      service.sections?.length
  )

  liveSearchCache.set(
    cacheKey,
    {
      loadedAt: Date.now(),
      services
    }
  )

  return services
}

function rankServices(
  services,
  message
) {
  return services
    .map((service) => ({
      service,
      score: scoreService(
        service,
        message
      )
    }))
    .sort(
      (left, right) =>
        right.score - left.score
    )
}

function rankSections(
  services,
  message
) {
  const ranked = []

  for (const service of services) {
    for (
      const section
      of service.sections
    ) {
      ranked.push({
        service,
        section,
        score: scoreSection(
          service,
          section,
          message
        )
      })
    }
  }

  return ranked.sort(
    (left, right) =>
      right.score - left.score
  )
}

function formatContext(
  rankedSections
) {
  let context = ''

  for (
    const result
    of rankedSections
  ) {
    const block =
      `Service: ` +
      `${result.service.name}\n` +
      `Section: ` +
      `${result.section.title}\n` +
      `Official URL: ` +
      `${result.service.sourceUrl}\n` +
      `${result.section.text}`

    if (
      context.length +
        block.length >
      MAX_CONTEXT_CHARACTERS
    ) {
      break
    }

    context += context
      ? `\n\n---\n\n${block}`
      : block
  }

  return context
}

export async function retrieveRelevantServices(
  message
) {
  const localServices =
    await loadLocalServices()

  let candidateServices = [
    ...localServices
  ]

  try {
    const liveServices =
      await searchOfficialWebsite(
        message
      )

    const servicesByUrl =
      new Map()

    for (
      const service
      of [
        ...localServices,
        ...liveServices
      ]
    ) {
      servicesByUrl.set(
        service.sourceUrl,
        service
      )
    }

    candidateServices = [
      ...servicesByUrl.values()
    ]
  } catch (error) {
    console.warn(
      'Official GDRFA search failed:',
      error.message
    )
  }

  if (!candidateServices.length) {
    return {
      available: false,
      confident: false,
      reason:
        'official-information-unavailable',
      confidence: 0,
      context: '',
      sources: []
    }
  }

  const rankedServices =
    rankServices(
      candidateServices,
      message
    )

  const bestService =
    rankedServices[0]

  if (
    !bestService ||
    bestService.score <
      MIN_SERVICE_SCORE
  ) {
    return {
      available: true,
      confident: false,
      reason:
        'no-confident-service-match',
      confidence:
        bestService?.score || 0,
      context: '',
      sources: []
    }
  }

  const qualifiedServices =
    rankedServices
      .filter(
        (result) =>
          result.score >=
          MIN_SERVICE_SCORE
      )
      .slice(0, 4)
      .map(
        (result) =>
          result.service
      )

  const rankedSections =
    rankSections(
      qualifiedServices,
      message
    )
      .filter(
        (result) =>
          result.score >=
          MIN_SECTION_SCORE
      )
      .slice(
        0,
        MAX_SELECTED_SECTIONS
      )

  if (!rankedSections.length) {
    return {
      available: true,
      confident: false,
      reason:
        'no-confident-section-match',
      confidence:
        bestService.score,
      context: '',
      sources: []
    }
  }

  const context =
    formatContext(
      rankedSections
    )

  const sources = unique(
    rankedSections.map(
      (result) =>
        result.service.sourceUrl
    )
  ).map((url) => {
    const result =
      rankedSections.find(
        (item) =>
          item.service.sourceUrl ===
          url
      )

    return {
      title:
        result.service.name,
      url
    }
  })

  const confidence =
    Math.min(
      1,
      rankedSections[0].score /
        5
    )

  return {
    available: true,
    confident: true,
    reason: 'matched',
    confidence,
    matchedService:
      bestService.service.name,
    context,
    sources
  }
}