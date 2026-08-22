import { useEffect, useState } from 'preact/hooks'
import { getOverview } from './api'
import './staff.css'

export function OverviewDashboard({ onNavigate }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  function refresh() {
    setLoading(true)
    getOverview()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    refresh()
    // Keep the numbers fresh without staff needing to remember to refresh —
    // this is the first thing a shift lead sees each morning.
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) return <div class="st-dashboard"><p class="st-hint">Loading overview…</p></div>
  if (error) return <div class="st-dashboard"><p class="st-error">{error}</p></div>
  if (!data) return null

  const busiestCenters = [...data.centers]
    .sort((a, b) => b.appointmentsToday - a.appointmentsToday)
    .slice(0, 6)

  return (
    <div class="st-dashboard">
      <div class="st-dashboard-header">
        <h2>Staff Overview</h2>
        <p class="st-intro">Live numbers across appointments, family applications and humanitarian cases.</p>
      </div>

      <div class="st-stat-grid">
        <button type="button" class="st-stat-card" onClick={() => onNavigate?.('appointments')}>
          <span class="st-stat-label">Appointments today</span>
          <strong class="st-stat-value">{data.appointments.today}</strong>
          <span class="st-stat-sub">{data.appointments.total} total on file</span>
        </button>

        <button type="button" class="st-stat-card" onClick={() => onNavigate?.('appointments', 'confirmed')}>
          <span class="st-stat-label">Confirmed</span>
          <strong class="st-stat-value">{data.appointments.confirmed}</strong>
          <span class="st-stat-sub">awaiting the visit</span>
        </button>

        <button type="button" class="st-stat-card" onClick={() => onNavigate?.('appointments', 'completed')}>
          <span class="st-stat-label">Completed</span>
          <strong class="st-stat-value">{data.appointments.completed}</strong>
          <span class="st-stat-sub">served so far</span>
        </button>

        <button type="button" class="st-stat-card" onClick={() => onNavigate?.('appointments', 'no_show')}>
          <span class="st-stat-label">No-shows</span>
          <strong class="st-stat-value">{data.appointments.noShow}</strong>
          <span class="st-stat-sub">missed appointments</span>
        </button>

        <button type="button" class="st-stat-card" onClick={() => onNavigate?.('appointments', 'cancelled')}>
          <span class="st-stat-label">Cancelled</span>
          <strong class="st-stat-value">{data.appointments.cancelled}</strong>
        </button>

        <div class="st-stat-card st-stat-card-static">
          <span class="st-stat-label">Revenue on file</span>
          <strong class="st-stat-value">{data.appointments.revenueAed.toLocaleString()} AED</strong>
          <span class="st-stat-sub">confirmed + completed</span>
        </div>

        <button type="button" class="st-stat-card" onClick={() => onNavigate?.('family')}>
          <span class="st-stat-label">Family applications</span>
          <strong class="st-stat-value">{data.familyApplications.pending}</strong>
          <span class="st-stat-sub">of {data.familyApplications.total} need review</span>
        </button>

        <button type="button" class="st-stat-card" onClick={() => onNavigate?.('humanitarian')}>
          <span class="st-stat-label">Humanitarian cases</span>
          <strong class="st-stat-value">{data.humanitarianCases.pending}</strong>
          <span class="st-stat-sub">of {data.humanitarianCases.total} need review</span>
        </button>
      </div>

      <div class="st-section">
        <h3>Busiest centers today</h3>
        {busiestCenters.every((c) => c.appointmentsToday === 0) ? (
          <p class="st-hint">No appointments scheduled for today yet.</p>
        ) : (
          <div class="st-center-list">
            {busiestCenters.map((c) => (
              <div class="st-center-row" key={c.id}>
                <span>{c.name}</span>
                <div class="st-center-bar-track">
                  <div
                    class="st-center-bar-fill"
                    style={{
                      width: `${Math.min(
                        100,
                        (c.appointmentsToday / Math.max(1, busiestCenters[0].appointmentsToday)) * 100
                      )}%`
                    }}
                  />
                </div>
                <strong>{c.appointmentsToday}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
