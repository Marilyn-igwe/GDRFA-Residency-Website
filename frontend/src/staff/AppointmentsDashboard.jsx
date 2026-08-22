import { useEffect, useMemo, useState } from 'preact/hooks'
import { listAppointments, updateAppointmentStatus, getCenters, getServices } from './api'
import './staff.css'

const STATUS_LABELS = {
  confirmed: 'Confirmed',
  completed: 'Completed',
  no_show: 'No-show',
  cancelled: 'Cancelled'
}

const STATUS_ACTIONS = {
  confirmed: [
    { to: 'completed', label: 'Mark completed' },
    { to: 'no_show', label: 'Mark no-show' },
    { to: 'cancelled', label: 'Cancel' }
  ],
  completed: [{ to: 'confirmed', label: 'Reopen' }],
  no_show: [{ to: 'confirmed', label: 'Reopen' }],
  cancelled: [{ to: 'confirmed', label: 'Restore' }]
}

export function AppointmentsDashboard({ initialStatus }) {
  const [appointments, setAppointments] = useState([])
  const [centers, setCenters] = useState([])
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)
  const [updating, setUpdating] = useState(false)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus || '')
  const [centerFilter, setCenterFilter] = useState('')
  const [serviceFilter, setServiceFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    getCenters().then(setCenters).catch(() => {})
    getServices().then(setServices).catch(() => {})
  }, [])

  function refresh() {
    setLoading(true)
    setError(null)
    listAppointments({
      status: statusFilter,
      centerId: centerFilter,
      serviceId: serviceFilter,
      date: dateFilter,
      q: search.trim()
    })
      .then((data) => {
        setAppointments(data)
        // Keep the open detail panel in sync if that row is still in the
        // filtered results (e.g. after a status change).
        if (selected) {
          const stillThere = data.find((a) => a.reference === selected.reference)
          setSelected(stillThere || null)
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }

  // Debounced so free-text search doesn't fire a request per keystroke.
  useEffect(() => {
    const timeout = setTimeout(refresh, 250)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, centerFilter, serviceFilter, dateFilter])

  const todayCount = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return appointments.filter((a) => a.date === today).length
  }, [appointments])

  async function handleStatusChange(reference, status) {
    setUpdating(true)
    try {
      const updated = await updateAppointmentStatus(reference, status)
      setAppointments((prev) => prev.map((a) => (a.reference === reference ? updated : a)))
      setSelected((prev) => (prev?.reference === reference ? updated : prev))
    } catch (e) {
      setError(e.message)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div class="st-dashboard">
      <div class="st-dashboard-header">
        <h2>Appointments</h2>
        <p class="st-intro">
          {appointments.length} shown{dateFilter ? ` for ${dateFilter}` : ''} · {todayCount} today
        </p>
      </div>

      <div class="st-filter-bar">
        <input
          type="text"
          placeholder="Search name, email, phone or reference…"
          value={search}
          onInput={(e) => setSearch(e.target.value)}
        />

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <select value={centerFilter} onChange={(e) => setCenterFilter(e.target.value)}>
          <option value="">All centers</option>
          {centers.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
          <option value="">All services</option>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <input type="date" value={dateFilter} onInput={(e) => setDateFilter(e.target.value)} />

        {(search || statusFilter || centerFilter || serviceFilter || dateFilter) && (
          <button
            type="button"
            class="st-clear-filters"
            onClick={() => {
              setSearch('')
              setStatusFilter('')
              setCenterFilter('')
              setServiceFilter('')
              setDateFilter('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <p class="st-error">{error}</p>}
      {loading && <p class="st-hint">Loading…</p>}

      <div class="st-dashboard-body">
        <div class="st-case-list">
          {appointments.length === 0 && !loading && <p class="st-hint">No appointments match these filters.</p>}
          {appointments.map((a) => (
            <button
              type="button"
              key={a.reference}
              class={`st-case-row ${selected?.reference === a.reference ? 'selected' : ''}`}
              onClick={() => setSelected(a)}
            >
              <div class="st-case-row-top">
                <strong>{a.customerName}</strong>
                <span class={`st-status-tag st-status-${a.status}`}>{STATUS_LABELS[a.status]}</span>
              </div>
              <span class="st-case-row-category">{a.serviceName} · {a.tierName || 'Standard'}</span>
              <span class="st-case-row-ref">{a.centerName} · {a.date} {a.time}</span>
              <span class="st-case-row-ref">{a.reference}</span>
            </button>
          ))}
        </div>

        <div class="st-case-detail">
          {!selected && <p class="st-hint">Select an appointment to view details and update its status.</p>}

          {selected && (
            <>
              <div class="st-detail-header">
                <div>
                  <h3>{selected.customerName}</h3>
                  <span class="st-hint">{selected.customerEmail} · {selected.reference}</span>
                </div>
                <span class={`st-status-tag st-status-${selected.status}`}>{STATUS_LABELS[selected.status]}</span>
              </div>

              <div class="st-detail-grid">
                <div>
                  <strong>Service</strong>
                  <p>{selected.serviceName}</p>
                </div>
                <div>
                  <strong>Tier</strong>
                  <p>{selected.tierName || 'Standard'} {selected.feeAed ? `· ${selected.feeAed} AED` : ''}</p>
                </div>
                <div>
                  <strong>Center</strong>
                  <p>{selected.centerName}</p>
                </div>
                <div>
                  <strong>Date &amp; time</strong>
                  <p>{selected.date} at {selected.time}</p>
                </div>
                <div>
                  <strong>Phone</strong>
                  <p>{selected.customerPhone || '—'}</p>
                </div>
                <div>
                  <strong>Booked on</strong>
                  <p>{new Date(selected.createdAt).toLocaleString()}</p>
                </div>
              </div>

              <div class="st-detail-section">
                <strong>Update status</strong>
                <div class="st-action-row">
                  {(STATUS_ACTIONS[selected.status] || []).map((action) => (
                    <button
                      type="button"
                      key={action.to}
                      class="st-action-button"
                      disabled={updating}
                      onClick={() => handleStatusChange(selected.reference, action.to)}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
