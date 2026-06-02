import { useState, useRef } from 'react';

export default function HorseModal({ isOpen, onClose, onHorseAdded }) {
  const [regName, setRegName] = useState('');
  const [barnName, setBarnName] = useState('');
  const [microchip, setMicrochip] = useState('');
  const [status, setStatus] = useState('letting_down');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [stats, setStats] = useState({
    sanity: 5, balance: 5, responsiveness: 5, stamina: 5
  });

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.size <= 5 * 1024 * 1024) {
      setFile(selected);
      setError('');
    } else {
      setError('File too large (max 5MB) or invalid format.');
    }
  };

  const handleSubmit = async () => {
    if (!regName || !microchip) {
      setError('Registered Name and Microchip ID are required.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      let imageUrl = null;

      // 1. Upload the image if provided
      if (file) {
        const formData = new FormData();
        formData.append('file', file);

        const uploadRes = await fetch('http://localhost:8000/api/upload/', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) throw new Error('Image upload failed');
        const uploadData = await uploadRes.json();
        imageUrl = uploadData.url;
      }

      // 2. Submit the horse data
      const payload = {
        registered_name: regName,
        stable_name: barnName,
        microchip_id: microchip,
        status: status,
        image_url: imageUrl,
        predictive_analysis_text: "Based on bloodline, track analytics, and current temperament profile, this asset is projected to achieve a premium classification.",
        current_stats: { stat_type: 'current', ...stats },
        predicted_stats: {
          stat_type: 'predicted',
          sanity: Math.min(10, stats.sanity + 3),
          balance: Math.min(10, stats.balance + 2),
          responsiveness: Math.min(10, stats.responsiveness + 3),
          stamina: Math.min(10, stats.stamina + 2)
        }
      };

      const res = await fetch('http://localhost:8000/api/horses/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to register horse');
      }

      // Success
      setRegName(''); setBarnName(''); setMicrochip(''); setFile(null);
      onHorseAdded();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ transform: 'translateY(0) scale(1)' }}>
        <div className="modal-header">
          <h2 className="modal-title">Register New Horse</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          {error && <div className="error-msg" style={{display: 'block'}}>{error}</div>}
          
          <div className="form-field">
            <label className="form-label">Registered Name <span className="req">*</span></label>
            <input className="form-input" value={regName} onChange={e => setRegName(e.target.value)} placeholder="e.g. Ciletuh Gold Star" />
          </div>

          <div className="form-field">
            <label className="form-label">Barn Name</label>
            <input className="form-input" value={barnName} onChange={e => setBarnName(e.target.value)} placeholder="e.g. Goldie" />
          </div>

          <div className="form-field">
            <label className="form-label">Microchip ID <span className="req">*</span></label>
            <input className="form-input" value={microchip} onChange={e => setMicrochip(e.target.value)} placeholder="e.g. 985141002345678" />
          </div>

          <div className="form-field">
            <label className="form-label">Status</label>
            <select className="form-input" value={status} onChange={e => setStatus(e.target.value)}>
              <option value="letting_down">Letting Down</option>
              <option value="at_track">At Track</option>
              <option value="in_training">In Training</option>
              <option value="for_sale">For Sale</option>
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Horse Photo</label>
            <div className="file-zone">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" onChange={handleFileChange} />
              {!file ? (
                <div>
                  <div className="file-zone-icon">📷</div>
                  <div className="file-zone-text">Click to upload or drag & drop</div>
                  <div className="file-zone-hint">.jpg · .png · .webp · max 5 MB</div>
                </div>
              ) : (
                <div className="file-preview" style={{display: 'flex'}}>
                  <span>📎</span>
                  <span className="file-preview-name">{file.name}</span>
                  <span className="file-preview-rm" onClick={(e) => { e.preventDefault(); setFile(null); }}>Remove</span>
                </div>
              )}
            </div>
          </div>

        </div>
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Registering...' : 'Register Horse'}
          </button>
        </div>
      </div>
    </div>
  );
}
