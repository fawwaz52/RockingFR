/* ── DATA ── */
const PREDICTIVE_TEXT = "Based on bloodline, track analytics, and current temperament profile, this asset is projected to achieve a premium 'Safe Amateur' classification within a 6-month operational cycle.";
 
const STATUS_LABELS = {
  at_track: 'At Track', letting_down: 'Letting Down',
  in_training: 'In Training', for_sale: 'For Sale', sold: 'Sold'
};
 
let horses = [
  {
    id: 'h1', registered_name: 'Ciletuh Gold Star', stable_name: 'Goldie',
    microchip_id: '985141002345001', status: 'for_sale', image_url: null,
    current_stats: { sanity: 6, balance: 7, responsiveness: 5, stamina: 8 },
    predicted_stats: { sanity: 9, balance: 9, responsiveness: 8, stamina: 10 },
    predictive_analysis_text: PREDICTIVE_TEXT
  },
  {
    id: 'h2', registered_name: 'Rio Largo', stable_name: 'Rio',
    microchip_id: '985141002345002', status: 'in_training', image_url: null,
    current_stats: { sanity: 5, balance: 6, responsiveness: 6, stamina: 6 },
    predicted_stats: { sanity: 8, balance: 8, responsiveness: 9, stamina: 8 },
    predictive_analysis_text: PREDICTIVE_TEXT
  },
  {
    id: 'h3', registered_name: 'Kuda Mas', stable_name: 'Mas',
    microchip_id: '985141002345003', status: 'for_sale', image_url: null,
    current_stats: { sanity: 8, balance: 8, responsiveness: 7, stamina: 9 },
    predicted_stats: { sanity: 10, balance: 9, responsiveness: 9, stamina: 10 },
    predictive_analysis_text: PREDICTIVE_TEXT
  },
  {
    id: 'h4', registered_name: 'Silverbell', stable_name: null,
    microchip_id: '985141002345004', status: 'letting_down', image_url: null,
    current_stats: { sanity: 3, balance: 4, responsiveness: 3, stamina: 4 },
    predicted_stats: { sanity: 7, balance: 7, responsiveness: 7, stamina: 8 },
    predictive_analysis_text: PREDICTIVE_TEXT
  }
];
 
const METRICS = [
  { key: 'sanity', label: 'Sanity', sub: 'Spook-resistance' },
  { key: 'balance', label: 'Balance', sub: 'Biomechanics' },
  { key: 'responsiveness', label: 'Responsiveness', sub: 'Steering' },
  { key: 'stamina', label: 'Stamina', sub: 'Conditioning' },
];
 
/* ── RENDER ── */
function renderGrid() {
  const grid = document.getElementById('horse-grid');
  const active = horses.filter(h => h.status !== 'sold');
  if (active.length === 0) {
    grid.innerHTML = `<div class="empty-state"><div class="empty-icon">🐴</div><div class="empty-title">No horses registered yet</div><div class="empty-sub">Click "Add New Horse" to register your first asset.</div></div>`;
  } else {
    grid.innerHTML = active.map(renderCard).join('');
  }
  updateStats();
}
 
function renderCard(h) {
  const imgHtml = h.image_url
    ? `<img class="horse-img" src="${h.image_url}" alt="${h.registered_name}">`
    : `<div class="horse-img-placeholder">🐴</div>`;
 
  const stableLine = h.stable_name ? `<div class="horse-stable">(${h.stable_name})</div>` : '';
 
  const metricsHtml = METRICS.map(m => {
    const cur = h.current_stats[m.key] || 1;
    const pred = h.predicted_stats[m.key] || 1;
    const delta = pred - cur;
    const deltaStr = delta > 0 ? `<span style="color:var(--green)">+${delta}</span>` : delta < 0 ? `<span style="color:var(--red)">${delta}</span>` : `<span style="color:var(--muted)">–</span>`;
    return `
    <div class="metric-row">
      <div class="metric-labels">
        <span class="metric-name">${m.label} <span style="font-size:10px;font-weight:400;color:var(--muted)">${m.sub}</span></span>
        <span class="metric-vals">${cur} → ${pred} (${deltaStr})</span>
      </div>
      <div class="bars-wrap">
        <div class="bar-line">
          <span class="bar-tag">NOW</span>
          <div class="bar-track"><div class="bar-fill current" style="width:${cur*10}%"></div></div>
          <span class="bar-num">${cur}</span>
        </div>
        <div class="bar-line">
          <span class="bar-tag">PRED</span>
          <div class="bar-track"><div class="bar-fill predicted" style="width:${pred*10}%"></div></div>
          <span class="bar-num">${pred}</span>
        </div>
      </div>
    </div>`;
  }).join('');
 
  return `
  <div class="horse-card">
    <div class="card-top">
      <div class="card-left">
        ${imgHtml}
        <div class="card-identity">
          <div class="horse-fullname">${h.registered_name}</div>
          ${stableLine}
          <div class="horse-chip">MCP · ${h.microchip_id}</div>
          <div class="status-badge s-${h.status}">${STATUS_LABELS[h.status]}</div>
        </div>
      </div>
      <div class="card-right">
        <div class="metrics-title">Performance metrics</div>
        ${metricsHtml}
      </div>
    </div>
    <div class="card-bottom">
      <span class="pred-icon">🔮</span>
      <div>
        <div class="pred-label">Predictive Analysis</div>
        <div class="pred-text">${h.predictive_analysis_text || PREDICTIVE_TEXT}</div>
      </div>
    </div>
  </div>`;
}
 
function updateStats() {
  const active = horses.filter(h => h.status !== 'sold');
  document.getElementById('stat-total').textContent = active.length;
  document.getElementById('stat-sale').textContent = active.filter(h => h.status === 'for_sale').length;
  document.getElementById('stat-training').textContent = active.filter(h => h.status === 'in_training').length;
  document.getElementById('stat-letting').textContent = active.filter(h => h.status === 'letting_down').length;
}
 
/* ── MODAL ── */
function openModal() {
  document.getElementById('modal-backdrop').classList.add('open');
  document.getElementById('f-regname').focus();
}
function closeModal() {
  document.getElementById('modal-backdrop').classList.remove('open');
  resetForm();
}
function backdropClose(e) {
  if (e.target === document.getElementById('modal-backdrop')) closeModal();
}
 
/* ── FILE HANDLING ── */
let selectedFile = null;
function handleFile(input) {
  const file = input.files[0];
  const errEl = document.getElementById('e-image');
  if (!file) return;
  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
    errEl.style.display = 'block';
    input.value = '';
    return;
  }
  errEl.style.display = 'none';
  selectedFile = file;
  document.getElementById('file-placeholder').style.display = 'none';
  document.getElementById('file-preview').style.display = 'flex';
  document.getElementById('file-name').textContent = file.name;
}
function clearFile(e) {
  e.stopPropagation();
  selectedFile = null;
  document.getElementById('f-image').value = '';
  document.getElementById('file-placeholder').style.display = 'block';
  document.getElementById('file-preview').style.display = 'none';
}
 
/* ── FORM SUBMISSION ── */
function submitForm() {
  let valid = true;
  const regname = document.getElementById('f-regname').value.trim();
  const chip = document.getElementById('f-chip').value.trim();
 
  // Validate registered name
  const eReg = document.getElementById('e-regname');
  if (!regname) { eReg.style.display = 'block'; document.getElementById('f-regname').classList.add('error'); valid = false; }
  else { eReg.style.display = 'none'; document.getElementById('f-regname').classList.remove('error'); }
 
  // Validate microchip (required + unique)
  const eChip = document.getElementById('e-chip');
  const chipExists = horses.some(h => h.microchip_id === chip);
  if (!chip || chipExists) {
    eChip.textContent = !chip ? 'Required field.' : 'Microchip ID already registered.';
    eChip.style.display = 'block';
    document.getElementById('f-chip').classList.add('error');
    valid = false;
  } else {
    eChip.style.display = 'none';
    document.getElementById('f-chip').classList.remove('error');
  }
 
  if (!valid) return;
 
  // Build payload (simulating insertNewHorseAsset + uploadHorseAvatar)
  let imageUrl = null;
  if (selectedFile) {
    // In production: uploadHorseAvatar(selectedFile) → Supabase Storage → public URL
    imageUrl = URL.createObjectURL(selectedFile);
  }
 
  const payload = {
    id: 'h' + Date.now(),
    registered_name: regname,
    stable_name: document.getElementById('f-stable').value.trim() || null,
    microchip_id: chip,
    status: document.getElementById('f-status').value,
    image_url: imageUrl,
    current_stats: {
      sanity: parseInt(document.getElementById('s-sanity').value),
      balance: parseInt(document.getElementById('s-balance').value),
      responsiveness: parseInt(document.getElementById('s-resp').value),
      stamina: parseInt(document.getElementById('s-stamina').value),
    },
    predicted_stats: {
      sanity: Math.min(10, parseInt(document.getElementById('s-sanity').value) + 3),
      balance: Math.min(10, parseInt(document.getElementById('s-balance').value) + 2),
      responsiveness: Math.min(10, parseInt(document.getElementById('s-resp').value) + 3),
      stamina: Math.min(10, parseInt(document.getElementById('s-stamina').value) + 2),
    },
    predictive_analysis_text: PREDICTIVE_TEXT
  };
 
  // In production: await insertNewHorseAsset(payload)
  horses.unshift(payload);
  renderGrid();
  closeModal();
  showToast(`✓ ${payload.registered_name} registered successfully`);
}
 
/* ── RESET ── */
function resetForm() {
  ['f-regname','f-stable','f-chip'].forEach(id => {
    const el = document.getElementById(id); el.value = ''; el.classList.remove('error');
  });
  ['e-regname','e-chip','e-image'].forEach(id => document.getElementById(id).style.display = 'none');
  ['s-sanity','s-balance','s-resp','s-stamina'].forEach(id => {
    document.getElementById(id).value = 5;
  });
  ['v-sanity','v-balance','v-resp','v-stamina'].forEach(id => {
    document.getElementById(id).textContent = '5';
  });
  document.getElementById('f-status').value = 'letting_down';
  clearFile({ stopPropagation: () => {} });
}
 
/* ── TOAST ── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}
 
/* ── INIT ── */
renderGrid();
