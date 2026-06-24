/* ============================================================
   Einstellungsseite — verbindet die Bedienelemente mit settings.js
   ============================================================ */

function initSettingsPage() {
  const s = loadSettings();

  // --- Mein Training ---
  initSegment('seg-side', s.side, val => setSetting('side', val));
  initSegment('seg-duration', String(s.sessionDuration), val => setSetting('sessionDuration', parseInt(val, 10)));

  // Tägliche Erinnerung + Uhrzeit
  const rem = $('set-reminder');
  const remTime = $('set-reminder-time');
  const remRow = $('row-reminder-time');
  rem.checked = !!s.reminderEnabled;
  remTime.value = s.reminderTime || '09:00';
  const syncRem = () => {
    remRow.classList.toggle('disabled-row', !rem.checked);
    remTime.disabled = !rem.checked;
  };
  syncRem();
  rem.addEventListener('change', () => { setSetting('reminderEnabled', rem.checked); syncRem(); });
  remTime.addEventListener('change', () => setSetting('reminderTime', remTime.value));

  // --- Ton ---
  const sound = $('set-sound');
  sound.checked = !!s.soundOn;
  sound.addEventListener('change', () => setSetting('soundOn', sound.checked));

  const vol = $('set-volume');
  const volVal = $('vol-value');
  vol.value = s.volume;
  volVal.textContent = s.volume + '%';
  vol.addEventListener('input', () => { volVal.textContent = vol.value + '%'; });
  vol.addEventListener('change', () => setSetting('volume', parseInt(vol.value, 10)));

  const voice = $('set-erika-voice');
  voice.checked = !!s.erikaVoice;
  voice.addEventListener('change', () => setSetting('erikaVoice', voice.checked));

  // --- Darstellung ---
  const preview = $('font-preview');
  const applyPreview = v => { preview.className = 'font-preview fp-' + v; };
  applyPreview(s.fontSize);
  initSegment('seg-fontsize', s.fontSize, val => { setSetting('fontSize', val); applyPreview(val); });
}

// Segment-Gruppe: markiert den aktiven Button und meldet Änderungen
function initSegment(containerId, current, onChange) {
  const container = $(containerId);
  const buttons = container.querySelectorAll('button');
  buttons.forEach(btn => {
    if (btn.dataset.value === current) btn.classList.add('active');
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onChange(btn.dataset.value);
    });
  });
}

function onReset() {
  if (confirm('Alle Einstellungen auf Standard zurücksetzen?')) {
    resetSettings();
    location.reload();
  }
}

initSettingsPage();
