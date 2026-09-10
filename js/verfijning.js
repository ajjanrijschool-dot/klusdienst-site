/* =====================================================================
   KLUS DIENST — verfijning
   Dit bestand staat los van app.js en bevat de dingen die een bezoeker
   niet ziet, maar wel merkt: sneller laden, niets kwijtraken in het
   formulier, prettig werken met toetsenbord en telefoon.

   Alles is opgedeeld in kleine onderdelen. Gaat er in één onderdeel iets
   mis, dan blijven de andere gewoon werken — de site valt nooit stil.
   ===================================================================== */
(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var rustig = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Elk onderdeel apart afschermen. Eén fout mag de rest niet meeslepen. */
  function onderdeel(naam, fn) {
    try { fn(); } catch (e) {
      if (window.console && console.warn) console.warn('[verfijning] ' + naam + ' overgeslagen:', e);
    }
  }

  /* ---------- 0. Meldingen voor schermlezers ----------
     Eén onzichtbaar vakje waar we korte berichten in zetten. Wie de site
     met een schermlezer gebruikt, hoort ze; verder ziet niemand ze. */
  var praatvak = null;
  function zeg(tekst) {
    if (!praatvak) {
      praatvak = document.createElement('p');
      praatvak.className = 'visually-hidden';
      praatvak.setAttribute('aria-live', 'polite');
      praatvak.setAttribute('role', 'status');
      document.body.appendChild(praatvak);
    }
    praatvak.textContent = '';
    setTimeout(function () { praatvak.textContent = tekst; }, 60);
  }

  /* ---------- 1. Korte melding in beeld ---------- */
  var toastTimer;
  function melding(tekst) {
    var vak = $('[data-toast]');
    if (!vak) {
      vak = document.createElement('div');
      vak.className = 'toast';
      vak.setAttribute('data-toast', '');
      document.body.appendChild(vak);
    }
    vak.textContent = tekst;
    vak.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { vak.classList.remove('is-on'); }, 2800);
    zeg(tekst);
  }

  /* ---------- 2. Het formulier onthoudt wat er is ingevuld ----------
     Iemand vult het halve formulier in, gaat naar de foto's kijken, komt
     terug — en alles staat er nog. Ook na een misklik of een lege accu.
     De gegevens blijven in de browser van de bezoeker, worden nergens heen
     gestuurd en verlopen na zeven dagen vanzelf. */
  onderdeel('formulier onthouden', function () {
    var form = $('[data-form]');
    if (!form || !('localStorage' in window)) return;

    var SLEUTEL = 'klusdienst-concept';
    var HOUDBAAR = 7 * 24 * 60 * 60 * 1000;
    /* Het vinkje voor toestemming bewaren we bewust niet: dat hoort de
       bezoeker elke keer zelf te zetten. */
    var velden = ['naam', 'telefoon', 'email', 'plaats', 'start', 'pand', 'bericht'];
    var schrijfTimer;

    function wis() {
      try { localStorage.removeItem(SLEUTEL); } catch (e) { /* niets aan te doen */ }
    }
    function lees() {
      try {
        var ruw = localStorage.getItem(SLEUTEL);
        if (!ruw) return null;
        var data = JSON.parse(ruw);
        if (!data || !data.tijd || Date.now() - data.tijd > HOUDBAAR) { wis(); return null; }
        return data;
      } catch (e) { return null; }
    }
    function bewaar() {
      try {
        var data = { tijd: Date.now(), velden: {}, klus: [] };
        var ietsIngevuld = false;
        velden.forEach(function (naam) {
          var veld = form.elements[naam];
          if (!veld) return;
          data.velden[naam] = veld.value;
          if (veld.tagName !== 'SELECT' && veld.value && veld.value.trim()) ietsIngevuld = true;
        });
        data.klus = $$('input[name="klus"]:checked', form).map(function (i) { return i.value; });
        if (data.klus.length) ietsIngevuld = true;
        if (!ietsIngevuld) { wis(); return; }
        localStorage.setItem(SLEUTEL, JSON.stringify(data));
      } catch (e) { /* privémodus of volle opslag: dan bewaren we niet */ }
    }

    function herstel() {
      var data = lees();
      if (!data) return;
      velden.forEach(function (naam) {
        var veld = form.elements[naam];
        if (veld && typeof data.velden[naam] === 'string') veld.value = data.velden[naam];
      });
      (data.klus || []).forEach(function (waarde) {
        $$('input[name="klus"]', form).forEach(function (i) {
          if (i.value === waarde) i.checked = true;
        });
      });
      var teller = $('[data-counter]', form);
      var tekst = form.elements.bericht;
      if (teller && tekst) teller.textContent = tekst.value.length + ' tekens';

      /* Eerlijk zijn tegen de bezoeker: vertellen dát er iets is teruggezet. */
      var balk = document.createElement('p');
      balk.className = 'form__concept';
      balk.innerHTML = 'We hebben uw eerdere invoer bewaard, zodat u niet opnieuw hoeft te beginnen. ' +
        '<button type="button" data-concept-wis>Leegmaken</button>';
      form.insertBefore(balk, form.firstElementChild);
      $('[data-concept-wis]', balk).addEventListener('click', function () {
        wis();
        form.reset();
        if (teller) teller.textContent = '0 tekens';
        balk.parentNode.removeChild(balk);
        form.elements.naam.focus();
        melding('Het formulier is leeggemaakt.');
      });
      zeg('Uw eerder ingevulde gegevens zijn teruggezet in het formulier.');
    }

    form.addEventListener('input', function () {
      clearTimeout(schrijfTimer);
      schrijfTimer = setTimeout(bewaar, 400);
    });
    form.addEventListener('change', bewaar);
    window.addEventListener('pagehide', bewaar);

    /* Is de aanvraag gelukt, dan mag het concept weg. Dat merken we aan het
       bedankvak dat zichtbaar wordt. */
    var klaar = $('[data-done]', form);
    if (klaar && 'MutationObserver' in window) {
      new MutationObserver(function () {
        if (klaar.hidden) return;
        wis();
        var balk = $('.form__concept', form);
        if (balk && balk.parentNode) balk.parentNode.removeChild(balk);
        zeg('Uw aanvraag is verstuurd.');
      }).observe(klaar, { attributes: true, attributeFilter: ['hidden'] });
    }
    var opnieuw = $('[data-reset]', form);
    if (opnieuw) opnieuw.addEventListener('click', wis);

    herstel();
  });

  /* ---------- 3. Niet versturen zonder verbinding ----------
     Zonder dit zou een aanvraag stilletjes mislukken. Nu zeggen we het
     eerlijk, en blijft alles ingevuld staan tot er weer verbinding is. */
  onderdeel('offline gemerkt', function () {
    var form = $('[data-form]');
    if (!form) return;
    document.addEventListener('submit', function (e) {
      if (e.target !== form) return;
      if (navigator.onLine === false) {
        e.preventDefault();
        e.stopPropagation();
        melding('U bent nu offline. Uw gegevens blijven bewaard — probeer het zo nog eens.');
      }
    }, true);
    window.addEventListener('online', function () {
      if ($('.form__concept') || (form.elements.naam && form.elements.naam.value)) melding('U bent weer online.');
    });
  });

  /* ---------- 3b. Wachttijd tussen twee aanvragen ----------
     Na een verstuurde aanvraag blijft de knop vijf minuten uit, met een
     aftelling erbij. Dat voorkomt dubbele aanvragen van iemand die twee keer
     klikt of ongeduldig wordt, en scheelt jou dezelfde klus twee keer in je
     postvak.

     Wat het NIET is: bescherming tegen bots. Een bot laadt deze pagina niet
     en stuurt rechtstreeks naar Formspree. Daar zet je de spamfilter aan.
     Zie LEESMIJ.md punt 4.

     Wil je een andere wachttijd? Pas het aantal minuten hieronder aan. */
  onderdeel('wachttijd tussen aanvragen', function () {
    var MINUTEN = 5;

    var form = $('[data-form]');
    if (!form) return;
    var knop = $('[data-submit]', form);
    var klaar = $('[data-done]', form);
    if (!knop) return;

    var SLEUTEL = 'klusdienst-laatste-aanvraag';
    var WACHT = MINUTEN * 60 * 1000;
    var tikker = null;
    var briefje = null;
    var stondUit = false;

    function laatste() {
      try {
        var t = parseInt(localStorage.getItem(SLEUTEL) || '0', 10);
        /* Een tijd in de toekomst klopt niet (klok verzet): dan negeren we hem,
           anders zit iemand voor niets op slot. */
        return !t || t > Date.now() ? 0 : t;
      } catch (e) { return 0; }
    }
    function noteer() {
      try { localStorage.setItem(SLEUTEL, String(Date.now())); } catch (e) { /* privémodus */ }
    }
    function resterend() {
      var t = laatste();
      return t ? Math.max(0, WACHT - (Date.now() - t)) : 0;
    }
    function klok(ms) {
      var sec = Math.ceil(ms / 1000);
      var s = sec % 60;
      return Math.floor(sec / 60) + ':' + (s < 10 ? '0' + s : s);
    }

    function briefjeTonen(tekst) {
      if (!briefje) {
        briefje = document.createElement('p');
        briefje.className = 'form__wacht';
        knop.parentNode.insertBefore(briefje, knop.nextSibling);
      }
      briefje.innerHTML = tekst;
    }
    function briefjeWeg() {
      if (briefje && briefje.parentNode) briefje.parentNode.removeChild(briefje);
      briefje = null;
    }

    function bijwerken() {
      var over = resterend();

      if (over <= 0) {
        knop.disabled = false;
        briefjeWeg();
        if (tikker) { clearInterval(tikker); tikker = null; }
        if (stondUit) {
          stondUit = false;
          zeg('U kunt weer een aanvraag versturen.');
        }
        return;
      }

      stondUit = true;
      knop.disabled = true;
      briefjeTonen('Uw aanvraag is verstuurd. Om dubbele aanvragen te voorkomen kunt u over ' +
        '<b>' + klok(over) + '</b> nog een aanvraag doen.<br>' +
        'Is het dringend? Bel <a href="tel:+31618504828">06 18 50 48 28</a> — ma t/m za, 9.00–18.00 uur.');
      if (!tikker) tikker = setInterval(bijwerken, 1000);
    }

    /* De tijd pas vastleggen als de aanvraag ook echt gelukt is. Dat zien we
       aan het bedankvak dat zichtbaar wordt. */
    if (klaar && 'MutationObserver' in window) {
      new MutationObserver(function () {
        if (klaar.hidden) return;
        noteer();
        bijwerken();
      }).observe(klaar, { attributes: true, attributeFilter: ['hidden'] });
    }

    /* Vangnet: mocht de knop toch bruikbaar zijn, dan houden we het versturen
       hier alsnog tegen. */
    document.addEventListener('submit', function (e) {
      if (e.target !== form) return;
      var over = resterend();
      if (over <= 0) return;
      e.preventDefault();
      e.stopPropagation();
      bijwerken();
      melding('U kunt over ' + klok(over) + ' opnieuw een aanvraag versturen. Liever meteen contact? Bel 06 18 50 48 28.');
    }, true);

    /* "Nog een aanvraag doen" zet het formulier leeg; daarna moet de knop
       nog steeds uit staan zolang de tijd loopt. */
    var opnieuw = $('[data-reset]', form);
    if (opnieuw) opnieuw.addEventListener('click', function () { setTimeout(bijwerken, 0); });

    bijwerken();
  });

  /* ---------- 4. Toetsenbord blijft binnen menu en lightbox ----------
     Wie met Tab door de site loopt, hoort niet achter een open venster
     terecht te komen. Dit houdt de focus netjes binnen. */
  onderdeel('focus vasthouden', function () {
    var TE_FOCUSSEN = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

    function vangIn(vak) {
      document.addEventListener('keydown', function (e) {
        if (e.key !== 'Tab' || vak.hidden) return;
        var lijst = $$(TE_FOCUSSEN, vak).filter(function (el) {
          return el.offsetWidth > 0 || el.offsetHeight > 0;
        });
        if (!lijst.length) return;
        var eerste = lijst[0], laatste = lijst[lijst.length - 1];
        if (!vak.contains(document.activeElement)) { e.preventDefault(); eerste.focus(); }
        else if (e.shiftKey && document.activeElement === eerste) { e.preventDefault(); laatste.focus(); }
        else if (!e.shiftKey && document.activeElement === laatste) { e.preventDefault(); eerste.focus(); }
      });
    }
    var sheet = $('[data-sheet]');
    var lb = $('[data-lightbox]');
    if (sheet) vangIn(sheet);
    if (lb) vangIn(lb);

    /* Na het sluiten van het menu de focus terug op de menuknop. */
    var burger = $('[data-burger]');
    if (sheet && burger && 'MutationObserver' in window) {
      new MutationObserver(function () {
        if (sheet.hidden) {
          if (sheet.getAttribute('data-was-open') === '1') {
            sheet.setAttribute('data-was-open', '0');
            burger.focus();
          }
        } else {
          sheet.setAttribute('data-was-open', '1');
          var eerste = $(TE_FOCUSSEN, sheet);
          if (eerste) eerste.focus();
        }
      }).observe(sheet, { attributes: true, attributeFilter: ['hidden'] });
    }
  });

  /* ---------- 5. Lightbox: vegen, vooruitladen, terugknop ---------- */
  onderdeel('lightbox verfijnen', function () {
    var lb = $('[data-lightbox]');
    var items = $$('[data-gallery] .gal__item');
    if (!lb || !items.length) return;

    var volgende = $('[data-lb-next]', lb);
    var vorige = $('[data-lb-prev]', lb);
    var sluitKnop = $('[data-lb-close]', lb);
    var beeld = $('[data-lb-img]', lb);
    if (!volgende || !vorige || !sluitKnop || !beeld) return;

    /* Vegen op een telefoon. */
    var startX = 0, startY = 0, bezig = false;
    lb.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      bezig = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (!bezig) return;
      bezig = false;
      var t = e.changedTouches[0];
      var dx = t.clientX - startX, dy = t.clientY - startY;
      if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy)) return;
      (dx < 0 ? volgende : vorige).click();
    }, { passive: true });

    /* De volgende en de vorige foto vast op de achtergrond ophalen, zodat
       doorbladeren geen wachten wordt. */
    function laadVast(i) {
      var item = items[(i + items.length) % items.length];
      var img = item && item.querySelector('img');
      if (!img) return;
      var bron = img.getAttribute('src');
      if (!bron) return;
      var voor = new Image();
      voor.src = bron;
    }
    function huidigeIndex() {
      var bron = beeld.getAttribute('src');
      if (!bron) return 0;
      for (var i = 0; i < items.length; i++) {
        var img = items[i].querySelector('img');
        if (img && bron.indexOf(img.getAttribute('src')) !== -1) return i;
      }
      return 0;
    }
    if ('MutationObserver' in window) {
      new MutationObserver(function () {
        var i = huidigeIndex();
        laadVast(i + 1);
        laadVast(i - 1);
      }).observe(beeld, { attributes: true, attributeFilter: ['src'] });
    }

    /* Op een telefoon verwacht je dat de terugknop de foto sluit en niet de
       hele site verlaat. */
    if (window.history && history.pushState && 'MutationObserver' in window) {
      var doorOns = false;
      new MutationObserver(function () {
        if (!lb.hidden) {
          history.pushState({ lightbox: true }, '');
        } else if (history.state && history.state.lightbox && !doorOns) {
          doorOns = true;
          history.back();
          setTimeout(function () { doorOns = false; }, 80);
        }
      }).observe(lb, { attributes: true, attributeFilter: ['hidden'] });

      window.addEventListener('popstate', function () {
        if (lb.hidden) return;
        doorOns = true;
        sluitKnop.click();
        setTimeout(function () { doorOns = false; }, 80);
      });
    }
  });

  /* ---------- 6. De animatie pas laden wanneer hij nodig is ----------
     De animatie is het zwaarste onderdeel van de pagina. Hij hoeft niet mee
     te laden vóór de tekst en de knoppen er staan. Wie een dure of trage
     verbinding heeft, krijgt een knop in plaats van een automatische
     download — dat scheelt data en wachten. */
  onderdeel('animatie slim laden', function () {
    var film = $('.hero__film');
    if (!film) return;
    var frame = film.querySelector('iframe');
    if (!frame) return;

    /* Het adres staat in data-src, zodat de browser er tijdens het laden van
       de pagina nog niets mee doet. Wij bepalen wanneer hij aan de beurt is. */
    var bron = frame.getAttribute('data-src') || frame.getAttribute('src');
    if (!bron) return;
    if (frame.hasAttribute('src')) frame.removeAttribute('src');

    var verbinding = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    var zuinig = !!(verbinding && (verbinding.saveData ||
      /^(2g|3g|slow-2g)$/.test(String(verbinding.effectiveType || ''))));

    var geladen = false;
    function laad() {
      if (geladen) return;
      geladen = true;
      frame.setAttribute('src', bron);
    }

    if (zuinig) {
      var knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'film__start';
      knop.innerHTML = '<span aria-hidden="true">&#9654;</span> Animatie afspelen';
      knop.addEventListener('click', function () {
        laad();
        if (knop.parentNode) knop.parentNode.removeChild(knop);
      });
      film.appendChild(knop);
      return;
    }

    /* Anders: laden zodra hij bijna in beeld komt, en anders zodra de
       browser even niets te doen heeft. */
    if ('IntersectionObserver' in window) {
      var kijker = new IntersectionObserver(function (rijen) {
        if (rijen.some(function (r) { return r.isIntersecting; })) { laad(); kijker.disconnect(); }
      }, { rootMargin: '300px' });
      kijker.observe(film);
    }
    if (window.requestIdleCallback) requestIdleCallback(laad, { timeout: 2500 });
    else setTimeout(laad, 1500);
  });

  /* ---------- 7. Veelgestelde vragen: de hoogte klopt altijd ----------
     De hoogte van een open antwoord staat in pixels. Draait iemand zijn
     telefoon, of komt het lettertype later binnen, dan klopt die hoogte
     niet meer en valt er tekst weg. Hier rekenen we hem opnieuw uit. */
  onderdeel('vragen herberekenen', function () {
    var knoppen = $$('.faq__q');
    if (!knoppen.length) return;

    function bijwerken() {
      knoppen.forEach(function (knop) {
        var paneel = knop.parentNode.nextElementSibling;
        if (!paneel || knop.getAttribute('aria-expanded') !== 'true') return;
        paneel.style.height = 'auto';
        var hoogte = paneel.scrollHeight;
        paneel.style.height = hoogte + 'px';
      });
    }
    var wacht;
    window.addEventListener('resize', function () {
      clearTimeout(wacht);
      wacht = setTimeout(bijwerken, 150);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(bijwerken);

    /* Rechtstreeks naar een vraag linken: index.html#vraag-3 klapt hem open. */
    function uitHash() {
      var m = /^#vraag-(\d+)$/.exec(window.location.hash);
      if (!m) return;
      var knop = knoppen[parseInt(m[1], 10) - 1];
      if (!knop || knop.getAttribute('aria-expanded') === 'true') return;
      knop.click();
      setTimeout(function () {
        knop.scrollIntoView({ block: 'center', behavior: rustig ? 'auto' : 'smooth' });
        knop.focus();
      }, 140);
    }
    window.addEventListener('hashchange', uitHash);
    uitHash();
  });

  /* ---------- 8. Het telefoonnummer op een computer ----------
     Op een telefoon opent tel: gewoon de belapp. Op een computer gebeurt er
     meestal niets, of springt er een programma open dat niemand gebruikt.
     Daar kopiëren we het nummer in plaats daarvan. */
  onderdeel('nummer kopiëren', function () {
    var achterEenBureau = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!achterEenBureau || !navigator.clipboard) return;

    $$('a[href^="tel:"]').forEach(function (link) {
      link.addEventListener('click', function (e) {
        var nummer = link.getAttribute('href').replace('tel:', '');
        e.preventDefault();
        navigator.clipboard.writeText(nummer).then(function () {
          melding('Telefoonnummer gekopieerd: ' + nummer);
        }).catch(function () {
          window.location.href = link.getAttribute('href');
        });
      });
    });
  });

  /* ---------- 9. De volgende pagina alvast ophalen ----------
     Gaat de muis over een link naar een andere pagina, dan halen we die
     pagina op de achtergrond op. Klikt de bezoeker, dan staat hij er
     meteen. Eén keer per link, en niet op een dure verbinding. */
  onderdeel('vooruit ophalen', function () {
    var verbinding = navigator.connection;
    if (verbinding && (verbinding.saveData || /^(2g|3g|slow-2g)$/.test(String(verbinding.effectiveType || '')))) return;

    var gedaan = {};
    function haalOp(url) {
      if (!url || gedaan[url]) return;
      gedaan[url] = true;
      var l = document.createElement('link');
      l.rel = 'prefetch';
      l.href = url;
      document.head.appendChild(l);
    }
    $$('a[href$=".html"]').forEach(function (a) {
      if (a.hostname && a.hostname !== window.location.hostname) return;
      var pak = function () { haalOp(a.getAttribute('href')); };
      a.addEventListener('mouseenter', pak, { once: true });
      a.addEventListener('touchstart', pak, { once: true, passive: true });
      a.addEventListener('focus', pak, { once: true });
    });
  });

  /* ---------- 10. Links naar buiten veilig maken ---------- */
  onderdeel('buitenlinks', function () {
    $$('a[target="_blank"]').forEach(function (a) {
      var rel = (a.getAttribute('rel') || '').split(/\s+/).filter(Boolean);
      if (rel.indexOf('noopener') === -1) rel.push('noopener');
      if (rel.indexOf('noreferrer') === -1) rel.push('noreferrer');
      a.setAttribute('rel', rel.join(' '));
    });
  });

  /* ---------- 11. Foto's laten decoderen buiten de hoofdlijn ---------- */
  onderdeel('foto-overgang', function () {
    $$('img').forEach(function (img) {
      if (!img.getAttribute('decoding')) img.setAttribute('decoding', 'async');
    });
  });

  /* ---------- 12. De site in de achtergrondopslag ----------
     De service worker bewaart de foto's, de opmaak en de lettertypen in de
     browser van de bezoeker. De tweede keer staat de site er vrijwel
     meteen, en met een haperende verbinding blijft hij bereikbaar.
     Teksten worden altijd vers opgehaald, dus een wijziging is direct
     zichtbaar. Zie sw.js. */
  onderdeel('achtergrondopslag', function () {
    if (!('serviceWorker' in navigator)) return;
    var lokaal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (location.protocol !== 'https:' && !lokaal) return;
    window.addEventListener('load', function () {
      /* Vanaf de hoofdmap, zodat het ook klopt op een foutpagina die diep
         in de site wordt getoond. */
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .catch(function () { /* lukt niet, dan werkt de site gewoon zonder */ });
    });
  });

  /* ---------- 13. Printen ----------
     Vlak voor het printen alle vragen openklappen, anders komt er een vel
     papier met alleen kopjes uit de printer. */
  onderdeel('printen', function () {
    window.addEventListener('beforeprint', function () {
      $$('.faq__p, .faq__a, .faq__paneel').forEach(function (paneel) {
        paneel.style.height = 'auto';
      });
      $$('.faq__q').forEach(function (knop) {
        var paneel = knop.parentNode.nextElementSibling;
        if (paneel) paneel.style.height = 'auto';
      });
    });
  });

})();
