import { getCategory } from './categories.js'

function countWords(text) {
  return (text || '').trim().split(/\s+/).filter(Boolean).length
}

/**
 * Evaluates how ready a case is for committee review. This is
 * deliberately mechanical: it checks presence/completeness of required
 * items, never the substance or merit of the case itself. The output is
 * meant to save reviewers time on administrative triage, not to replace
 * their judgment about the case.
 */
export function assessReadiness({ categoryId, documentsProvided = [], statement = '' }) {
  const category = getCategory(categoryId)
  if (!category) {
    throw new Error('Unknown category')
  }

  const missingDocuments = category.requiredDocuments.filter(
    (docName) => !documentsProvided.includes(docName)
  )
  const presentDocuments = category.requiredDocuments.filter((docName) =>
    documentsProvided.includes(docName)
  )

  const wordCount = countWords(statement)
  const statementOk = wordCount >= category.minStatementWords

  const totalItems = category.requiredDocuments.length + 1 // +1 for the statement
  const completeItems = presentDocuments.length + (statementOk ? 1 : 0)
  const readinessPercent = Math.round((completeItems / totalItems) * 100)

  const flags = missingDocuments.map((d) => `Missing document: ${d}`)
  if (!statementOk) {
    flags.push(`Statement needs at least ${category.minStatementWords} words (currently ${wordCount})`)
  }

  const note =
    readinessPercent === 100
      ? 'All required documents and a qualifying statement are present. This case is ready for committee review.'
      : `${flags.length} item${flags.length === 1 ? '' : 's'} still ${flags.length === 1 ? 'needs' : 'need'} attention before this case is ready for committee review.`

  return {
    categoryId,
    categoryName: category.name,
    readinessPercent,
    missingDocuments,
    flags,
    note,
    wordCount,
    minStatementWords: category.minStatementWords,
  }
}
