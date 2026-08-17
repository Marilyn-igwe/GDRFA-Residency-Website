import { createContext } from 'preact'
import { useCallback, useContext, useMemo, useState } from 'preact/hooks'

const UaePassContext = createContext(null)
const SESSION_KEY = 'gdrfa_uaepass_session'

const profiles = [
  {
    id: 'marilyn', initials: 'MI', profileType: 'Resident',
    fullNameEnglish: 'Marilyn Igwe', fullNameArabic: 'مارلين إيغوي',
    emiratesId: '784-XXXX-XXXXXXX-X', nationality: 'Nigeria',
    dateOfBirth: '1994-05-18', gender: 'Female', mobileNumber: '+971 50 XXX XXXX',
    email: 'marilyn@example.test', passportNumber: 'PXXXXXXX', passportExpiry: '2029-02-11',
    address: { emirate: 'Dubai', area: 'Al Barsha' },
    documentIds: ['emirates-id', 'passport', 'residence']
  },
  {
    id: 'tamreen', initials: 'TA', profileType: 'Family sponsor',
    fullNameEnglish: 'Tamreen Ahmed', fullNameArabic: 'تمرين أحمد',
    emiratesId: '784-XXXX-XXXXXXX-X', nationality: 'Bangladesh',
    dateOfBirth: '1988-09-24', gender: 'Male', mobileNumber: '+971 55 XXX XXXX',
    email: 'tamreen@example.test', passportNumber: 'AXXXXXXX', passportExpiry: '2028-11-03',
    address: { emirate: 'Dubai', area: 'Al Nahda' },
    documentIds: ['emirates-id', 'passport', 'residence', 'salary-certificate']
  },
  {
    id: 'blen', initials: 'BN', profileType: 'Resident',
    fullNameEnglish: 'Blen Nima', fullNameArabic: 'بلين نيما',
    emiratesId: '784-XXXX-XXXXXXX-X', nationality: 'Ethiopia',
    dateOfBirth: '1996-03-09', gender: 'Female', mobileNumber: '+971 52 XXX XXXX',
    email: 'blen@example.test', passportNumber: 'BXXXXXXX', passportExpiry: '2030-06-20',
    address: { emirate: 'Dubai', area: 'Bur Dubai' },
    documentIds: ['emirates-id', 'passport', 'residence']
  }
]

const documents = [
  { id: 'emirates-id', title: 'Emirates ID', fileName: 'Emirates ID digital copy', expiresOn: '2028-05-17', aliases: ['emirates id', 'identity card', 'eid'] },
  { id: 'passport', title: 'Passport copy', fileName: 'Passport digital copy', expiresOn: '2029-02-11', aliases: ['passport', 'passport copy', 'copy of passport', 'passport page'] },
  { id: 'residence', title: 'Residence information', fileName: 'Residence permit information', expiresOn: '2028-05-17', aliases: ['residence', 'residence permit', 'residency', 'visa copy'] },
  { id: 'salary-certificate', title: 'Salary certificate', fileName: 'Salary certificate', expiresOn: '2026-11-01', aliases: ['salary certificate', 'proof of salary', 'salary letter'] }
]

function initialSession() {
  if (typeof window === 'undefined') return null
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) } catch { return null }
}

function normalize(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function UaePassProvider({ children }) {
  const [session, setSessionState] = useState(initialSession)

  const saveSession = useCallback((next) => {
    setSessionState(next)
    if (typeof window !== 'undefined') {
      if (next) sessionStorage.setItem(SESSION_KEY, JSON.stringify(next))
      else sessionStorage.removeItem(SESSION_KEY)
    }
  }, [])

  const profile = useMemo(
    () => profiles.find((item) => item.id === session?.profileId) || null,
    [session?.profileId]
  )

  const availableDocuments = useMemo(
    () => documents.filter((item) => profile?.documentIds.includes(item.id)),
    [profile]
  )

  const sharedDocuments = useMemo(
    () => availableDocuments.filter((item) => session?.sharedDocumentIds?.includes(item.id)),
    [availableDocuments, session?.sharedDocumentIds]
  )

  const authenticate = useCallback((profileId) => {
    saveSession({
      profileId,
      authenticated: true,
      sharedDocumentIds: [],
      authenticatedAt: new Date().toISOString()
    })
  }, [saveSession])

  const shareDocuments = useCallback((ids) => {
    saveSession({ ...session, sharedDocumentIds: ids })
  }, [saveSession, session])

  const matchDocument = useCallback((requirement) => {
    const requested = normalize(requirement)
    return sharedDocuments.find((document) =>
      [document.title, ...document.aliases].some((name) => {
        const candidate = normalize(name)
        return requested.includes(candidate) || candidate.includes(requested)
      })
    ) || null
  }, [sharedDocuments])

  const logout = useCallback(() => saveSession(null), [saveSession])

  const value = useMemo(() => ({
    profiles,
    session,
    profile,
    authenticated: Boolean(session?.authenticated && profile),
    availableDocuments,
    sharedDocuments,
    authenticate,
    shareDocuments,
    matchDocument,
    logout
  }), [session, profile, availableDocuments, sharedDocuments, authenticate, shareDocuments, matchDocument, logout])

  return <UaePassContext.Provider value={value}>{children}</UaePassContext.Provider>
}

export function useUaePass() {
  const context = useContext(UaePassContext)
  if (!context) throw new Error('useUaePass must be used inside UaePassProvider')
  return context
}
