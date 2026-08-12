import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_FILE = path.join(__dirname, 'cases.json')

function load() {
  if (!existsSync(DB_FILE)) {
    writeFileSync(DB_FILE, JSON.stringify({ cases: [] }, null, 2))
    return { cases: [] }
  }
  return JSON.parse(readFileSync(DB_FILE, 'utf-8'))
}

function save(store) {
  writeFileSync(DB_FILE, JSON.stringify(store, null, 2))
}

export function generateCaseReference() {
  const year = new Date().getFullYear()
  const rand = Math.floor(10000 + Math.random() * 90000)
  return `HCASE-${year}-${rand}`
}

export function createCase(caseRecord) {
  const store = load()
  store.cases.push(caseRecord)
  save(store)
  return caseRecord
}

export function getCase(reference) {
  const store = load()
  return store.cases.find((c) => c.reference === reference) || null
}

// Sorted least-complete-first so incomplete submissions surface early for
// committee follow-up — see CommitteeDashboard's intro copy.
export function listCases() {
  const store = load()
  return [...store.cases].sort((a, b) => a.readiness.readinessPercent - b.readiness.readinessPercent)
}

export function updateCase(reference, { status, committeeNotes }) {
  const store = load()
  const record = store.cases.find((c) => c.reference === reference)
  if (!record) return null
  if (status !== undefined) record.status = status
  if (committeeNotes !== undefined) record.committeeNotes = committeeNotes
  save(store)
  return record
}
