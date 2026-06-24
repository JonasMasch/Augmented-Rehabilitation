/* ============================================================
   Profilseite — persönliche Info, Trainingsübersicht, Medaillen
   Nutzt common.js ($), badges.js und session.js
   ============================================================ */

function formatDuration(sec) {
  const totalMin = Math.floor(sec / 60);
  if (totalMin < 60) return totalMin + ' min';
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return m ? (h + ' h ' + m + ' min') : (h + ' h');
}

function renderProfile() {
  // --- Persönliche Info ---
  const name = getUserName() || 'Nutzer:in';
  $('profil-name').textContent = name;

  const days = getDaysSinceStart();
  const sessions = getSessionCount();
  const dabei = days <= 1 ? 'Heute gestartet' : ('Seit ' + days + ' Tagen dabei');
  $('profil-meta').textContent = dabei + ' · ' + sessions + ' Session' + (sessions === 1 ? '' : 's');

  // --- Trainingsübersicht ---
  $('stat-total').textContent = formatDuration(getTotalSeconds());
  $('stat-streak').textContent = '🔥 ' + getStreak();
  renderWeek();

  // --- Medaillen ---
  renderMedals();
}

function renderWeek() {
  const row = $('week-row');
  row.innerHTML = '';
  getWeekActivity().forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'day-cell' +
      (d.trained ? ' trained' : '') +
      (d.isToday ? ' today' : '') +
      (d.isFuture ? ' future' : '');
    cell.innerHTML = '<div class="day-lbl">' + d.label + '</div>' +
                     '<div class="day-dot">' + (d.trained ? '✓' : '') + '</div>';
    row.appendChild(cell);
  });
}

function renderMedals() {
  let earned = 0;
  MEDALS.forEach(m => { if (m.check()) earned++; });
  $('medal-count').textContent = earned + ' / ' + MEDALS.length;

  const container = $('badge-groups');
  container.innerHTML = '';

  Object.keys(MEDAL_GROUPS).forEach(groupKey => {
    const meta = MEDAL_GROUPS[groupKey];
    const items = MEDALS.filter(m => m.group === groupKey);
    if (!items.length) return;

    const section = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'badge-group-title';
    title.innerHTML = '<span class="dot" style="background:' + meta.color + '"></span>' + meta.label;
    section.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'medal-grid';
    items.forEach(m => {
      const ok = !!m.check();
      const el = document.createElement('div');
      el.className = 'ach ' + (ok ? 'earned' : 'locked');
      el.innerHTML = '<div class="ach-ic">' + (ok ? m.icon : '🔒') + '</div>' +
                     '<div class="ach-name">' + m.name + '</div>';
      el.addEventListener('click', () => showMedalInfo(m, ok));
      grid.appendChild(el);
    });
    section.appendChild(grid);
    container.appendChild(section);
  });
}

// --- Medaillen-Info-Popup ---
function showMedalInfo(medal, ok) {
  $('mi-icon').textContent = ok ? medal.icon : '🔒';
  $('mi-title').textContent = medal.name;
  $('mi-desc').textContent = medal.desc;
  $('mi-status').textContent = ok ? '✓ Erreicht' : 'Noch nicht erreicht';
  $('mi-status').style.color = ok ? '#34d399' : 'rgba(255,255,255,0.6)';
  $('medal-info').classList.add('show');
}

function hideMedalInfo() { $('medal-info').classList.remove('show'); }

function onReset() {
  if (confirm('Allen Fortschritt (Medaillen und Trainingsstatistik) wirklich zurücksetzen?')) {
    resetProgress();
    resetStats();
    renderProfile();
  }
}

// Name ändern
$('name-edit').addEventListener('click', () => {
  const current = getUserName();
  const name = prompt('Wie heißt du?', current);
  if (name !== null) {
    setUserName(name.trim());
    renderProfile();
  }
});

$('mi-close').addEventListener('click', hideMedalInfo);
$('medal-info').addEventListener('click', e => { if (e.target.id === 'medal-info') hideMedalInfo(); });

renderProfile();
