import { randomBytes } from 'crypto'

// Simple shared-passcode auth for the staff portal. Not per-user, no
// password hashing/database — one passcode staff share, exchanged for a
// bearer token that's kept in memory here. Good enough to keep the portal
// off of casual/unauthenticated access; NOT proper multi-user auth. If
// this ever handles real applicant data in production, replace this with
// real staff accounts + a real auth provider.
const STAFF_PASSCODE = process.env.STAFF_PASSCODE || 'gdrfa-staff-2026'

if (!process.env.STAFF_PASSCODE) {
  console.log(`No STAFF_PASSCODE set — using default staff passcode: ${STAFF_PASSCODE}`)
}

// Tokens live in memory only — restarting the server signs everyone out.
// That's an acceptable trade-off here (no persistence layer for sessions)
// and means a fresh deploy never inherits a stale token.
const activeTokens = new Set()

export function issueToken() {
  const token = randomBytes(24).toString('hex')
  activeTokens.add(token)
  return token
}

export function checkPasscode(passcode) {
  return typeof passcode === 'string' && passcode === STAFF_PASSCODE
}

export function revokeToken(token) {
  activeTokens.delete(token)
}

export function requireStaffAuth(req, res, next) {
  const token = req.get('x-staff-token')
  if (token && activeTokens.has(token)) return next()
  res.status(401).json({ error: 'Staff sign-in required' })
}
