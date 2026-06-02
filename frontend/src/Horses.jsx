import { useState, useEffect } from 'react';
import HorseModal from './HorseModal';

const API_URL = "http://localhost:8000/api/horses/";

export default function Horses() {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchHorses = () => {
    setLoading(true);
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        setHorses(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        // Fallback mock data if backend isn't running
        setHorses([
          {
            id: 'h1', registered_name: 'Ciletuh Gold Star', stable_name: 'Goldie',
            microchip_id: '985141002345001', status: 'for_sale', image_url: null,
            predictive_analysis_text: "Based on bloodline, track analytics, and current temperament profile...",
            stats: [
              { stat_type: 'current', sanity: 6, balance: 7, responsiveness: 5, stamina: 8 },
              { stat_type: 'predicted', sanity: 9, balance: 9, responsiveness: 8, stamina: 10 }
            ]
          }
        ]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchHorses();
  }, []);

  const active = horses.filter(h => h.status !== 'sold');

  return (
    <div className="horses-theme">
      <header className="horses-topbar">
        <div className="brand">
          <span className="brand-name">Stable OS</span>
          <span className="brand-tag">HORSE ASSETS</span>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <span className="icon">+</span> Add New Horse
        </button>
      </header>

      <main className="horses-page">
        <div className="horses-page-header">
          <h1 className="horses-page-title">Horse Assets &amp; Inventory</h1>
          <p className="horses-page-subtitle">Active inventory — training pipeline and predictive analytics</p>
          <div className="horses-stats-strip">
            <div className="horses-stat-item">
              <span className="horses-stat-num">{active.length}</span>
              <span className="horses-stat-lbl">Total horses</span>
            </div>
            <div className="horses-stat-sep"></div>
            <div className="horses-stat-item">
              <span className="horses-stat-num">{active.filter(h => h.status === 'for_sale').length}</span>
              <span className="horses-stat-lbl">For sale</span>
            </div>
            <div className="horses-stat-sep"></div>
            <div className="horses-stat-item">
              <span className="horses-stat-num">{active.filter(h => h.status === 'in_training').length}</span>
              <span className="horses-stat-lbl">In training</span>
            </div>
          </div>
        </div>

        {loading ? (
          <div>Loading assets...</div>
        ) : (
          <div className="horses-horse-grid">
            {active.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🐴</div>
                <div className="empty-title">No horses registered yet</div>
              </div>
            ) : (
              active.map(h => {
                const cur = h.stats?.find(s => s.stat_type === 'current') || { sanity: 1, balance: 1, responsiveness: 1, stamina: 1 };
                const pred = h.stats?.find(s => s.stat_type === 'predicted') || { sanity: 1, balance: 1, responsiveness: 1, stamina: 1 };
                
                return (
                  <div key={h.id} className="horses-horse-card">
                    <div className="horses-card-top">
                      <div className="horses-card-left">
                        {h.image_url ? (
                          <img className="horses-horse-img" src={h.image_url} alt={h.registered_name} />
                        ) : (
                          <div className="horses-horse-img-placeholder">🐴</div>
                        )}
                        <div className="horses-card-identity">
                          <div className="horses-horse-fullname">{h.registered_name}</div>
                          {h.stable_name && <div className="horses-horse-stable">({h.stable_name})</div>}
                          <div className="horses-horse-chip">MCP · {h.microchip_id}</div>
                          <div className={`horses-status-badge s-${h.status}`}>{h.status.replace('_', ' ')}</div>
                        </div>
                      </div>
                      <div className="horses-card-right">
                        <div className="horses-metrics-title">Performance metrics</div>
                        
                        {['sanity', 'balance', 'responsiveness', 'stamina'].map(key => {
                          const c = cur[key];
                          const p = pred[key];
                          const delta = p - c;
                          return (
                            <div key={key} className="horses-metric-row">
                              <div className="horses-metric-labels">
                                <span className="horses-metric-name" style={{textTransform: 'capitalize'}}>{key}</span>
                                <span className="horses-metric-vals">{c} → {p}</span>
                              </div>
                              <div className="horses-bars-wrap">
                                <div className="horses-bar-line">
                                  <span className="horses-bar-tag">NOW</span>
                                  <div className="horses-bar-track"><div className="horses-bar-fill current" style={{ width: `${c * 10}%` }}></div></div>
                                </div>
                                <div className="horses-bar-line">
                                  <span className="horses-bar-tag">PRED</span>
                                  <div className="horses-bar-track"><div className="horses-bar-fill predicted" style={{ width: `${p * 10}%` }}></div></div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      <HorseModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onHorseAdded={fetchHorses} 
      />
    </div>
  )
}
