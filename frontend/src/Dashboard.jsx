import { useState, useEffect } from 'react';

const API = 'http://localhost:8000/api';

const CATEGORIES = ['Feed', 'Labor', 'Maintenance', 'Veterinary', 'Transport', 'Other'];

const CAT_ICONS = {
  Feed: '🌾', Labor: '👷', Maintenance: '🔧',
  Veterinary: '💉', Transport: '🚛', Other: '📦',
};

const CAT_COLORS = {
  Feed: '#a8e063', Labor: '#ffd32a', Maintenance: '#ff9f43',
  Veterinary: '#54a0ff', Transport: '#c8d6e5', Other: '#8395a7',
};

function formatRp(value) {
  if (value == null || isNaN(value)) return 'Rp 0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `Rp ${(value / 1_000).toFixed(0)}K`;
  return `Rp ${value.toFixed(0)}`;
}

// ─── Spending Tracker Tab ─────────────────────────────────────────────────────
function SpendingTracker({ summary, onNewExpense }) {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ category: 'Feed', amount: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetch(`${API}/financials/expenses`)
      .then(r => r.json())
      .then(setExpenses)
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || isNaN(parseFloat(form.amount))) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/financials/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      if (!res.ok) throw new Error();
      const newExp = await res.json();
      setExpenses(prev => [newExp, ...prev]);
      setForm({ category: 'Feed', amount: '', description: '' });
      showToast('✅ Expense logged!');
      onNewExpense(); // refresh summary
    } catch {
      showToast('Failed to log expense.', 'error');
    }
    setSubmitting(false);
  };

  const breakdown = summary?.expense_breakdown || {};

  return (
    <div className="spending-root">
      {toast && <div className={`gm-toast ${toast.type}`}>{toast.msg}</div>}

      {/* Breakdown Cards */}
      <div className="spending-breakdown-grid">
        {CATEGORIES.map(cat => (
          <div key={cat} className="spending-cat-card" style={{ borderColor: CAT_COLORS[cat] }}>
            <div className="spending-cat-icon">{CAT_ICONS[cat]}</div>
            <div className="spending-cat-name">{cat}</div>
            <div className="spending-cat-amount" style={{ color: CAT_COLORS[cat] }}>
              {formatRp(breakdown[cat] || 0)}
            </div>
          </div>
        ))}
      </div>

      <div className="spending-body">
        {/* Log Expense Form */}
        <div className="card spending-form-card">
          <div className="card-header">
            <div className="card-title">Log Expense</div>
          </div>
          <form className="spending-form" onSubmit={handleSubmit}>
            <div className="spending-form-row">
              <div className="spending-field">
                <label>Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>
                  ))}
                </select>
              </div>
              <div className="spending-field">
                <label>Amount (Rp)</label>
                <input
                  type="number"
                  placeholder="e.g. 500000"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="spending-field">
              <label>Description (optional)</label>
              <input
                type="text"
                placeholder="e.g. Monthly feed for 3 horses"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn-primary" disabled={submitting} style={{ marginTop: 8 }}>
              {submitting ? 'Saving…' : '+ Add Expense'}
            </button>
          </form>
        </div>

        {/* Recent Expenses */}
        <div className="card spending-log-card">
          <div className="card-header">
            <div className="card-title">Recent Expenses</div>
            <span className="badge badge-gray">{expenses.length} total</span>
          </div>
          <div className="spending-expense-list">
            {expenses.length === 0 ? (
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 13, padding: '8px 0' }}>
                No expenses recorded yet.
              </div>
            ) : (
              expenses.map(exp => (
                <div key={exp.id} className="spending-expense-row">
                  <div className="spending-exp-icon" style={{ background: `${CAT_COLORS[exp.category]}22`, color: CAT_COLORS[exp.category] }}>
                    {CAT_ICONS[exp.category] || '📦'}
                  </div>
                  <div className="spending-exp-info">
                    <div className="spending-exp-cat">{exp.category}</div>
                    {exp.description && <div className="spending-exp-desc">{exp.description}</div>}
                    <div className="spending-exp-date">{new Date(exp.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  <div className="spending-exp-amount">-{formatRp(exp.amount)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────
function Overview({ horses, loading, summary }) {
  const active = horses.filter(h => h.status !== 'sold');
  const forSale = active.filter(h => h.status === 'for_sale').length;
  const inTraining = active.filter(h => h.status === 'in_training').length;
  const netProfit = summary?.net_profit ?? 0;

  return (
    <>
      <div className="section-title">Key metrics</div>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Horses at facility</div>
          <div className="metric-value">{active.length}</div>
          <div className="metric-sub">{forSale} for sale · {inTraining} in training</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Monthly burn</div>
          <div className="metric-value">{formatRp(summary?.monthly_burn ?? 0)}</div>
          <div className="metric-sub">All spending this month</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Estimated sale value</div>
          <div className="metric-value">{formatRp(summary?.total_estimated_value ?? 0)}</div>
          <div className="metric-sub">{summary?.horses_for_sale ?? 0} horses listed</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Net profit (proj.)</div>
          <div className="metric-value" style={{ color: netProfit >= 0 ? 'var(--color-text-success)' : '#ff4757' }}>
            {netProfit < 0 ? '-' : ''}{formatRp(Math.abs(netProfit))}
          </div>
          <div className="metric-sub">Value − cost − total spend</div>
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
              );
            })
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Spending breakdown</div>
            <span className="badge badge-gray">All time</span>
          </div>
          {summary && Object.keys(summary.expense_breakdown).length > 0 ? (
            Object.entries(summary.expense_breakdown).map(([cat, amt]) => (
              <div key={cat} className="horse-row" style={{ gap: 12 }}>
                <div className="horse-avatar" style={{ background: `${CAT_COLORS[cat] || '#888'}22`, color: CAT_COLORS[cat] || '#888' }}>
                  {CAT_ICONS[cat] || '📦'}
                </div>
                <div className="horse-info">
                  <div className="horse-name">{cat}</div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{
                      width: `${Math.min(100, (amt / (summary.total_purchase_cost + Object.values(summary.expense_breakdown).reduce((a,b)=>a+b,0) || 1)) * 100)}%`,
                      background: CAT_COLORS[cat] || '#888'
                    }}></div>
                  </div>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#ff4757', whiteSpace: 'nowrap' }}>-{formatRp(amt)}</span>
              </div>
            ))
          ) : (
            <div style={{ padding: '10px 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              No expenses recorded yet. Log spending in the Profit calc tab.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [horses, setHorses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchHorses = () => {
    setLoading(true);
    fetch(`${API}/horses/`)
      .then(res => res.json())
      .then(data => { setHorses(data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  const fetchSummary = () => {
    fetch(`${API}/financials/summary`)
      .then(res => res.json())
      .then(setSummary)
      .catch(() => {});
  };

  useEffect(() => {
    fetchHorses();
    fetchSummary();
  }, []);

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Founder Dashboard</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}></div>
      </div>

      <div className="content">
        <div className="view-tabs">
          <button
            className={`view-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >Overview</button>
          <button
            className={`view-tab ${activeTab === 'profit' ? 'active' : ''}`}
            onClick={() => setActiveTab('profit')}
          >Profit calc</button>
          <button className="view-tab">Logs</button>
        </div>

        {activeTab === 'overview' && (
          <Overview horses={horses} loading={loading} summary={summary} />
        )}
        {activeTab === 'profit' && (
          <SpendingTracker summary={summary} onNewExpense={fetchSummary} />
        )}
      </div>
    </>
  );
}
