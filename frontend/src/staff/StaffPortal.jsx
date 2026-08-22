import { useEffect, useState } from 'preact/hooks'
import governmentLogo from '../assets/government-dubai-logo.png'
import proudUaeLogo from '../assets/proud-of-uae-logo.png'
import gdrfaLogo from '../assets/gdrfa-logo.png'
import { StaffLogin } from './StaffLogin'
import { OverviewDashboard } from './OverviewDashboard'
import { AppointmentsDashboard } from './AppointmentsDashboard'
import { CommitteeDashboard } from '../humanitarian/CommitteeDashboard'
import { FamilyCommitteeDashboard } from '../family/FamilyCommitteeDashboard'
import { EmployeeAssistant } from '../assistant/EmployeeAssistant'
import { getStaffToken, clearStaffToken } from './auth'
import { logout as apiLogout } from './api'
import './staff.css'

export function StaffPortal() {
  const [authed, setAuthed] = useState(() => Boolean(getStaffToken()))
  const [staffTab, setStaffTab] = useState('overview') // 'overview' | 'appointments' | 'humanitarian' | 'family'
  const [appointmentsInitialStatus, setAppointmentsInitialStatus] = useState('')

  // Any staff API call that comes back 401 (bad/expired token, or the
  // server restarted and forgot every session) fires this — drop straight
  // back to the login screen instead of leaving a dead dashboard on screen.
  useEffect(() => {
    function handleUnauthorized() {
      setAuthed(false)
    }
    window.addEventListener('gdrfa:staff-unauthorized', handleUnauthorized)
    return () => window.removeEventListener('gdrfa:staff-unauthorized', handleUnauthorized)
  }, [])

  function handleLogout() {
    apiLogout()
    clearStaffToken()
    setAuthed(false)
    setStaffTab('overview')
  }

  if (!authed) {
    return <StaffLogin onSuccess={() => setAuthed(true)} />
  }

  return (
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
          <strong style={{ fontSize: '14px' }}>Staff Portal</strong>
          <button type="button" class="profile-logout" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div class="staff-tab-bar">
        <button type="button" class={staffTab === 'overview' ? 'active' : ''} onClick={() => setStaffTab('overview')}>
          Overview
        </button>
        <button
          type="button"
          class={staffTab === 'appointments' ? 'active' : ''}
          onClick={() => { setAppointmentsInitialStatus(''); setStaffTab('appointments') }}
        >
          Appointments
        </button>
        <button type="button" class={staffTab === 'humanitarian' ? 'active' : ''} onClick={() => setStaffTab('humanitarian')}>
          Humanitarian Cases
        </button>
        <button type="button" class={staffTab === 'family' ? 'active' : ''} onClick={() => setStaffTab('family')}>
          Family Applications
        </button>
      </div>

      {staffTab === 'overview' && (
        <OverviewDashboard
          onNavigate={(tab, status) => {
            if (tab === 'appointments') setAppointmentsInitialStatus(status || '')
            setStaffTab(tab)
          }}
        />
      )}
      {staffTab === 'appointments' && <AppointmentsDashboard initialStatus={appointmentsInitialStatus} />}
      {staffTab === 'humanitarian' && <CommitteeDashboard />}
      {staffTab === 'family' && <FamilyCommitteeDashboard />}

      <EmployeeAssistant />
    </div>
  )
}
