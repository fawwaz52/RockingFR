import { useState, useEffect, useRef } from 'react'

const API = 'http://localhost:8000/api'
const GRAZING_MINUTES = 120

const ISSUE_OPTIONS = [
  'Fence Wire Broken',
  'Mud / Soil Slip',
  'Water Chute Blocked',
  'Gate Lock Damaged',
  'Tree / Branch Fallen',
]

function CountdownCircle({ minutesRemaining }) {
  const total = GRAZING_MINUTES
  const pct = Math.max(0, Math.min(1, minutesRemaining / total))
  const r = 70
  const circ = 2 * Math.PI * r
  const dash = circ * pct
  const gap = circ - dash

  const mins = Math.floor(minutesRemaining)
  const secs = Math.floor((minutesRemaining - mins) * 60)
  const urgent = minutesRemaining < 15

  return (
    <div className="gm-circle-wrapper">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="90" cy="90" r={r}
          fill="none"
          stroke={urgent ? '#ff4444' : '#a8e063'}
          strokeWidth="10"
          strokeDasharray={`${dash} ${gap}`}
          strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }}
        />
      </svg>
      <div className="gm-circle-label">
        <span className="gm-circle-time" style={{ color: urgent ? '#ff4444' : '#a8e063' }}>
          {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </span>
        <span className="gm-circle-sub">remaining</span>
      </div>
    </div>
  )
}

export default function GroomMobile() {
  const [paddocks, setPaddocks] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [issueOpen, setIssueOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const tickRef = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchPaddocks = async () => {
    try {
      const res = await fetch(`${API}/paddocks/`)
      const data = await res.json()
      setPaddocks(data)
      if (!selected && data.length > 0) setSelected(data[0].id)
    } catch (e) { /* ignore */ }
  }

  const fetchDetail = async (id) => {
    if (!id) return
    try {
      const res = await fetch(`${API}/paddocks/${id}`)
      setDetail(await res.json())
    } catch (e) { /* ignore */ }
  }

  useEffect(() => {
    fetchPaddocks()
  }, [])

  useEffect(() => {
    if (selected) {
      setLoading(true)
      fetchDetail(selected).finally(() => setLoading(false))
    }
  }, [selected])

  // Tick every second to drain the countdown locally for smooth UI
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setDetail(prev => {
        if (!prev || prev.minutes_remaining == null) return prev
        const updated = prev.minutes_remaining - (1 / 60)
        if (updated <= 0) {
          // Auto-lock when time runs out
          handleLock(true)
          return { ...prev, minutes_remaining: 0 }
        }
        return { ...prev, minutes_remaining: updated }
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  const handleRelease = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/paddocks/${selected}/release`, { method: 'POST' })
      const data = await res.json()
      setDetail(data)
      showToast('🐴 Horses released! Gate open.')
    } catch { showToast('Failed to release', 'error') }
    setActionLoading(false)
  }

  const handleLock = async (auto = false) => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/paddocks/${selected}/lock`, { method: 'POST' })
      const data = await res.json()
      setDetail(data)
      showToast(auto ? '⏰ Grazing time up — gates locked.' : '🔒 Gates locked! Horses back in.')
    } catch { showToast('Failed to lock', 'error') }
    setActionLoading(false)
  }

  const handleIssue = async (issue) => {
    setIssueOpen(false)
    try {
      await fetch(`${API}/paddocks/${selected}/incident`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue_type: issue })
      })
      showToast(`⚠️ "${issue}" reported.`)
    } catch { showToast('Failed to report issue', 'error') }
  }

  const isGrazing = detail?.current_state === 'grazing'
  const isReady = detail?.current_state === 'ready'

  return (
    <div className="gm-root">
      {/* Toast */}
      {toast && (
        <div className={`gm-toast ${toast.type}`}>{toast.msg}</div>
      )}

      {/* Header */}
      <div className="gm-header">
        <span className="gm-brand">🐎 StableOS</span>
        <span className="gm-role-badge">GROOM</span>
      </div>

      {/* Paddock Selector */}
      <div className="gm-paddock-strip">
        {paddocks.map(p => (
          <button
            key={p.id}
            className={`gm-paddock-chip ${selected === p.id ? 'active' : ''}`}
            onClick={() => setSelected(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>

      {loading && <div className="gm-loading">Loading paddock data…</div>}

      {detail && (
        <>
          {/* Countdown circle — only when grazing */}
          <div className="gm-countdown-area">
            {isGrazing && detail.minutes_remaining != null ? (
              <CountdownCircle minutesRemaining={detail.minutes_remaining} />
            ) : (
              <div className="gm-status-idle">
                <span className="gm-idle-icon">✅</span>
                <span className="gm-idle-text">Gates Locked · Ready</span>
                {detail.days_until_ready != null && detail.days_until_ready > 0 && (
                  <span className="gm-idle-rest">Rest: {detail.days_until_ready}d remaining</span>
                )}
              </div>
            )}
          </div>

          {/* THE BIG ACTION BUTTON */}
          <div className="gm-action-area">
            {isReady ? (
              <button
                className="gm-big-btn release"
                onClick={handleRelease}
                disabled={actionLoading}
              >
                <span className="gm-btn-icon">🔓</span>
                <span className="gm-btn-text">RELEASE HORSES</span>
              </button>
            ) : (
              <button
                className={`gm-big-btn lock ${actionLoading ? '' : 'flash'}`}
                onClick={() => handleLock()}
                disabled={actionLoading}
              >
                <span className="gm-btn-icon">🔒</span>
                <span className="gm-btn-text">LOCK GATES &amp; BOOT OUT</span>
              </button>
            )}
          </div>

          {/* Report Issue */}
          <div className="gm-report-area">
            <button className="gm-report-btn" onClick={() => setIssueOpen(o => !o)}>
              ⚠️ Report an Issue
            </button>
            {issueOpen && (
              <div className="gm-issue-list">
                {ISSUE_OPTIONS.map(opt => (
                  <button key={opt} className="gm-issue-item" onClick={() => handleIssue(opt)}>
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* State badge */}
          <div className="gm-state-footer">
            <span className={`gm-state-dot ${isGrazing ? 'grazing' : 'ready'}`} />
            <span className="gm-state-label">
              {isGrazing ? 'GRAZING IN PROGRESS' : 'PADDOCK READY'}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
