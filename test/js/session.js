/* ============================================================
   NeuroAR Reha — Trainingsstatistik (localStorage)
   Hält: erstes Trainingsdatum, Gesamtzeit, Anzahl Sessions,
   Zeit pro Tag (für Tagesziel, Streak, Wochenansicht) und Name.
   Übungen rufen addTrainingSeconds(sek) beim Abschließen auf.
   ============================================================ */

const STATS_KEY = 'neuroar_stats';

// --- Datums-Helfer ---
function dateKey(d) {
  return d.getFullYear() + '-' +
         String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}
function todayStr() { return dateKey(new Date()); }
function parseKey(k) { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); }
function stripTime(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

// --- Speicher ---
function loadStats() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem(STATS_KEY)); } catch (e) {}
  if (!o || !o.days) o = { firstDate: null, totalSeconds: 0, days: {}, goalDays: {}, userName: '' };
  if (!o.goalDays) o.goalDays = {};   // goalDays = Tage mit erreichtem Tagesziel
  return o;
}
function saveStats(o) { localStorage.setItem(STATS_KEY, JSON.stringify(o)); }

// Stellt sicher, dass ein Startdatum existiert (= "dabei seit")
function ensureStarted() {
  const o = loadStats();
  if (!o.firstDate) { o.firstDate = todayStr(); saveStats(o); }
  return o;
}

// Eine abgeschlossene Übung mit ihrer Dauer verbuchen
function addTrainingSeconds(sec) {
  const o = loadStats();
  const s = Math.max(0, sec || 0);
  if (!o.firstDate) o.firstDate = todayStr();
  const t = todayStr();
  o.days[t] = (o.days[t] || 0) + s;
  o.totalSeconds += s;
  // Tagesziel heute erstmals erreicht? -> als Session zählen
  if (!o.goalDays[t] && o.days[t] >= getDailyGoalMinutes() * 60) {
    o.goalDays[t] = true;
  }
  saveStats(o);
  return o.days[t];
}

// --- Abfragen ---
function getTodaySeconds() { return loadStats().days[todayStr()] || 0; }
function getTotalSeconds() { return loadStats().totalSeconds; }
// Session = Tag, an dem das Tagesziel erreicht wurde
function getSessionCount() { return Object.keys(loadStats().goalDays).length; }
function getDailyGoalMinutes() {
  try { return loadSettings().sessionDuration || 20; } catch (e) { return 20; }
}

function getDaysSinceStart() {
  const f = loadStats().firstDate;
  if (!f) return 0;
  const ms = stripTime(new Date()) - stripTime(parseKey(f));
  return Math.floor(ms / 86400000) + 1;
}

// Aufeinanderfolgende Trainingstage (heute oder gestern als Start)
function getStreak() {
  const o = loadStats();
  const trained = d => (o.days[dateKey(d)] || 0) > 0;
  let d = new Date();
  if (!trained(d)) d.setDate(d.getDate() - 1); // Streak läuft bis heute Abend weiter
  let streak = 0;
  while (trained(d)) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

// Aufeinanderfolgende Tage mit erreichtem Tagesziel
function getGoalStreak() {
  const o = loadStats();
  const reached = d => !!o.goalDays[dateKey(d)];
  let d = new Date();
  if (!reached(d)) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (reached(d)) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

// Aktuelle Woche (Mo–So) als Aktivitätsliste
function getWeekActivity() {
  const o = loadStats();
  const labels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
  const now = new Date();
  const offset = (now.getDay() + 6) % 7; // 0 = Montag
  const monday = new Date(now); monday.setDate(now.getDate() - offset);
  const today0 = stripTime(now);
  const arr = [];
  for (let i = 0; i < 7; i++) {
    const dd = new Date(monday); dd.setDate(monday.getDate() + i);
    const k = dateKey(dd);
    arr.push({
      label: labels[i],
      trained: (o.days[k] || 0) > 0,
      isToday: k === todayStr(),
      isFuture: stripTime(dd) > today0
    });
  }
  return arr;
}

// --- Name ---
function getUserName() { return loadStats().userName || ''; }
function setUserName(name) { const o = loadStats(); o.userName = name; saveStats(o); }

// Trainingsstatistik zurücksetzen (Name + Startdatum bleiben)
function resetStats() {
  const o = loadStats();
  saveStats({ firstDate: o.firstDate, totalSeconds: 0, days: {}, goalDays: {}, userName: o.userName });
}

// Beim Laden: Startdatum festhalten (App erstmals geöffnet)
ensureStarted();
