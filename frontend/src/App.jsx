import { useState } from 'react'
import Dashboard from './Dashboard'
import Horses from './Horses'
import Paddocks from './Paddocks'
import GroomMobile from './GroomMobile'

function App() {
  const [activeTab, setActiveTab] = useState('founder')

  return (
    <div className="dash">
      <div className="sidebar">
        <div className="sidebar-logo">
          <span className="brand">THE ROCKING FR</span>
        </div>

        <div className="nav-section">
          <div className="nav-label">Overview</div>
          <div
            className={`nav-item ${activeTab === 'founder' ? 'active' : ''}`}
            onClick={() => setActiveTab('founder')}
          >
            <span className="nav-icon">&#9632;</span> Founder view
          </div>
          <div
            className={`nav-item ${activeTab === 'groom' ? 'active' : ''}`}
            onClick={() => setActiveTab('groom')}
          >
            <span className="nav-icon">&#9675;</span> Groom mobile
          </div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Manage</div>
          <div
            className={`nav-item ${activeTab === 'horses' ? 'active' : ''}`}
            onClick={() => setActiveTab('horses')}
          >
            <span className="nav-icon">&#9632;</span> Horses
          </div>
          <div
            className={`nav-item ${activeTab === 'paddocks' ? 'active' : ''}`}
            onClick={() => setActiveTab('paddocks')}
          >
            <span className="nav-icon">&#9632;</span> Paddocks
          </div>
          <div className="nav-item"><span className="nav-icon">&#9632;</span> Daily logs</div>
        </div>

        <div className="nav-section">
          <div className="nav-label">Sales</div>
          <div className="nav-item"><span className="nav-icon">&#9632;</span> Buyer portal</div>
          <div className="nav-item"><span className="nav-icon">&#9632;</span> Milestones</div>
        </div>

        <div style={{ flex: 1 }}></div>
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid var(--color-border-tertiary)' }}></div>
      </div>

      <div className="main">
        {activeTab === 'founder'  && <Dashboard />}
        {activeTab === 'horses'   && <Horses />}
        {activeTab === 'paddocks' && <Paddocks />}
        {activeTab === 'groom'    && <GroomMobile />}
      </div>
    </div>
  )
}

export default App
