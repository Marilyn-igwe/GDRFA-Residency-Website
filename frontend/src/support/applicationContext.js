import {
  useEffect
} from 'preact/hooks'

const CONTEXT_EVENT =
  'gdrfa:application-context'

let currentContext = null

function cleanValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return ''
  }

  return String(value)
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanStringArray(values) {
  if (!Array.isArray(values)) {
    return []
  }

  return values
    .map(cleanValue)
    .filter(Boolean)
    .slice(0, 30)
}

function sanitizeContext(context) {
  return {
    contextId:
      cleanValue(
        context?.contextId
      ) || 'application',

    applicationType:
      cleanValue(
        context?.applicationType
      ),

    serviceId:
      cleanValue(
        context?.serviceId
      ),

    serviceName:
      cleanValue(
        context?.serviceName
      ),

    stepId:
      cleanValue(
        context?.stepId
      ),

    stepName:
      cleanValue(
        context?.stepName
      ),

    selectedCategory:
      cleanValue(
        context?.selectedCategory
      ),

    selectedApplicant:
      cleanValue(
        context?.selectedApplicant
      ),

    requiredDocuments:
      cleanStringArray(
        context?.requiredDocuments
      ),

    missingDocuments:
      cleanStringArray(
        context?.missingDocuments
      ),

    visibleErrors:
      cleanStringArray(
        context?.visibleErrors
      ),

    acceptedFileTypes:
      cleanStringArray(
        context?.acceptedFileTypes
      ),

    maximumFileSize:
      cleanValue(
        context?.maximumFileSize
      )
  }
}

function dispatchContext(context) {
  if (
    typeof window === 'undefined'
  ) {
    return
  }

  window.dispatchEvent(
    new CustomEvent(
      CONTEXT_EVENT,
      {
        detail: context
      }
    )
  )
}

export function getApplicationContext() {
  return currentContext
}

export function clearApplicationContext(
  contextId
) {
  if (
    currentContext?.contextId !==
    contextId
  ) {
    return
  }

  currentContext = null
  dispatchContext(null)
}

export function usePublishApplicationContext(
  context
) {
  const serialized =
    JSON.stringify(
      sanitizeContext(context)
    )

  useEffect(() => {
    const sanitized =
      JSON.parse(serialized)

    currentContext = sanitized
    dispatchContext(sanitized)

    return () => {
      clearApplicationContext(
        sanitized.contextId
      )
    }
  }, [serialized])
}

export function subscribeToApplicationContext(
  callback
) {
  if (
    typeof window === 'undefined'
  ) {
    return () => {}
  }

  function handleContext(event) {
    callback(
      event.detail || null
    )
  }

  window.addEventListener(
    CONTEXT_EVENT,
    handleContext
  )

  return () => {
    window.removeEventListener(
      CONTEXT_EVENT,
      handleContext
    )
  }
}