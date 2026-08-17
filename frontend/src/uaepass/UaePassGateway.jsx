import { useEffect, useMemo, useState } from 'preact/hooks'
import governmentLogo from '../assets/government-dubai-logo.png'
import gdrfaLogo from '../assets/gdrfa-logo.png'
import { useUaePass } from './UaePassContext'
import './uaepass.css'
import './uaepass-login.css'

function randomCode() {
  return String(Math.floor(10 + Math.random() * 90))
}

function Shield() {
  return <svg class="up-shield" viewBox="0 0 40 46" aria-hidden="true"><path d="M20 2 36 8v12c0 11-6.7 19.3-16 24C10.7 39.3 4 31 4 20V8L20 2Z" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="m13 23 4.2 4.2L28 16.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
}

function Fingerprint() {
  return (
    <svg class="up-fingerprint" viewBox="0 0 96 112" aria-hidden="true">
      <path d="M19 44c7-24 49-30 61 1M13 58c0-45 70-52 76-9M25 62c0-31 48-34 51-5M35 66c0-18 28-21 31-3M47 63c8 0 10 7 9 15-1 11 4 19 12 24M36 76c0 15 5 26 15 33M24 68c-1 20 5 34 18 43M67 70c0 13 5 20 14 25" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
      <path d="M26 83c2 8 5 14 10 20" fill="none" stroke="#00b979" stroke-width="5" stroke-linecap="round"/>
      <path d="M57 94c3 6 7 10 12 13" fill="none" stroke="#ef4355" stroke-width="5" stroke-linecap="round"/>
    </svg>
  )
}

export function UaePassGateway({ onComplete, onBack }) {
  const { profiles, profile, authenticated, availableDocuments, authenticate, shareDocuments, logout } = useUaePass()
  const [screen, setScreen] = useState(authenticated ? 'success' : 'welcome')
  const [profileId, setProfileId] = useState(profile?.id || profiles[0].id)
  const [code, setCode] = useState(randomCode)
  const [selectedDocuments, setSelectedDocuments] = useState([])
  const [identifier, setIdentifier] = useState('')

  useEffect(() => {
    setSelectedDocuments(availableDocuments.map((item) => item.id))
  }, [availableDocuments])

  const selectedProfile = useMemo(
    () => profiles.find((item) => item.id === profileId) || profiles[0],
    [profileId, profiles]
  )

  function begin() {
    setIdentifier('')
    setScreen('login')
  }

  function requestApproval(event) {
    event?.preventDefault()
    if (!identifier.trim()) return
    const typed = identifier.trim().toLowerCase()
    const selected = profiles.find((item) =>
      item.fullNameEnglish.toLowerCase() === typed ||
      item.email.toLowerCase() === typed
    )
    const index = identifier.trim().length % profiles.length
    setProfileId(selected?.id || profiles[index].id)
    setCode(randomCode())
    setScreen('approval')
  }

  function approve() {
    authenticate(profileId)
    setScreen('consent')
  }

  function finishConsent() {
    shareDocuments(selectedDocuments)
    setScreen('success')
  }

  function changeAccount() {
    logout()
    setScreen('login')
  }

  return (
    <div class="up-page">
      <header class="up-header">
        <img src={governmentLogo} alt="Government of Dubai" />
        <img src={gdrfaLogo} alt="GDRFA Dubai" />
      </header>

      <main class="up-main">
        {screen === 'welcome' && (
          <section class="up-card">
            <div class="up-brand"><Shield /><div><strong>UAE PASS</strong><span>Secure digital identity</span></div></div>
            <p class="up-eyebrow">SECURE ACCESS</p>
            <h1>Continue to GDRFA services</h1>
            <p class="up-lead">Sign in securely and use your available information to complete applications faster.</p>
            <button class="up-primary up-pass-button" type="button" onClick={begin}><Shield />Continue with UAE PASS</button>
            <button class="up-link" type="button" onClick={onBack}>Back to language selection</button>
          </section>
        )}

        {screen === 'login' && (
          <section class="up-card up-login-card">
            <div class="up-uae-accent" />
            <Fingerprint />
            <h1>Login to UAE PASS</h1>
            <form class="up-login-form" onSubmit={requestApproval}>
              <input
                type="text"
                value={identifier}
                onInput={(event) => setIdentifier(event.target.value)}
                placeholder="Emirates ID, email, or phone eg. 971500000000"
                autocomplete="off"
                aria-label="Emirates ID, email, or phone"
                autoFocus
              />
              <label class="up-remember"><input type="checkbox" defaultChecked />Remember me</label>
              <div class="up-account-options" aria-label="Select an account">
                {profiles.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    class={profileId === item.id ? 'selected' : ''}
                    onClick={() => {
                      setProfileId(item.id)
                      setIdentifier(item.email)
                    }}
                  >
                    <span class="up-avatar">{item.initials}</span>
                    <span><strong>{item.fullNameEnglish}</strong><small>{item.profileType}</small></span>
                  </button>
                ))}
              </div>
              <button class="up-login-button" type="submit" disabled={!identifier.trim()}>Login</button>
            </form>
            <div class="up-account-links"><span>Don’t have UAE PASS account?</span><button type="button">Create new account</button></div>
            <button class="up-recover" type="button">Recover your account</button>
            <button class="up-link" type="button" onClick={() => setScreen('welcome')}>Back</button>
          </section>
        )}

        {false && screen === 'profile' && (
          <section class="up-card">
            <button class="up-back" type="button" onClick={() => setScreen('welcome')}>Back</button>
            <p class="up-eyebrow">UAE PASS</p>
            <h1>Select an account</h1>
            <p class="up-lead">Choose the identity to use for this session.</p>
            <div class="up-profile-list">
              {profiles.map((item) => (
                <button type="button" key={item.id} class={`up-profile ${profileId === item.id ? 'selected' : ''}`} onClick={() => setProfileId(item.id)}>
                  <span class="up-avatar">{item.initials}</span>
                  <span><strong>{item.fullNameEnglish}</strong><small>{item.profileType}</small></span>
                  <span class="up-radio" />
                </button>
              ))}
            </div>
            <button class="up-primary" type="button" onClick={requestApproval}>Continue</button>
          </section>
        )}

        {screen === 'approval' && (
          <section class="up-card up-centered">
            <div class="up-phone"><Shield /></div>
            <p class="up-eyebrow">APPROVE SIGN IN</p>
            <h1>Check your UAE PASS app</h1>
            <p class="up-lead">Open UAE PASS on your mobile device and select the matching number.</p>
            <div class="up-code" aria-label={`Matching code ${code}`}>{code}</div>
            <div class="up-request"><span class="up-avatar">{selectedProfile.initials}</span><div><strong>{selectedProfile.fullNameEnglish}</strong><small>Sign-in request sent</small></div></div>
            <button class="up-primary" type="button" onClick={approve}>I approved the request</button>
            <button class="up-link" type="button" onClick={() => setScreen('login')}>Cancel</button>
          </section>
        )}

        {screen === 'consent' && profile && (
          <section class="up-card">
            <p class="up-eyebrow">INFORMATION SHARING</p>
            <h1>Continue with your information</h1>
            <p class="up-lead">GDRFA will use the selected information and documents to complete relevant parts of your application.</p>
            <div class="up-consent-profile"><span class="up-avatar">{profile.initials}</span><div><strong>{profile.fullNameEnglish}</strong><small>{profile.email}</small></div></div>
            <h2 class="up-section-title">Available documents</h2>
            <div class="up-doc-list">
              {availableDocuments.map((document) => (
                <label class="up-doc" key={document.id}>
                  <input type="checkbox" checked={selectedDocuments.includes(document.id)} onChange={() => setSelectedDocuments((current) => current.includes(document.id) ? current.filter((id) => id !== document.id) : [...current, document.id])} />
                  <span><strong>{document.title}</strong><small>Available through UAE PASS</small></span>
                </label>
              ))}
            </div>
            <button class="up-primary" type="button" onClick={finishConsent}>Allow and continue</button>
          </section>
        )}

        {screen === 'success' && profile && (
          <section class="up-card up-centered">
            <div class="up-success">✓</div>
            <p class="up-eyebrow">AUTHENTICATION SUCCESSFUL</p>
            <h1>Welcome, {profile.fullNameEnglish.split(' ')[0]}</h1>
            <p class="up-lead">Your information is ready and will be used to prefill relevant application fields.</p>
            <div class="up-stats"><div><strong>10</strong><span>profile fields available</span></div><div><strong>{selectedDocuments.length || availableDocuments.length}</strong><span>documents available</span></div></div>
            <button class="up-primary" type="button" onClick={onComplete}>Continue to services</button>
            <button class="up-link" type="button" onClick={changeAccount}>Use another account</button>
          </section>
        )}
      </main>
    </div>
  )
}
