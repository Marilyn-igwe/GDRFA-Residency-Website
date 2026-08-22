const TOKEN_KEY = 'gdrfa_staff_token'

export function getStaffToken() {
  return typeof window !== 'undefined' ? sessionStorage.getItem(TOKEN_KEY) : null
}

export function setStaffToken(token) {
  if (typeof window !== 'undefined') sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearStaffToken() {
  if (typeof window !== 'undefined') sessionStorage.removeItem(TOKEN_KEY)
}

// Every staff-protected fetch call includes this header. The backend
// rejects it with 401 if missing/invalid/expired (e.g. the server
// restarted, which clears all sessions).
export function staffAuthHeaders() {
  const token = getStaffToken()
  return token ? { 'x-staff-token': token } : {}
}

// Dispatched whenever a staff API call comes back 401 so the portal shell
// can drop back to the login screen — used instead of threading a
// "log out" callback through every dashboard component.
export function notifyStaffUnauthorized() {
  clearStaffToken()
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gdrfa:staff-unauthorized'))
  }
}
