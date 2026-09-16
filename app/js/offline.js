/* Offline-Betrieb: Service Worker registrieren. Eigene Datei, weil es keine
   andere gibt, die ALLE Seiten laden — index.html und tiere.html kommen ohne
   common.js aus, sensor-check.html sogar ohne alles. Gerade index.html darf
   nicht fehlen: sie ist die Startseite der installierten App.

   Pfad relativ (sw.js liegt neben den HTML-Dateien), damit es unter /app/
   wie im Root gleich funktioniert. Erst nach 'load', damit die Registrierung
   nicht mit dem Seitenaufbau um das Netz konkurriert. Ohne sichere
   Verbindung (http:// im LAN) gibt es keinen Service Worker — dann läuft die
   App einfach wie bisher online. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline bleibt dann aus, App läuft trotzdem */ });
  });
}
