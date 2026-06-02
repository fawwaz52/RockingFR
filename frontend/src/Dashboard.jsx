import { useState, useEffect } from 'react';

const API_URL = "http://localhost:8000/api/horses/";

export default function Dashboard() {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setHorses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const active = horses.filter(h => h.status !== 'sold');
  const forSale = active.filter(h => h.status === 'for_sale').length;
  const inTraining = active.filter(h => h.status === 'in_training').length;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Founder dashboard</div>
          <div className="topbar-meta">{active.length} horses · 3 paddocks · Last sync just now</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="badge badge-gray">Rp 0 / mo</span>
        </div>
      </div>

      <div className="content">
        <div className="view-tabs">
          <button className="view-tab active">Overview</button>
          <button className="view-tab">Profit calc</button>
          <button className="view-tab">Logs</button>
        </div>

        <div className="section-title">Key metrics</div>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Horses at facility</div>
            <div className="metric-value">{active.length}</div>
            <div className="metric-sub">{forSale} for sale · {inTraining} in training</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Monthly burn</div>
            <div className="metric-value">Rp 4.2M</div>
            <div className="metric-sub">Feed + labor</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Estimated sale value</div>
            <div className="metric-value">Rp 68M</div>
            <div className="metric-sub">2 horses listed</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Net profit (proj.)</div>
            <div className="metric-value" style={{ color: 'var(--color-text-success)' }}>Rp 51M</div>
            <div className="metric-sub">After acq. + 4 mo burn</div>
          </div>
        </div>

        <div className="cards-grid" style={{ marginTop: '20px' }}>
          <div className="card">
            <div className="card-header">
              <div className="card-title">Horses</div>
              <span className="badge badge-blue">{active.length} total</span>
            </div>
            {loading ? (
              <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>Loading...</div>
            ) : active.length === 0 ? (
              <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>No horses registered yet.</div>
            ) : (
              active.map(h => {
                const isForSale = h.status === 'for_sale';
                const cur = h.stats?.find(s => s.stat_type === 'current');
                const temp = cur ? cur.sanity : 5;
                const initials = h.registered_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                
                return (
                  <div className="horse-row" key={h.id}>
                    <div className="horse-avatar" style={{ background: isForSale ? 'var(--color-background-warning)' : 'var(--color-background-info)', color: isForSale ? 'var(--color-text-warning)' : 'var(--color-text-info)' }}>
                      {initials}
                    </div>
                    <div className="horse-info">
                      <div className="horse-name">{h.registered_name}</div>
                      <div className="horse-detail">{h.stable_name ? `Barn: ${h.stable_name} · ` : ''}Temperament {temp}/10</div>
                      <div className="progress-bar"><div className="progress-fill" style={{ width: `${temp * 10}%`, background: isForSale ? 'var(--color-text-warning)' : 'var(--color-text-info)' }}></div></div>
                    </div>
                    <span className={`badge ${isForSale ? 'badge-green' : 'badge-gray'}`}>
                      {h.status.replace('_', ' ')}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div className="card-title">Recent daily logs</div>
              <span className="badge badge-gray">Today</span>
            </div>
            <div className="log-row">
              <div className="log-dot" style={{ background: 'var(--color-text-success)' }}></div>
              <div>
                <div className="log-text">System check — Dashboard updated</div>
                <div className="log-time">Just now · Admin</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
