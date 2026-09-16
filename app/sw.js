/* ============================================================
   AURA — Service Worker: Offline-Betrieb

   Aufgabe: alle eigenen Dateien beim Installieren in den Cache legen und
   danach aus dem Cache bedienen. Die App macht zur Laufzeit keinen einzigen
   externen Netzabruf (Schrift, Bilder, Töne — alles liegt hier), deshalb
   reicht es, die eigene Dateiliste zu cachen; es gibt keine Drittquellen,
   die offline fehlen könnten.

   ⚠ VERSION muss bei jeder Auslieferung steigen. Sie steht bewusst in der
   Schreibweise "v=NNN", damit der bestehende Bump-Befehl (sed über app/,
   der die alte Nummer durch die neue ersetzt) sie automatisch mitnimmt. Eine neue
   Version legt einen NEUEN Cache an und löscht den alten beim Aktivieren.
   Vergisst man den Bump, bleibt die alte Fassung auf dem Tablet, egal was
   auf GitHub liegt.

   Wie eine neue Version ankommt: Der Browser prüft sw.js bei jedem Seiten-
   aufruf am HTTP-Cache VORBEI (Standard für das Hauptskript des Service
   Workers). Unterscheidet sich ein Byte, wird der neue Worker installiert,
   übernimmt sofort (skipWaiting + clients.claim), und ab dem nächsten
   Seitenwechsel kommen alle Dateien aus dem neuen Cache. Die gerade offene
   Seite wird NICHT neu geladen — mitten in einer Übung wäre das eine
   Störung; jeder Wechsel zwischen Seiten ist in dieser App ohnehin ein
   voller Seitenaufruf.

   Warum {cache:'reload'} beim Vorabladen: GitHub Pages liefert Dateien mit
   max-age=600. Ohne den Zwang zum Netz würde ein neuer Worker seinen Cache
   aus dem HTTP-Cache füllen und damit ALTE Dateien unter neuem Namen
   einfrieren — genau der Fehler, den der ?v=N-Zusatz im HTML bisher umging.

   Warum ignoreSearch beim Nachschlagen: die Seiten fordern "js/common.js?v=NNN"
   an, im Cache liegt "js/common.js". Die Versionierung übernimmt jetzt der
   Cache-Name; der Query-String ist nur noch Ballast und wird ignoriert.
   Nebenwirkung, bewusst in Kauf genommen: der Trick "?frisch=N" zum
   Erzwingen einer frischen Seite greift mit aktivem Worker nicht mehr —
   dafür braucht es ihn auch nicht mehr, s. o.
   ============================================================ */

const VERSION = 'v=161';
const CACHE = 'aura-' + VERSION;

/* Relativ zum Ort von sw.js, damit der Worker gleich bleibt, egal ob die App
   unter /app/ oder im Root liegt. Nicht dabei: die Icon-PNGs (holt sich das
   Betriebssystem einmal beim Installieren), sw.js selbst, Lizenz- und
   Notiz-Dateien. */
const DATEIEN = [
  './',
  'index.html', 'tiere.html', 'suchen.html', 'verfolgen.html', 'lenken.html',
  'settings.html', 'ueber.html', 'datenschutz.html', 'sensor-check.html',
  'manifest.json',
  'css/common.css', 'css/erika.css', 'css/intro.css', 'css/lenken.css',
  'css/settings.css', 'css/suchen.css', 'css/verfolgen.css',
  'js/badges.js', 'js/common.js', 'js/erika.js', 'js/flow.js', 'js/intro.js',
  'js/kamera.js', 'js/lenken.js', 'js/offline.js', 'js/orientation.js', 'js/session.js',
  'js/settings.js', 'js/settings_page.js', 'js/suchen.js', 'js/verfolgen.js',
  'assets/AURA.webp', 'assets/Apfel.webp', 'assets/Ast.webp', 'assets/Blatt.webp',
  'assets/Blume.webp', 'assets/Eiche_1.webp', 'assets/Eiche_2.webp', 'assets/Hand.svg',
  'assets/Hintergrund.jpeg', 'assets/Kamera.webp', 'assets/Marienkaefer.webp',
  'assets/Marienkaefer_1.webp', 'assets/Marienkaefer_2.webp', 'assets/Marienkaefer_3.webp',
  'assets/Nest.webp', 'assets/Salat.webp', 'assets/Schmetterling.webp',
  'assets/Schnecke.webp', 'assets/Uhu.webp', 'assets/hintergrund_lenken.jpeg',
  'assets/fonts/Luciole-Bold.woff', 'assets/fonts/Luciole-Bold.woff2',
  'assets/fonts/Luciole-Regular.woff', 'assets/fonts/Luciole-Regular.woff2',
  'assets/icons/a-large-small.svg', 'assets/icons/arrow-left.svg', 'assets/icons/camera.svg',
  'assets/icons/chart-column.svg', 'assets/icons/check.svg', 'assets/icons/chevron-right.svg',
  'assets/icons/circle-check.svg', 'assets/icons/circle-question-mark.svg',
  'assets/icons/compass.svg', 'assets/icons/flame.svg', 'assets/icons/info.svg',
  'assets/icons/lock.svg', 'assets/icons/pencil.svg', 'assets/icons/play.svg',
  'assets/icons/refresh-ccw.svg', 'assets/icons/settings.svg', 'assets/icons/target.svg',
  'assets/icons/timer.svg', 'assets/icons/users.svg', 'assets/icons/volume-2.svg'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) {
      return Promise.all(DATEIEN.map(function (url) {
        return fetch(new Request(url, { cache: 'reload' })).then(function (r) {
          if (!r.ok) throw new Error(url + ' → ' + r.status);
          return c.put(url, r);
        });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (namen) {
      return Promise.all(namen.filter(function (n) { return n.indexOf('aura-') === 0 && n !== CACHE; })
                              .map(function (n) { return caches.delete(n); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // fremde Quellen gibt es nicht; falls doch, nicht anfassen

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (treffer) {
      if (treffer) return treffer;
      return fetch(req).then(function (r) {
        /* Was nicht in der Liste stand (z. B. eine Datei, die nach dem Bump
           neu dazukam), landet beim ersten Abruf im Cache — beim nächsten
           Mal ist es dann auch offline da. */
        if (r && r.ok) {
          var kopie = r.clone();
          caches.open(CACHE).then(function (c) { c.put(req, kopie); });
        }
        return r;
      }).catch(function () {
        /* Offline und nicht im Cache: bei einer Seite wenigstens die
           Startseite zeigen statt der Browser-Fehlerseite. */
        if (req.mode === 'navigate') return caches.match('index.html');
        return new Response('', { status: 504, statusText: 'offline' });
      });
    })
  );
});
