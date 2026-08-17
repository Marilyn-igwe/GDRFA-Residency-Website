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
import {
  LanguageContext,
  buildLanguageContextValue
} from './language/LanguageContext'
import { useAccessibility } from './accessibility/AccessibilityContext'
import { AccessibilityWidget } from './accessibility/AccessibilityWidget'
import { ApplicationSupport } from './support/ApplicationSupport'
import './accessibility/accessibility.css'
import './app.css'

const LANG_CHOSEN_KEY = 'gdrfa_lang_chosen'
const LANG_CODE_KEY = 'gdrfa_lang_code'

export function App() {
  const [languageChosen, setLanguageChosen] = useState(
    () =>
      typeof window !== 'undefined' &&
      localStorage.getItem(LANG_CHOSEN_KEY) === '1'
  )

  const [langCode, setLangCode] = useState(
    () =>
      (typeof window !== 'undefined' &&
        localStorage.getItem(LANG_CODE_KEY)) ||
      'en'
  )

  const [showBooking, setShowBooking] = useState(false)

  const [view, setView] = useState('home')

  const [staffTab, setStaffTab] = useState(
    'humanitarian'
  )

  const t =
    translations[langCode] ||
    translations.en

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const lang = getLanguage(langCode)

    document.documentElement.lang =
      lang.code

    document.documentElement.dir =
      lang.dir
  }, [langCode])

  function handleLanguageConfirm(lang) {
    localStorage.setItem(
      LANG_CHOSEN_KEY,
      '1'
    )

    localStorage.setItem(
      LANG_CODE_KEY,
      lang.code
    )

    setLangCode(lang.code)
    setLanguageChosen(true)
  }

  function changeLanguage() {
    localStorage.removeItem(
      LANG_CHOSEN_KEY
    )

    setLanguageChosen(false)
  }

  if (!languageChosen) {
    return (
      <LanguageWelcomeScreen
        onConfirm={handleLanguageConfirm}
      />
    )
  }

  const goTo = (section) => {
    console.log(
      `Navigate to: ${section}`
    )
  }

  const viewAllServices = () => {
    console.log(
      'View all services clicked'
    )
  }

  const viewAllApplications = () => {
    console.log(
      'View all applications clicked'
    )
  }

  const contactGdrfa = () => {
    console.log(
      'Contact GDRFA clicked'
    )
  }

  const openFooterLink = (link) => {
    console.log(
      `Footer link clicked: ${link}`
    )
  }

  const openSearch = () => {
    console.log('Search opened')
  }

  const openNotifications = () => {
    console.log(
      'Notifications opened'
    )
  }

  const openChat = () => {
    window.dispatchEvent(
      new CustomEvent(
        'gdrfa:open-chat'
      )
    )
  }

  const openService = () => {
    setShowBooking(true)
  }

  function handleGoalNavigate(action) {
    if (
      action === 'visa' ||
      action === 'appointment'
    ) {
      setShowBooking(true)
      return
    }

    if (action === 'family') {
      setView('family')
      return
    }

    if (action === 'humanitarian') {
      setView('humanitarian')
      return
    }

    if (action === 'chat') {
      openChat()
      return
    }

    if (action === 'status') {
      const element =
        typeof document !== 'undefined' &&
        document.getElementById(
          'applications'
        )

      if (element) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        })
      }
    }
  }

  const langContextValue =
    buildLanguageContextValue(
      langCode
    )

  const {
    scale,
    highContrast
  } = useAccessibility()

  const appClass = [
    'app',

    scale !== 'normal'
      ? `gd-scale-${scale}`
      : '',

    highContrast
      ? 'gd-high-contrast'
      : ''
  ]
    .filter(Boolean)
    .join(' ')

  if (
    view === 'humanitarian' ||
    view === 'committee' ||
    view === 'family'
  ) {
    return (
      <LanguageContext.Provider
        value={langContextValue}
      >
        <div class={appClass}>
          <div class="government-header">
            <div class="government-logo">
              <img
                src={governmentLogo}
                alt="Government of Dubai"
              />
            </div>

            <div class="proud-uae-logo">
              <img
                src={proudUaeLogo}
                alt="Proud of UAE"
              />
            </div>

            <div class="gdrfa-logo">
              <img
                src={gdrfaLogo}
                alt="GDRFA Dubai"
              />
            </div>
          </div>

          <header class="header">
            <div class="header-inner">
              <button
                type="button"
                class="booking-back"
                style={{ margin: 0 }}
                onClick={() =>
                  setView('home')
                }
              >
                {t.backToDashboard}
              </button>
            </div>
          </header>

          {view === 'committee' && (
            <div class="staff-tab-bar">
              <button
                type="button"
                class={
                  staffTab ===
                  'humanitarian'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setStaffTab(
                    'humanitarian'
                  )
                }
              >
                {t.humanitarianTabLabel ||
                  'Humanitarian Cases'}
              </button>

              <button
                type="button"
                class={
                  staffTab === 'family'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setStaffTab('family')
                }
              >
                {t.familyTabLabel ||
                  'Family Applications'}
              </button>
            </div>
          )}

          {view === 'humanitarian' && (
            <HumanitarianCaseForm />
          )}

          {view === 'committee' &&
            staffTab ===
              'humanitarian' && (
              <CommitteeDashboard />
            )}

          {view === 'committee' &&
            staffTab === 'family' && (
              <FamilyCommitteeDashboard />
            )}

          {view === 'family' && (
            <FamilyApplicationFlow />
          )}

          {view === 'humanitarian' ? (
            <ChatWidget />
          ) : view === 'committee' ? (
            <EmployeeAssistant />
          ) : (
            <ChatWidget />
          )}

          {view !== 'committee' && (
            <ApplicationSupport />
          )}

          <AccessibilityWidget />
        </div>
      </LanguageContext.Provider>
    )
  }

  if (showBooking) {
    return (
      <LanguageContext.Provider
        value={langContextValue}
      >
        <div class={appClass}>
          <div class="government-header">
            <div class="government-logo">
              <img
                src={governmentLogo}
                alt="Government of Dubai"
              />
            </div>

            <div class="proud-uae-logo">
              <img
                src={proudUaeLogo}
                alt="Proud of UAE"
              />
            </div>

            <div class="gdrfa-logo">
              <img
                src={gdrfaLogo}
                alt="GDRFA Dubai"
              />
            </div>
          </div>

          <header class="header">
            <div class="header-inner">
              <button
                type="button"
                class="booking-back"
                style={{ margin: 0 }}
                onClick={() =>
                  setShowBooking(false)
                }
              >
                {t.backToDashboard}
              </button>
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
    <LanguageContext.Provider
      value={langContextValue}
    >
      <div class={appClass}>
        <div class="government-header">
          <div class="government-logo">
            <img
              src={governmentLogo}
              alt="Government of Dubai"
            />
          </div>

          <div class="proud-uae-logo">
            <img
              src={proudUaeLogo}
              alt="Proud of UAE"
            />
          </div>

          <div class="gdrfa-logo">
            <img
              src={gdrfaLogo}
              alt="GDRFA Dubai"
            />
          </div>
        </div>

        <header class="header">
          <div class="header-inner">
            <nav class="main-nav">
              <a
                class="active"
                href="#home"
                onClick={(event) => {
                  event.preventDefault()
                  goTo('home')
                }}
              >
                {t.nav.home}
              </a>

              <a
                href="#services"
                onClick={(event) => {
                  event.preventDefault()
                  setShowBooking(true)
                }}
              >
                {t.nav.services}
              </a>

              <a
                href="#applications"
                onClick={(event) => {
                  event.preventDefault()
                  goTo('applications')
                }}
              >
                {t.nav.applications}
              </a>

              <a
                href="#documents"
                onClick={(event) => {
                  event.preventDefault()
                  goTo('documents')
                }}
              >
                {t.nav.documents}
              </a>

              <a
                href="#contact"
                onClick={(event) => {
                  event.preventDefault()
                  goTo('contact')
                }}
              >
                {t.nav.contact}
              </a>
            </nav>

            <div class="header-actions">
              <button
                type="button"
                class="language-button"
                onClick={changeLanguage}
                aria-label="Change language"
              >
                {t.changeLanguage}
              </button>

              <button
                type="button"
                class="search-button"
                onClick={openSearch}
                aria-label={t.search}
              >
                ⌕
              </button>

              <button
                type="button"
                class="notification-button"
                onClick={
                  openNotifications
                }
                aria-label={
                  t.notifications
                }
              >
                ♧
              </button>

              <div class="profile">
                <div class="profile-avatar">
                  TA
                </div>

                <div>
                  <strong>
                    Tamreen Ahmed
                  </strong>

                  <span>
                    {t.myAccount}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <GoalHub
          t={t}
          onNavigate={
            handleGoalNavigate
          }
        />

        <section
          class="section"
          id="services"
        >
          <div class="section-heading">
            <div>
              <p class="section-label">
                {t.servicesLabel}
              </p>

              <h2>
                {t.servicesHeading}
              </h2>
            </div>

            <a
              href="#all-services"
              onClick={(event) => {
                event.preventDefault()
                viewAllServices()
              }}
            >
              {t.viewAllServices}
            </a>
          </div>

          <div class="service-grid">
            {t.services.map(
              (service) => (
                <div
                  class="service-card"
                  key={service.title}
                >
                  <div class="service-icon">
                    {service.icon}
                  </div>

                  <h3>
                    {service.title}
                  </h3>

                  <p>
                    {service.desc}
                  </p>

                  <span
                    onClick={() =>
                      openService(
                        service.title
                      )
                    }
                    role="button"
                    tabIndex={0}
                  >
                    {service.cta}
                  </span>
                </div>
              )
            )}
          </div>
        </section>

        <section
          class="section applications-section"
          id="applications"
        >
          <div class="section-heading">
            <div>
              <p class="section-label">
                {t.myServicesLabel}
              </p>

              <h2>
                {t.recentApplications}
              </h2>
            </div>

            <button
              type="button"
              class="outline-button"
              onClick={
                viewAllApplications
              }
            >
              {t.viewAllApplications}
            </button>
          </div>

          <div class="application-table">
            <div class="table-header">
              {t.tableHeaders.map(
                (header) => (
                  <span key={header}>
                    {header}
                  </span>
                )
              )}
            </div>

            {t.applications.map(
              (application) => (
                <div
                  class="application-row"
                  key={
                    application.ref
                  }
                >
                  <div>
                    <strong>
                      {
                        application.title
                      }
                    </strong>

                    <small>
                      {application.sub}
                    </small>
                  </div>

                  <span>
                    {application.ref}
                  </span>

                  <span>
                    {application.date}
                  </span>

                  <span
                    class={
                      `status ` +
                      application.statusClass
                    }
                  >
                    {
                      application.status
                    }
                  </span>
                </div>
              )
            )}
          </div>
        </section>

        <section class="information">
          <div>
            <p class="section-label">
              {t.needHelpLabel}
            </p>

            <h2>
              {t.needHelpHeading}
            </h2>

            <p>
              {t.needHelpDescription}
            </p>
          </div>

          <div class="information-buttons">
            <button
              type="button"
              onClick={openChat}
            >
              {t.askAiAssistant}
            </button>

            <button
              type="button"
              onClick={contactGdrfa}
            >
              {t.contactGdrfa}
            </button>
          </div>
        </section>

        <footer>
          <div class="footer-inner">
            <div>
              <strong>
                {t.footerName}
              </strong>

              <p>
                {t.footerDescription}
              </p>
            </div>

            <div class="footer-links">
              {t.footerLinks.map(
                (link) => (
                  <a
                    href="#"
                    key={link}
                    onClick={(event) => {
                      event.preventDefault()
                      openFooterLink(
                        link
                      )
                    }}
                  >
                    {link}
                  </a>
                )
              )}

              <a
                href="#committee"
                onClick={(event) => {
                  event.preventDefault()
                  setView('committee')
                }}
              >
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