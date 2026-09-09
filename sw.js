/* =====================================================================
   KLUS DIENST — service worker
   Bewaart de site in de browser van de bezoeker.

   De regel is eenvoudig:
     • teksten (html)      → altijd eerst vers ophalen, opslag als vangnet
     • opmaak en scripts   → altijd eerst vers ophalen, opslag als vangnet
     • foto's en iconen    → uit de opslag, en stilletjes verversen
     • lettertypen         → uit de opslag, die veranderen toch nooit

   Zo is een wijziging op de site meteen zichtbaar, maar hoeft niemand
   twee keer op dezelfde foto's te wachten.

   LET OP — heb je de site bijgewerkt? Zet het nummer hieronder één hoger.
   Dan gooit elke browser de oude opslag weg en begint schoon opnieuw.
   ===================================================================== */

var VERSIE = 'klusdienst-v1';
var PAGINAS = VERSIE + '-paginas';
var SPULLEN = VERSIE + '-spullen';

/* Wat we alvast klaarzetten bij de eerste installatie. Zo werkt de site
   ook zonder verbinding, al is het maar de voorpagina. */
var METEEN = [
  './',
  'index.html',
  'css/styles.css',
  'js/app.js',
  'js/verfijning.js',
  'icons/icoon-192.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(PAGINAS).then(function (opslag) {
      /* addAll faalt in zijn geheel als één bestand ontbreekt; daarom
         stuk voor stuk, en een ontbrekend bestand slaan we over. */
      return Promise.all(METEEN.map(function (url) {
        return opslag.add(url).catch(function () { return null; });
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (namen) {
      return Promise.all(namen.map(function (naam) {
        /* alles van een oudere versie opruimen */
        if (naam.indexOf(VERSIE) !== 0) return caches.delete(naam);
        return null;
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isAfbeelding(url) {
  return /\.(jpe?g|png|webp|avif|gif|svg|ico)$/i.test(url.pathname);
}
function isLettertype(url) {
  return url.hostname === 'fonts.gstatic.com' || /\.(woff2?|ttf|otf)$/i.test(url.pathname);
}

/* Eerst het net op, en lukt dat niet, dan uit de opslag. */
function eerstHetNet(verzoek, opslagnaam) {
  return fetch(verzoek).then(function (antwoord) {
    if (antwoord && antwoord.ok) {
      var kopie = antwoord.clone();
      caches.open(opslagnaam).then(function (opslag) { opslag.put(verzoek, kopie); });
    }
    return antwoord;
  }).catch(function () {
    return caches.match(verzoek).then(function (bewaard) {
      if (bewaard) return bewaard;
      /* Ook niets in de opslag: dan de voorpagina, of een net briefje. */
      if (verzoek.mode === 'navigate') {
        return caches.match('index.html').then(function (start) {
          return start || nietBereikbaar();
        });
      }
      return nietBereikbaar();
    });
  });
}

/* Eerst uit de opslag, en ondertussen op de achtergrond verversen. */
function eerstDeOpslag(verzoek, opslagnaam) {
  return caches.match(verzoek).then(function (bewaard) {
    var vers = fetch(verzoek).then(function (antwoord) {
      if (antwoord && (antwoord.ok || antwoord.type === 'opaque')) {
        var kopie = antwoord.clone();
        caches.open(opslagnaam).then(function (opslag) { opslag.put(verzoek, kopie); });
      }
      return antwoord;
    }).catch(function () { return bewaard; });
    return bewaard || vers;
  });
}

function nietBereikbaar() {
  return new Response(
    '<!doctype html><html lang="nl"><meta charset="utf-8">' +
    '<title>Geen verbinding</title>' +
    '<style>body{font:16px/1.6 system-ui,sans-serif;background:#15171C;color:#E9E7E1;' +
    'margin:0;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}' +
    'a{color:#FFC02E}</style>' +
    '<div><h1>Even geen verbinding</h1>' +
    '<p>De pagina kon niet geladen worden. Probeer het zo nog eens.</p>' +
    '<p>Liever meteen contact? Bel <a href="tel:+31618504828">06 18 50 48 28</a>.</p></div>',
    { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 503 }
  );
}

self.addEventListener('fetch', function (e) {
  var verzoek = e.request;
  if (verzoek.method !== 'GET') return;

  /* Gaat er hier onverhoopt iets mis, dan bemoeien we ons nergens mee en
     haalt de browser het bestand gewoon zelf op. De site kan door deze
     service worker dus nooit onbereikbaar worden. */
  try {
    var url = new URL(verzoek.url);

    /* Alleen http en https; een blob- of chrome-extensieverzoek laten we los. */
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

    /* Het formulier onderweg naar Formspree nooit onderscheppen. */
    if (url.hostname.indexOf('formspree.io') !== -1) return;

    /* Andere domeinen laten we met rust, behalve de lettertypen. */
    if (url.origin !== self.location.origin) {
      if (isLettertype(url) || url.hostname === 'fonts.googleapis.com') {
        e.respondWith(eerstDeOpslag(verzoek, SPULLEN).catch(function () { return fetch(verzoek); }));
      }
      return;
    }

    if (isAfbeelding(url)) {
      e.respondWith(eerstDeOpslag(verzoek, SPULLEN).catch(function () { return fetch(verzoek); }));
      return;
    }

    e.respondWith(eerstHetNet(verzoek, PAGINAS).catch(function () { return fetch(verzoek); }));
  } catch (fout) {
    /* niets doen: de browser regelt het zelf */
  }
});
