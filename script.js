function switchView(view) {
  const founderEl = document.getElementById('founder-view');
  const groomEl = document.getElementById('groom-view');
  const titleEl = document.getElementById('view-title');
  const metaEl = document.getElementById('view-meta');
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(el => el.classList.remove('active'));
  if (view === 'founder') {
    founderEl.style.display = 'block';
    groomEl.style.display = 'none';
    titleEl.textContent = 'Founder dashboard';
    metaEl.textContent = '4 horses · 3 paddocks · Last sync 2 min ago';
    navItems[0].classList.add('active');
  } else {
    founderEl.style.display = 'none';
    groomEl.style.display = 'block';
    titleEl.textContent = 'Groom mobile view';
    metaEl.textContent = 'Budi · Tue 14 Apr · 4 horses assigned today';
    navItems[1].classList.add('active');
  }
}
