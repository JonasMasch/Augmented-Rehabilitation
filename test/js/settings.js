/* ============================================================
   NeuroAR Reha — Einstellungen (localStorage)
   Speichert App-weite Einstellungen. Die Einstellungsseite liest/
   schreibt darüber; die Übungen können später getSetting(...) nutzen.
   ============================================================ */

const SETTINGS_KEY = 'neuroar_settings';

const DEFAULT_SETTINGS = {
  // Mein Training
  side: 'links',           // Betroffene Seite (Neglect): 'links' | 'rechts'
  sessionDuration: 20,     // Sitzungsdauer in Minuten: 10 | 15 | 20 | 25
  reminderEnabled: false,  // Tägliche Erinnerung an/aus
  reminderTime: '09:00',   // Uhrzeit der Erinnerung (HH:MM)
  // Ton
  soundOn: true,           // Globaler Ton an/aus
  volume: 70,              // Lautstärke 0–100
  erikaVoice: true,        // Sprachausgabe Erika an/aus
  // Darstellung
  fontSize: 'mittel'       // Schriftgröße: 'klein' | 'mittel' | 'gross'
};

function loadSettings() {
  try {
    return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {});
  } catch(e) {
    return Object.assign({}, DEFAULT_SETTINGS);
  }
}

function getSetting(key) {
  return loadSettings()[key];
}

function setSetting(key, value) {
  const s = loadSettings();
  s[key] = value;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  return s;
}

function resetSettings() {
  localStorage.removeItem(SETTINGS_KEY);
}
