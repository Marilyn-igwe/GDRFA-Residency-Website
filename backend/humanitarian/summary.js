/**
 * Produces a short, structured recap of a case for the committee to scan
 * quickly — purely factual (what was submitted, what's missing), never
 * an opinion on the case's merits or a recommendation. This is the
 * "summarizes the case so the committee can review it faster" piece —
 * it saves reading time, it doesn't pre-judge the outcome.
 */
export function generateCaseSummary({ categoryName, applicantName, documentsProvided, readiness, statement }) {
  const providedCount = readiness.missingDocuments
    ? (documentsProvided?.length || 0)
    : documentsProvided?.length || 0
  const totalRequired = providedCount + (readiness.missingDocuments?.length || 0)

  const documentLine =
    readiness.missingDocuments.length === 0
      ? `All ${totalRequired} required documents provided.`
      : `${providedCount} of ${totalRequired} required documents provided. Missing: ${readiness.missingDocuments.join(', ')}.`

  const statementLine = readiness.wordCount >= readiness.minStatementWords
    ? `Statement provided (${readiness.wordCount} words, meets the ${readiness.minStatementWords}-word minimum).`
    : `Statement is short (${readiness.wordCount} of ${readiness.minStatementWords} words minimum) — may need follow-up before review.`

  const statementPreview = (statement || '').trim().slice(0, 220)
  const previewLine = statementPreview
    ? `Statement preview: "${statementPreview}${statement.trim().length > 220 ? '…' : ''}"`
    : 'No statement text provided yet.'

  return [
    `${applicantName} — ${categoryName} case, ${readiness.readinessPercent}% complete.`,
    documentLine,
    statementLine,
    previewLine,
  ].join(' ')
}
