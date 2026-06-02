import { useState, useEffect } from 'react'

const API = 'http://localhost:8000/api'
const MAX_SAFE_HOURS = 200

function WearGauge({ pct }) {
  const color = pct < 50 ? '#a8e063' : pct < 75 ? '#f9ca24' : '#ff4757'
  return (
    <div className="pd-gauge-wrap">
      <div className="pd-gauge-bar-bg">
        <div
          className="pd-gauge-bar-fill"
          style={{ width: `${pct}%`, background: color, transition: 'width 0.8s ease' }}
        />
      </div>
      <span className="pd-gauge-label" style={{ color }}>
        {pct.toFixed(0)}% Wear
      </span>
    </div>
  )
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="pd-stat-card">
      <div className="pd-stat-value" style={{ color: accent || 'var(--color-text-primary)' }}>{value}</div>
      <div className="pd-stat-label">{label}</div>
      {sub && <div className="pd-stat-sub">{sub}</div>}
    </div>
  )
}

function PaddockCard({ paddock, selected, onClick }) {
  const isGrazing = paddock.current_state === 'grazing'
  return (
    <div
      className={`pd-card ${selected ? 'selected' : ''} ${isGrazing ? 'grazing' : ''}`}
      onClick={onClick}
    >
      <div className="pd-card-header">
        <span className="pd-card-name">{paddock.name}</span>
        <span className={`pd-badge ${isGrazing ? 'badge-grazing' : 'badge-ready'}`}>
          {isGrazing ? '🌿 Grazing' : '✅ Ready'}
        </span>
      </div>
      <WearGauge pct={(paddock.total_season_hours / MAX_SAFE_HOURS) * 100} />
    </div>
  )
}

function SessionLedger({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return <div className="pd-empty">No sessions recorded yet.</div>
  }
  const sorted = [...sessions].sort((a, b) => new Date(b.start_time) - new Date(a.start_time)).slice(0, 10)
  return (
    <table className="pd-ledger">
      <thead>
        <tr>
          <th>Date</th>
          <th>Start</th>
          <th>End</th>
          <th>Duration</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map(s => {
          const start = new Date(s.start_time)
          const end = s.actual_end_time ? new Date(s.actual_end_time) : null
          const dur = end ? ((end - start) / 60000).toFixed(0) + ' min' : '—'
          return (
            <tr key={s.id}>
              <td>{start.toLocaleDateString()}</td>
              <td>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td>{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
              <td>{dur}</td>
              <td>
                <span className={`pd-badge ${s.status === 'active' ? 'badge-grazing' : 'badge-ready'}`}>
                  {s.status}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function IncidentLog({ incidents }) {
  if (!incidents || incidents.length === 0) {
    return <div className="pd-empty">No incidents reported.</div>
  }
  const sorted = [...incidents].sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at))
  return (
    <div className="pd-incident-list">
      {sorted.map(inc => (
        <div key={inc.id} className={`pd-incident-row ${inc.resolved ? 'resolved' : ''}`}>
          <span className="pd-incident-icon">{inc.resolved ? '✅' : '⚠️'}</span>
          <span className="pd-incident-type">{inc.issue_type}</span>
          <span className="pd-incident-date">{new Date(inc.reported_at).toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

export default function Paddocks() {
  const [paddocks, setPaddocks] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [seasonLoading, setSeasonLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchPaddocks = async () => {
    try {
      const res = await fetch(`${API}/paddocks/`)
      const data = await res.json()
      setPaddocks(data)
      if (!selectedId && data.length > 0) setSelectedId(data[0].id)
    } catch (e) { /* ignore */ }
  }

  const fetchDetail = async (id) => {
    if (!id) return
    setDetailLoading(true)
    try {
      const res = await fetch(`${API}/paddocks/${id}`)
      setDetail(await res.json())
    } catch (e) { /* ignore */ }
    setDetailLoading(false)
  }

  useEffect(() => {
    fetchPaddocks().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchDetail(selectedId)
  }, [selectedId])

  const handleRelease = async () => {
    setActionLoading(true)
    try {
      await fetch(`${API}/paddocks/${selectedId}/release`, { method: 'POST' })
      showToast('Horses released to paddock.')
      fetchDetail(selectedId)
      fetchPaddocks()
    } catch { showToast('Failed', 'error') }
    setActionLoading(false)
  }

  const handleLock = async () => {
    setActionLoading(true)
    try {
      await fetch(`${API}/paddocks/${selectedId}/lock`, { method: 'POST' })
      showToast('Gates locked. Session recorded.')
      fetchDetail(selectedId)
      fetchPaddocks()
    } catch { showToast('Failed', 'error') }
    setActionLoading(false)
  }

  const handleSeasonToggle = async (fast) => {
    setSeasonLoading(true)
    try {
      await fetch(`${API}/paddocks/${selectedId}/season?fast_growth=${fast}`, { method: 'POST' })
      showToast(fast ? '🌧️ Monsoon (fast-growth) mode on. Rest days cut by 20%.' : '☀️ Dry season mode. Standard rest days.')
      fetchDetail(selectedId)
    } catch { showToast('Failed', 'error') }
    setSeasonLoading(false)
  }

  const isMonsoon = detail?.season_multiplier === 0.8
  const isGrazing = detail?.current_state === 'grazing'

  return (
    <div className="pd-root">
      {toast && <div className={`gm-toast ${toast.type}`}>{toast.msg}</div>}

      <div className="topbar">
        <div>
          <div className="topbar-title">Paddock Telemetry</div>
          <div className="topbar-meta">{paddocks.length} paddocks · Owner view</div>
        </div>
      </div>

      <div className="pd-layout">
        {/* LEFT: Paddock Grid */}
        <div className="pd-sidebar">
          <div className="pd-sidebar-title">All Paddocks</div>
          {loading ? (
            <div className="pd-empty">Loading…</div>
          ) : (
            paddocks.map(p => (
              <PaddockCard
                key={p.id}
                paddock={p}
                selected={selectedId === p.id}
                onClick={() => setSelectedId(p.id)}
              />
            ))
          )}
        </div>

        {/* RIGHT: Detail Panel */}
        <div className="pd-detail">
          {detailLoading && <div className="pd-empty">Loading detail…</div>}
          {!detailLoading && detail && (
            <>
              {/* Header */}
              <div className="pd-detail-header">
                <div>
                  <h2 className="pd-detail-title">{detail.name}</h2>
                  <span className={`pd-badge large ${isGrazing ? 'badge-grazing' : 'badge-ready'}`}>
                    {isGrazing ? '🌿 Grazing In Progress' : '✅ Ready'}
                  </span>
                </div>
                <div className="pd-action-btns">
                  {!isGrazing ? (
                    <button className="btn-primary" onClick={handleRelease} disabled={actionLoading}>
                      🔓 Release Horses
                    </button>
                  ) : (
                    <button className="btn-danger" onClick={handleLock} disabled={actionLoading}>
                      🔒 Lock Gates
                    </button>
                  )}
                </div>
              </div>

              {/* Stat Grid */}
              <div className="pd-stats-grid">
                <StatCard
                  label="Season Wear"
                  value={`${detail.total_season_hours?.toFixed(1)}h`}
                  sub={`of ${MAX_SAFE_HOURS}h max`}
                  accent={detail.wear_pct > 75 ? '#ff4757' : '#a8e063'}
                />
                <StatCard
                  label="Days Since Last Graze"
                  value={detail.days_since_last_graze != null ? `${detail.days_since_last_graze}d` : '—'}
                  sub="actual rest"
                />
                <StatCard
                  label="Required Rest Period"
                  value={`${detail.effective_rest_days}d`}
                  sub={isMonsoon ? '🌧️ Fast-growth adjusted' : '☀️ Standard'}
                  accent={isMonsoon ? '#74b9ff' : undefined}
                />
                <StatCard
                  label="Days Until Ready"
                  value={detail.days_until_ready != null
                    ? (detail.days_until_ready === 0 ? 'NOW ✅' : `${detail.days_until_ready}d`)
                    : '—'}
                  accent={detail.days_until_ready === 0 ? '#a8e063' : undefined}
                />
              </div>

              {/* Wear gauge */}
              <div className="pd-section">
                <div className="pd-section-title">Pasture Wear Gauge</div>
                <WearGauge pct={detail.wear_pct ?? 0} />
                <p className="pd-section-hint">
                  Accumulated grazing hours for this season. Exceeding 200h risks topsoil degradation.
                </p>
              </div>

              {/* Season Toggle */}
              <div className="pd-section">
                <div className="pd-section-title">Rest-Period Season Mode</div>
                <p className="pd-section-hint">
                  During West Java monsoon, tropical grass recovers 20% faster. Toggle to cut required rest days automatically.
                </p>
                <div className="pd-season-btns">
                  <button
                    className={`pd-season-btn ${!isMonsoon ? 'active' : ''}`}
                    onClick={() => handleSeasonToggle(false)}
                    disabled={seasonLoading}
                  >
                    ☀️ Dry Season (25d)
                  </button>
                  <button
                    className={`pd-season-btn monsoon ${isMonsoon ? 'active' : ''}`}
                    onClick={() => handleSeasonToggle(true)}
                    disabled={seasonLoading}
                  >
                    🌧️ Monsoon / Fast Growth (20d)
                  </button>
                </div>
              </div>

              {/* Grazing Session Ledger */}
              <div className="pd-section">
                <div className="pd-section-title">Session Ledger</div>
                <SessionLedger sessions={detail.sessions} />
              </div>

              {/* Incident Log */}
              <div className="pd-section">
                <div className="pd-section-title">Maintenance Incidents</div>
                <IncidentLog incidents={detail.incidents} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
