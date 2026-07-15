/* ============================================================
   NeuroAR Reha — gemeinsame Helfer für alle Module
   ============================================================ */

// Kurzschreibweisen
const $ = id => document.getElementById(id);
const appW = () => window.innerWidth;
const appH = () => window.innerHeight;

// Hex-Farbe + Alpha -> rgba()-String
function hexAlpha(hex, a) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

// Zwischen den Screens umschalten (.screen / .screen.active)
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
}

// Einmalig einen SVG-Filter einfügen, der einer Grafik einen gleichmäßigen
// weißen Rand entlang ihrer Form gibt (für Elemente mit Klasse .outlined).
(function addOutlineFilter() {
  if (!document.body || document.getElementById('whiteOutline')) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML =
    '<filter id="whiteOutline" x="-25%" y="-25%" width="150%" height="150%">' +
      // weichzeichnen rundet die Ecken, danach per Alpha-Schwelle wieder scharf machen
      '<feGaussianBlur in="SourceAlpha" stdDeviation="2" result="b"/>' +
      '<feComponentTransfer in="b" result="thick">' +
        '<feFuncA type="linear" slope="12" intercept="-1.6"/>' +
      '</feComponentTransfer>' +
      '<feFlood flood-color="#ffffff"/>' +
      '<feComposite in2="thick" operator="in" result="o"/>' +
      '<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>';
  document.body.appendChild(svg);
})();

// Web-Audio-Dauerton für die Audio-Stufen erzeugen.
// Gibt { ctx, osc, gain } zurück (oder null, falls nicht verfügbar).
function createTone(freq) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    // iOS/Autoplay: ohne Nutzer-Geste startet der Context "suspended" (z. B.
    // im geführten Flow, wenn das Level direkt beim Laden beginnt). Sofort
    // fortsetzen versuchen, sonst bei der nächsten Berührung entsperren.
    if (ctx.state === 'suspended') {
      ctx.resume();
      const unlock = () => { ctx.resume(); window.removeEventListener('pointerdown', unlock); };
      window.addEventListener('pointerdown', unlock);
    }
    return { ctx, osc, gain };
  } catch(e) { return null; }
}
