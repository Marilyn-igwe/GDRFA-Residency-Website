import { useState } from 'preact/hooks'
import { login } from './api'
import governmentLogo from '../assets/government-dubai-logo.png'
import gdrfaLogo from '../assets/gdrfa-logo.png'
import './staff.css'

export function StaffLogin({ onSuccess }) {
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!passcode.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      await login(passcode.trim())
      onSuccess()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div class="st-login-screen">
      <form class="st-login-card" onSubmit={handleSubmit}>
        <div class="st-login-logos">
          <img src={governmentLogo} alt="Government of Dubai" />
          <img src={gdrfaLogo} alt="GDRFA Dubai" />
        </div>
        <h1>Staff Portal</h1>
        <p class="st-login-sub">Enter the staff passcode to continue.</p>

        <input
          type="password"
          autoFocus
          value={passcode}
          onInput={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          class="st-login-input"
        />

        {error && <p class="st-error">{error}</p>}

        <button type="submit" class="st-login-button" disabled={submitting || !passcode.trim()}>
          {submitting ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
