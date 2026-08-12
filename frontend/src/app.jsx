import { useState, useEffect } from 'preact/hooks'
import governmentLogo from './assets/government-dubai-logo.png'
import proudUaeLogo from './assets/proud-of-uae-logo.png'
import gdrfaLogo from './assets/gdrfa-logo.png'
import { BookingFlow } from './booking/BookingFlow'
import { ChatWidget } from './chatbot/ChatWidget'
import { HumanitarianCaseForm } from './humanitarian/HumanitarianCaseForm'
import { CommitteeDashboard } from './humanitarian/CommitteeDashboard'
import { EmployeeAssistant } from './assistant/EmployeeAssistant'
import { GoalHub } from './components/GoalHub'
import { LanguageWelcomeScreen } from './language/LanguageWelcomeScreen'
import { getLanguage } from './language/languages'
import { translations } from './language/translations'
import { LanguageContext, buildLanguageContextValue } from './language/LanguageContext'
import './app.css'

const LANG_CHOSEN_KEY = 'gdrfa_lang_chosen'
const LANG_CODE_KEY = 'gdrfa_lang_code'

export function App() {
  const [languageChosen, setLanguageChosen] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem(LANG_CHOSEN_KEY) === '1'
  )
  const [langCode, setLangCode] = useState(
    () => (typeof window !== 'undefined' && localStorage.getItem(LANG_CODE_KEY)) || 'en'
  )
  const [showBooking, setShowBooking] = useState(false)
  const [view, setView] = useState('home') // 'home' | 'humanitarian' | 'committee'
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

  if (!languageChosen) {
    return <LanguageWelcomeScreen onConfirm={handleLanguageConfirm} />
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
    if (action === 'visa' || action === 'appointment' || action === 'family') return setShowBooking(true)
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

  if (view === 'humanitarian' || view === 'committee') {
    return (
      <LanguageContext.Provider value={langContextValue}>
      <div class="app">
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
          </div>
        </header>

        {view === 'humanitarian' ? <HumanitarianCaseForm /> : <CommitteeDashboard />}
        {view === 'humanitarian' ? <ChatWidget /> : <EmployeeAssistant />}
      </div>
      </LanguageContext.Provider>
    )
  }

  if (showBooking) {
    return (
      <LanguageContext.Provider value={langContextValue}>
      <div class="app">
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
          </div>
        </header>

        <BookingFlow />
        <ChatWidget />
      </div>
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={langContextValue}>
    <div class="app">
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
              <div class="profile-avatar">TA</div>
              <div>
                <strong>Tamreen Ahmed</strong>
                <span>{t.myAccount}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* GOAL HUB — the single "what do you want to do" landing moment,
          replacing the old hero + quick-actions combo so the very first
          thing a person sees is one clear question, not four things at
          once. */}
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
    </div>
    </LanguageContext.Provider>
  )
}