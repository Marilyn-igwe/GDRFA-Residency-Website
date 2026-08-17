import { useState, useEffect } from 'preact/hooks'
import governmentLogo from './assets/government-dubai-logo.png'
import proudUaeLogo from './assets/proud-of-uae-logo.png'
import gdrfaLogo from './assets/gdrfa-logo.png'
import { BookingFlow } from './booking/BookingFlow'
import { ChatWidget } from './chatbot/ChatWidget'
import { HumanitarianCaseForm } from './humanitarian/HumanitarianCaseForm'
import { CommitteeDashboard } from './humanitarian/CommitteeDashboard'
import { FamilyApplicationFlow } from './family/FamilyApplicationFlow'
import { FamilyCommitteeDashboard } from './family/FamilyCommitteeDashboard'
import { EmployeeAssistant } from './assistant/EmployeeAssistant'
import { GoalHub } from './components/GoalHub'
import { LanguageWelcomeScreen } from './language/LanguageWelcomeScreen'
import { getLanguage } from './language/languages'
import { translations } from './language/translations'
import { LanguageContext, buildLanguageContextValue } from './language/LanguageContext'
import { useAccessibility } from './accessibility/AccessibilityContext'
import { AccessibilityWidget } from './accessibility/AccessibilityWidget'
import { ApplicationSupport } from './support/ApplicationSupport'
import { UaePassGateway } from './uaepass/UaePassGateway'
import { UaePassBanner } from './uaepass/UaePassDocuments'
import { useUaePass } from './uaepass/UaePassContext'
import './accessibility/accessibility.css'
import './app.css'

const LANG_CHOSEN_KEY = 'gdrfa_lang_chosen'
const LANG_CODE_KEY = 'gdrfa_lang_code'
const PORTAL_KEY = 'gdrfa_uaepass_portal_entered'

export function App() {
  const { authenticated, profile, logout } = useUaePass()
  const [languageChosen, setLanguageChosen] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(LANG_CHOSEN_KEY) === '1'
  )
  const [langCode, setLangCode] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(LANG_CODE_KEY)) || 'en'
  )
  const [showBooking, setShowBooking] = useState(false)
  const [view, setView] = useState('home') // 'home' | 'humanitarian' | 'committee' | 'family'
  const [staffTab, setStaffTab] = useState('humanitarian') // 'humanitarian' | 'family' — which staff portal is showing
  const [portalEntered, setPortalEntered] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(PORTAL_KEY) === '1'
  )
  const t = translations[langCode] || translations.en

  // Keep <html lang="..."> and dir="ltr"/"rtl" in sync with the selected
  // language. This is what makes Arabic/Urdu actually flip to
  // right-to-left layout, and it also tells the browser accurately what
  // language is on screen (so nothing else — like Chrome's own translate
  // prompt — gets confused about it).
  useEffect(() => {
    if (typeof document === 'undefined') return
    const lang = getLanguage(langCode)
    document.documentElement.lang = lang.code
    document.documentElement.dir = lang.dir
  }, [langCode])

  function handleLanguageConfirm(lang) {
    localStorage.setItem(LANG_CHOSEN_KEY, '1')
    localStorage.setItem(LANG_CODE_KEY, lang.code)
    setLangCode(lang.code)
    setLanguageChosen(true)
  }

  function changeLanguage() {
    localStorage.removeItem(LANG_CHOSEN_KEY)
    setLanguageChosen(false)
  }

  function handleLogout() {
    logout()
    sessionStorage.removeItem(PORTAL_KEY)
    sessionStorage.removeItem('gdrfa_uaepass_welcome_seen')
    setPortalEntered(false)
    setShowBooking(false)
    setView('home')
  }

  if (!languageChosen) {
    return <LanguageWelcomeScreen onConfirm={handleLanguageConfirm} />
  }

  if (!authenticated || !portalEntered) {
    return (
      <UaePassGateway
        onComplete={() => {
          sessionStorage.setItem(PORTAL_KEY, '1')
          setPortalEntered(true)
        }}
        onBack={changeLanguage}
      />
    )
  }

  // Stub handlers — wire these up to real navigation/actions/API calls.
  const goTo = (section) => console.log(`Navigate to: ${section}`)
  const viewAllServices = () => console.log('View all services clicked')
  const viewAllApplications = () => console.log('View all applications clicked')
  const contactGdrfa = () => console.log('Contact GDRFA clicked')
  const openFooterLink = (link) => console.log(`Footer link clicked: ${link}`)
  const openSearch = () => console.log('Search opened')
  const openNotifications = () => console.log('Notifications opened')
  const openChat = () => window.dispatchEvent(new CustomEvent('gdrfa:open-chat'))

  const openService = () => setShowBooking(true)

  // Single entry point for every "goal" the person can pick from the
  // Goal Hub (including the resolved outcome of the "I'm Not Sure" flow).
  function handleGoalNavigate(action) {
    if (action === 'visa' || action === 'appointment') return setShowBooking(true)
    if (action === 'family') return setView('family')
    if (action === 'humanitarian') return setView('humanitarian')
    if (action === 'chat') return openChat()
    if (action === 'status') {
      const el = typeof document !== 'undefined' && document.getElementById('applications')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // Built once here and passed down via context so BookingFlow, ChatWidget,
  // HumanitarianCaseForm and CommitteeDashboard all see the same current
  // language without needing it threaded through as a prop everywhere.
  const langContextValue = buildLanguageContextValue(langCode)

  // Text size + high contrast are app-wide, driven by AccessibilityProvider
  // in main.jsx. Applied as classes on the single top-level .app wrapper
  // shared by every view below.
  const { scale, highContrast } = useAccessibility()
  const appClass = ['app', scale !== 'normal' ? `gd-scale-${scale}` : '', highContrast ? 'gd-high-contrast' : '']
    .filter(Boolean)
    .join(' ')

  if (view === 'humanitarian' || view === 'committee' || view === 'family') {
    return (
      <LanguageContext.Provider value={langContextValue}>
      <div class={appClass}>
        <div class="government-header">
          <div class="government-logo">
            <img src={governmentLogo} alt="Government of Dubai" />
          </div>
          <div class="proud-uae-logo">
            <img src={proudUaeLogo} alt="Proud of UAE" />
          </div>
          <div class="gdrfa-logo">
            <img src={gdrfaLogo} alt="GDRFA Dubai" />
          </div>
        </div>

        <header class="header">
          <div class="header-inner">
            <button type="button" class="booking-back" style={{ margin: 0 }} onClick={() => setView('home')}>
              {t.backToDashboard}
            </button>
            <button type="button" class="profile-logout" onClick={handleLogout}>Log out</button>
          </div>
        </header>

        {view === 'committee' && (
          <div class="staff-tab-bar">
            <button
              type="button"
              class={staffTab === 'humanitarian' ? 'active' : ''}
              onClick={() => setStaffTab('humanitarian')}
            >
              {t.humanitarianTabLabel || 'Humanitarian Cases'}
            </button>
            <button type="button" class={staffTab === 'family' ? 'active' : ''} onClick={() => setStaffTab('family')}>
              {t.familyTabLabel || 'Family Applications'}
            </button>
          </div>
        )}

        {view === 'humanitarian' && <HumanitarianCaseForm />}
        {view === 'committee' && staffTab === 'humanitarian' && <CommitteeDashboard />}
        {view === 'committee' && staffTab === 'family' && <FamilyCommitteeDashboard />}
        {view === 'family' && <FamilyApplicationFlow />}
        {view === 'humanitarian' ? <ChatWidget /> : view === 'committee' ? <EmployeeAssistant /> : <ChatWidget />}
        {view !== 'committee' && <ApplicationSupport />}
        <AccessibilityWidget />
      </div>
      </LanguageContext.Provider>
    )
  }

  if (showBooking) {
    return (
      <LanguageContext.Provider value={langContextValue}>
      <div class={appClass}>
        <div class="government-header">
          <div class="government-logo">
            <img src={governmentLogo} alt="Government of Dubai" />
          </div>
          <div class="proud-uae-logo">
            <img src={proudUaeLogo} alt="Proud of UAE" />
          </div>
          <div class="gdrfa-logo">
            <img src={gdrfaLogo} alt="GDRFA Dubai" />
          </div>
        </div>

        <header class="header">
          <div class="header-inner">
            <button type="button" class="booking-back" style={{ margin: 0 }} onClick={() => setShowBooking(false)}>
              {t.backToDashboard}
            </button>
            <button type="button" class="profile-logout" onClick={handleLogout}>Log out</button>
          </div>
        </header>

        <BookingFlow
          onSelectFamilyService={() => {
            setShowBooking(false)
            setView('family')
          }}
        />
        <ChatWidget />
        <ApplicationSupport />
        <AccessibilityWidget />
      </div>
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={langContextValue}>
    <div class={appClass}>
      {/* TOP GOVERNMENT BRANDING */}
      <div class="government-header">
        <div class="government-logo">
          <img src={governmentLogo} alt="Government of Dubai" />
        </div>
        <div class="proud-uae-logo">
          <img src={proudUaeLogo} alt="Proud of UAE" />
        </div>
        <div class="gdrfa-logo">
          <img src={gdrfaLogo} alt="GDRFA Dubai" />
        </div>
      </div>

      {/* NAVIGATION */}
      <header class="header">
        <div class="header-inner">
          <nav class="main-nav">
            <a class="active" href="#home" onClick={(e) => { e.preventDefault(); goTo('home') }}>{t.nav.home}</a>
            <a href="#services" onClick={(e) => { e.preventDefault(); setShowBooking(true) }}>{t.nav.services}</a>
            <a href="#applications" onClick={(e) => { e.preventDefault(); goTo('applications') }}>{t.nav.applications}</a>
            <a href="#documents" onClick={(e) => { e.preventDefault(); goTo('documents') }}>{t.nav.documents}</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); goTo('contact') }}>{t.nav.contact}</a>
          </nav>

          <div class="header-actions">
            <button type="button" class="language-button" onClick={changeLanguage} aria-label="Change language">
              {t.changeLanguage}
            </button>

            <button type="button" class="search-button" onClick={openSearch} aria-label={t.search}>⌕</button>

            <button type="button" class="notification-button" onClick={openNotifications} aria-label={t.notifications}>♧</button>

            <div class="profile">
              <div class="profile-avatar">{profile?.initials || 'UA'}</div>
              <div>
                <strong>{profile?.fullNameEnglish || 'UAE PASS User'}</strong>
                <span>{t.myAccount}</span>
              </div>
              <button type="button" class="profile-logout" onClick={handleLogout}>Log out</button>
            </div>
          </div>
        </div>
      </header>

      {/* GOAL HUB — the single "what do you want to do" landing moment,
          replacing the old hero + quick-actions combo so the very first
          thing a person sees is one clear question, not four things at
          once. */}
      <div style={{ padding: '0 7vw' }}><UaePassBanner /></div>
      <GoalHub t={t} onNavigate={handleGoalNavigate} />

      {/* SERVICES */}
      <section class="section" id="services">
        <div class="section-heading">
          <div>
            <p class="section-label">{t.servicesLabel}</p>
            <h2>{t.servicesHeading}</h2>
          </div>

          <a href="#all-services" onClick={(e) => { e.preventDefault(); viewAllServices() }}>{t.viewAllServices}</a>
        </div>

        <div class="service-grid">
          {t.services.map((service) => (
            <div class="service-card" key={service.title}>
              <div class="service-icon">{service.icon}</div>
              <h3>{service.title}</h3>
              <p>{service.desc}</p>
              <span onClick={() => openService(service.title)} role="button" tabIndex={0}>
                {service.cta}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* APPLICATIONS */}
      <section class="section applications-section" id="applications">
        <div class="section-heading">
          <div>
            <p class="section-label">{t.myServicesLabel}</p>
            <h2>{t.recentApplications}</h2>
          </div>

          <button type="button" class="outline-button" onClick={viewAllApplications}>{t.viewAllApplications}</button>
        </div>

        <div class="application-table">
          <div class="table-header">
            {t.tableHeaders.map((h) => (
              <span key={h}>{h}</span>
            ))}
          </div>

          {t.applications.map((app) => (
            <div class="application-row" key={app.ref}>
              <div>
                <strong>{app.title}</strong>
                <small>{app.sub}</small>
              </div>
              <span>{app.ref}</span>
              <span>{app.date}</span>
              <span class={`status ${app.statusClass}`}>{app.status}</span>
            </div>
          ))}
        </div>
      </section>

      {/* HELP */}
      <section class="information">
        <div>
          <p class="section-label">{t.needHelpLabel}</p>
          <h2>{t.needHelpHeading}</h2>
          <p>{t.needHelpDescription}</p>
        </div>

        <div class="information-buttons">
          <button type="button" onClick={openChat}>{t.askAiAssistant}</button>
          <button type="button" onClick={contactGdrfa}>{t.contactGdrfa}</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div class="footer-inner">
          <div>
            <strong>{t.footerName}</strong>
            <p>{t.footerDescription}</p>
          </div>

          <div class="footer-links">
            {t.footerLinks.map((link) => (
              <a href="#" key={link} onClick={(e) => { e.preventDefault(); openFooterLink(link) }}>
                {link}
              </a>
            ))}
            <a href="#committee" onClick={(e) => { e.preventDefault(); setView('committee') }}>
              {t.committeePortal}
            </a>
          </div>
        </div>
      </footer>

      <ChatWidget />
      <AccessibilityWidget />
    </div>
    </LanguageContext.Provider>
  )
}
