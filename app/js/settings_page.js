/* ============================================================
   Einstellungsseite — verbindet die Bedienelemente mit settings.js
   ============================================================ */

// Die Dauern stehen zentral in VIBRATION (common.js), damit sich Einstellungen
// und Übungen gleich anfühlen. Wirkt es zu aufdringlich, dort senken.
const HAPTIK_MS = VIBRATION.tipp;

function initSettingsPage() {
  const s = loadSettings();

  // --- Version / Modus --- (data-mode am <html> live mitziehen, damit sich
  //     die sichtbaren Abschnitte sofort ohne Neuladen anpassen)
  initSegment('seg-mode', s.mode, val => {
    setSetting('mode', val);
    document.documentElement.setAttribute('data-mode', val);
  });

  // --- Mein Training ---
  const audioEx = $('set-audio-exercises');
  audioEx.checked = s.audioExercises !== false;
  audioEx.addEventListener('change', () => setSetting('audioExercises', audioEx.checked));

  const alwaysIntro = $('set-always-intro');
  alwaysIntro.checked = s.alwaysShowIntro === true;
  alwaysIntro.addEventListener('change', () => setSetting('alwaysShowIntro', alwaysIntro.checked));

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

  /* Vibration. Der Schalter selbst ist vom delegierten Listener unten
     ausgenommen und meldet sich hier über 'change' zurück: beim Einschalten
     einmal spürbar bestätigen, beim Ausschalten schweigen. Über pointerdown
     wäre es genau verkehrt herum, weil die Einstellung dort noch den alten
     Wert hat. */
  const vib = $('set-vibration');
  vib.checked = s.vibration !== false;
  vib.addEventListener('change', () => {
    setSetting('vibration', vib.checked);
    if (vib.checked) vibrate(HAPTIK_MS);
  });

  // --- Darstellung ---
  // Schriftgröße ist der zentrale Größen-Hebel: data-fontsize am <html> live
  // mitziehen -> alle rem-Größen (Text/Buttons/Abstände) skalieren sofort.
  //
  // Dabei ändert sich die Höhe ALLER Zeilen darüber, die Seite wird also länger
  // oder kürzer und der Umschalter rutschte bisher unter dem Finger weg — man
  // musste danach zurückscrollen. Deshalb die Position des Umschalters vor und
  // nach der Änderung messen und die Scrollposition um die Differenz nachziehen:
  // die Zeile bleibt dadurch optisch stehen.
  const scroller = document.querySelector('.screen.settings');
  initSegment('seg-fontsize', s.fontSize, val => {
    const seg = $('seg-fontsize');
    const vorher = seg.getBoundingClientRect().top;
    setSetting('fontSize', val);
    document.documentElement.setAttribute('data-fontsize', val);
    if (scroller) {
      const nachher = seg.getBoundingClientRect().top;   // erzwingt Neuberechnung
      scroller.scrollTop += (nachher - vorher);
    }
  });

  // Farbenblind-Modus: data-colorblind am <html> live mitziehen (siehe
  // common.css), Standard aus.
  const colorblind = $('set-colorblind');
  colorblind.checked = !!s.colorblindMode;
  colorblind.addEventListener('change', () => {
    setSetting('colorblindMode', colorblind.checked);
    if (colorblind.checked) document.documentElement.setAttribute('data-colorblind', 'true');
    else document.documentElement.removeAttribute('data-colorblind');
  });
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

/* ===== Profil-Bereich (früher eigene Profilseite) ===== */
function formatDuration(sec) {
  const totalMin = Math.floor(sec / 60);
  if (totalMin < 60) return totalMin + ' min';
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return m ? (h + ' h ' + m + ' min') : (h + ' h');
}

function renderProfile() {
  $('profil-name').value = getUserName();
  const days = getDaysSinceStart();
  const sessions = getSessionCount();
  const dabei = days <= 1 ? 'Heute gestartet' : ('Seit ' + days + ' Tagen dabei');
  $('profil-meta').textContent = dabei + ' · ' + sessions + ' Session' + (sessions === 1 ? '' : 's');
  $('stat-total').textContent = formatDuration(getTotalSeconds());
  $('stat-streak').textContent = getStreak();
  renderWeek();
}

function renderWeek() {
  const row = $('week-row');
  row.innerHTML = '';
  getWeekActivity().forEach(d => {
    const cell = document.createElement('div');
    cell.className = 'day-cell' + (d.trained ? ' trained' : '') + (d.isToday ? ' today' : '') + (d.isFuture ? ' future' : '');
    cell.innerHTML = '<div class="day-lbl">' + d.label + '</div>' +
                     '<div class="day-dot">' + (d.trained ? '<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>' : '') + '</div>';
    row.appendChild(cell);
  });
}

function onResetProgress() {
  if (confirm('Fortschritt und Trainingsstatistik wirklich zurücksetzen?')) {
    resetProgress();
    resetStats();
    // Auch die "schon gesehen"-Markierung der Erklär-Demos zurücksetzen,
    // damit die große Tutorial-Animation beim nächsten Öffnen einer Stufe
    // wieder automatisch erscheint.
    localStorage.removeItem('neuroar_intros_seen');
    renderProfile();
  }
}

$('profil-name').addEventListener('change', () => {
  setUserName($('profil-name').value.trim());
  renderProfile();
});
$('profil-name').addEventListener('keydown', e => { if (e.key === 'Enter') $('profil-name').blur(); });

/* Haptische Rückmeldung für die ganze Einstellungsseite.

   Ein einziger delegierter Listener statt eines pro Bedienelement — so
   bekommen auch später ergänzte Schalter die Rückmeldung automatisch, ohne
   dass man daran denken muss.

   WICHTIG — 'click', nicht 'pointerdown': navigator.vibrate() verlangt eine
   gültige Nutzer-Geste ("transient activation"). Laut HTML-Spezifikation löst
   pointerdown eine solche NUR aus, wenn pointerType "mouse" ist; bei Berührung
   zählen stattdessen pointerup, touchend oder click. Eine erste Fassung hörte
   auf pointerdown — die funktionierte am Rechner mit Maus einwandfrei und war
   auf dem Tablet per Finger wirkungslos, weil Chrome den Aufruf mangels Geste
   verwarf. click funktioniert bei Maus UND Berührung.

   Ein Klick auf ein <label> erzeugt zusätzlich ein synthetisches click auf der
   Checkbox darin, das ebenfalls hier ankommt. Statt das über Selektoren zu
   umgehen (fehleranfällig, sobald sich das Markup ändert) wird zeitlich
   entprellt: zwei Auslöser innerhalb weniger Millisekunden gehören zum selben
   Druck.

   Ausgenommen sind der Lautstärke-Regler (würde beim Ziehen dauerfeuern), das
   Namensfeld (Tippen ist kein Knopfdruck) und der Vibrations-Schalter selbst
   (der meldet sich in initSettingsPage über 'change' zurück). */
(function () {
  const seite = document.querySelector('.screen.settings');
  if (!seite) return;
  let zuletzt = 0;
  seite.addEventListener('click', e => {
    if (e.target.closest('#set-volume, .name-input, #row-vibration')) return;
    if (!e.target.closest('button, .toggle, a')) return;
    const jetzt = performance.now();
    if (jetzt - zuletzt < 50) return;   // Doppelauslösung über das Label
    zuletzt = jetzt;
    vibrate(HAPTIK_MS);
  });
})();

initSettingsPage();
renderProfile();
