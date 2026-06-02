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

const COLOR_LABELS = {
  vibrant_green: { label: 'Vibrant Green', dot: '#56ab2f' },
  pale_green:    { label: 'Pale Green',    dot: '#a8e063' },
  yellow:        { label: 'Yellowing',     dot: '#f9ca24' },
  brown:         { label: 'Brown / Dry',   dot: '#b8860b' },
  muddy:         { label: 'Muddy',         dot: '#7f5539' },
}

const RISK_COLORS = { low: '#a8e063', medium: '#f9ca24', high: '#ff4757' }

// ---------- Countdown Circle ----------
function CountdownCircle({ minutesRemaining }) {
  const r = 70, circ = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, minutesRemaining / GRAZING_MINUTES))
  const dash = circ * pct
  const mins = Math.floor(minutesRemaining)
  const secs = Math.floor((minutesRemaining - mins) * 60)
  const urgent = minutesRemaining < 15
  return (
    <div className="gm-circle-wrapper">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <circle cx="90" cy="90" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
        <circle cx="90" cy="90" r={r} fill="none"
          stroke={urgent ? '#ff4444' : '#a8e063'} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          transform="rotate(-90 90 90)"
          style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }}
        />
      </svg>
      <div className="gm-circle-label">
        <span className="gm-circle-time" style={{ color: urgent ? '#ff4444' : '#a8e063' }}>
          {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
        </span>
        <span className="gm-circle-sub">remaining</span>
      </div>
    </div>
  )
}

// ---------- AI Result Card ----------
function ScanResultCard({ result, onProceed, onRescan, actionLoading }) {
  const pass = result.allow_grazing
  const color = pass ? '#a8e063' : '#ff4757'
  const colorInfo = COLOR_LABELS[result.dominant_color] || { label: result.dominant_color, dot: '#888' }

  return (
    <div className="gm-scan-result" style={{ borderColor: color }}>
      <div className="gm-scan-verdict" style={{ color }}>
        {pass ? '✅ GREEN LIGHT' : '🔴 RED LIGHT'}
      </div>
      <p className="gm-scan-instruction">{result.groom_instruction}</p>

      <div className="gm-scan-metrics">
        <div className="gm-scan-metric">
          <span className="gm-scan-metric-val">{result.grass_coverage_pct}%</span>
          <span className="gm-scan-metric-lbl">Grass Cover</span>
        </div>
        <div className="gm-scan-metric">
          <span className="gm-scan-metric-val" style={{ color: colorInfo.dot }}>
            <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background: colorInfo.dot, marginRight:4, verticalAlign:'middle' }}/>
            {colorInfo.label}
          </span>
          <span className="gm-scan-metric-lbl">Dominant Color</span>
        </div>
        <div className="gm-scan-metric">
          <span className="gm-scan-metric-val" style={{ color: RISK_COLORS[result.weed_infestation_risk] }}>
            {result.weed_infestation_risk.toUpperCase()}
          </span>
          <span className="gm-scan-metric-lbl">Weed Risk</span>
        </div>
        <div className="gm-scan-metric">
          <span className="gm-scan-metric-val" style={{ color: result.soil_exposure_detected ? '#ff4757' : '#a8e063' }}>
            {result.soil_exposure_detected ? 'YES ⚠️' : 'NO ✅'}
          </span>
          <span className="gm-scan-metric-lbl">Soil Exposed</span>
        </div>
      </div>

      {result.image_url && (
        <img src={result.image_url} alt="Scanned grass" className="gm-scan-preview" />
      )}

      <div className="gm-scan-actions">
        <button className="gm-rescan-btn" onClick={onRescan}>📷 Re-scan</button>
        {pass && (
          <button className="gm-big-btn release gm-proceed-btn" onClick={onProceed} disabled={actionLoading}>
            <span className="gm-btn-icon">🔓</span>
            <span className="gm-btn-text">RELEASE HORSES</span>
          </button>
        )}
      </div>
    </div>
  )
}

// ---------- Main Component ----------
export default function GroomMobile() {
  const [paddocks, setPaddocks]       = useState([])
  const [selected, setSelected]       = useState(null)
  const [detail, setDetail]           = useState(null)
  const [loading, setLoading]         = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  // Scan states
  const [scanPhase, setScanPhase]     = useState('idle')   // idle | scanning | result
  const [scanResult, setScanResult]   = useState(null)
  const [scanPreview, setScanPreview] = useState(null)
  const fileRef                       = useRef(null)

  const [issueOpen, setIssueOpen]     = useState(false)
  const [toast, setToast]             = useState(null)
  const tickRef                       = useRef(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }

  const fetchPaddocks = async () => {
    try {
      const res = await fetch(`${API}/paddocks/`)
      const data = await res.json()
      setPaddocks(data)
      if (!selected && data.length > 0) setSelected(data[0].id)
    } catch {}
  }

  const fetchDetail = async (id) => {
    if (!id) return
    try {
      const res = await fetch(`${API}/paddocks/${id}`)
      const data = await res.json()
      setDetail(data)
      // Sync scan state from backend
      if (data.last_scan_passed === true && data.current_state !== 'grazing') {
        // Show last scan result if we have one
      }
    } catch {}
  }

  useEffect(() => { fetchPaddocks() }, [])

  useEffect(() => {
    if (selected) {
      setLoading(true)
      setScanPhase('idle')
      setScanResult(null)
      setScanPreview(null)
      fetchDetail(selected).finally(() => setLoading(false))
    }
  }, [selected])

  // Countdown tick
  useEffect(() => {
    tickRef.current = setInterval(() => {
      setDetail(prev => {
        if (!prev || prev.minutes_remaining == null) return prev
        const updated = prev.minutes_remaining - (1 / 60)
        if (updated <= 0) {
          handleLock(true)
          return { ...prev, minutes_remaining: 0 }
        }
        return { ...prev, minutes_remaining: updated }
      })
    }, 1000)
    return () => clearInterval(tickRef.current)
  }, [])

  // ---------- Scan flow ----------
  const handleScanClick = () => fileRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanPreview(URL.createObjectURL(file))
    setScanPhase('scanning')
    setScanResult(null)

    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API}/paddocks/${selected}/analyze`, {
        method: 'POST',
        body: form,
      })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setScanResult(data)
      setScanPhase('result')
      fetchDetail(selected)   // sync last_scan_passed

      if (data.allow_grazing) {
        showToast('✅ AI cleared this paddock — you may release!')
      } else {
        showToast('🔴 AI flagged this paddock — choose another.', 'error')
      }
    } catch (err) {
      showToast('Scan failed. Check your connection.', 'error')
      setScanPhase('idle')
    }
    // reset file input
    e.target.value = ''
  }

  // ---------- Gate actions ----------
  const handleRelease = async () => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/paddocks/${selected}/release`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json()
        showToast(err.detail || 'Could not release.', 'error')
      } else {
        const data = await res.json()
        setDetail(data)
        setScanPhase('idle')
        setScanResult(null)
        showToast('🐴 Horses released! 2-hour timer started.')
        fetchPaddocks()
      }
    } catch { showToast('Network error', 'error') }
    setActionLoading(false)
  }

  const handleLock = async (auto = false) => {
    setActionLoading(true)
    try {
      const res = await fetch(`${API}/paddocks/${selected}/lock`, { method: 'POST' })
      const data = await res.json()
      setDetail(data)
      setScanPhase('idle')
      setScanResult(null)
      showToast(auto ? '⏰ Time up — gates locked automatically.' : '🔒 Gates locked! Session recorded.')
      fetchPaddocks()
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
      showToast(`⚠️ "${issue}" flagged to the owner.`)
    } catch { showToast('Failed to report', 'error') }
  }

  const isGrazing = detail?.current_state === 'grazing'
  const isReady   = detail?.current_state === 'ready'

  return (
    <div className="gm-root">
      {toast && <div className={`gm-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Hidden file input */}
      <input
        ref={fileRef} type="file" accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        capture="environment"
      />

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

      {detail && !loading && (
        <>
          {/* -------- GRAZING MODE -------- */}
          {isGrazing && (
            <>
              <div className="gm-countdown-area">
                {detail.minutes_remaining != null
                  ? <CountdownCircle minutesRemaining={detail.minutes_remaining} />
                  : <div className="gm-status-idle"><span className="gm-idle-icon">🌿</span><span className="gm-idle-text">Grazing in progress</span></div>
                }
              </div>
              <div className="gm-action-area">
                <button
                  className={`gm-big-btn lock ${actionLoading ? '' : 'flash'}`}
                  onClick={() => handleLock()}
                  disabled={actionLoading}
                >
                  <span className="gm-btn-icon">🔒</span>
                  <span className="gm-btn-text">LOCK GATES &amp; BOOT OUT</span>
                </button>
              </div>
            </>
          )}

          {/* -------- READY MODE — must scan first -------- */}
          {isReady && (
            <>
              {/* Phase: idle — show scan prompt */}
              {scanPhase === 'idle' && (
                <div className="gm-scan-gate">
                  <div className="gm-scan-icon">📷</div>
                  <div className="gm-scan-title">AI Grass Scan Required</div>
                  <p className="gm-scan-body">
                    Before releasing horses, take a photo of the paddock grass.
                    Our AI agent will inspect it and decide if it's safe today.
                  </p>
                  <button className="gm-scan-btn" onClick={handleScanClick}>
                    📷 Scan Grass Now
                  </button>
                </div>
              )}

              {/* Phase: scanning — show spinner */}
              {scanPhase === 'scanning' && (
                <div className="gm-scan-gate">
                  {scanPreview && <img src={scanPreview} alt="preview" className="gm-scan-preview-sm" />}
                  <div className="gm-scan-spinner" />
                  <div className="gm-scan-title">AI is analyzing the grass…</div>
                  <p className="gm-scan-body">Checking coverage, soil exposure, weed risk…</p>
                </div>
              )}

              {/* Phase: result — show AI decision */}
              {scanPhase === 'result' && scanResult && (
                <div className="gm-action-area" style={{ paddingTop: 12 }}>
                  <ScanResultCard
                    result={scanResult}
                    onProceed={handleRelease}
                    onRescan={() => { setScanPhase('idle'); setScanResult(null) }}
                    actionLoading={actionLoading}
                  />
                </div>
              )}
            </>
          )}

          {/* Report Issue (always visible) */}
          <div className="gm-report-area">
            <button className="gm-report-btn" onClick={() => setIssueOpen(o => !o)}>
              ⚠️ Report a Physical Issue
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
