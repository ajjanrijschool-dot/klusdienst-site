/* =====================================================================
   KLUS DIENST — site-interactie
   Alles zit in één bestand, per onderdeel gegroepeerd. Geen libraries.
   ===================================================================== */
(function () {
  'use strict';

  /* ---------- Instellingen (pas hier aan) ---------- */
  var CONFIG = {
    bedrijf: 'Klus Dienst',
    email: 'Muflehabumadi@gmail.com',
    telefoon: '06 18 50 48 28',
    /* Zet hier het adres van je formulierdienst (bv. Formspree of je eigen
       PHP-script). Laat leeg om het formulier via de mailclient te versturen. */
    formulierEndpoint: 'https://formspree.io/f/mnpqldgy'
  };

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Pagina-intro ---------- */
  function paginaGeladen() { document.body.classList.add('is-loaded'); }
  requestAnimationFrame(paginaGeladen);
  setTimeout(paginaGeladen, 400); /* vangnet: rAF loopt niet in een verborgen tab */
  var jaar = $('[data-year]');
  if (jaar) jaar.textContent = new Date().getFullYear();

  /* ---------- 2. Header, mobiel menu ---------- */
  var head = $('[data-head]');
  var burger = $('[data-burger]');
  var sheet = $('[data-sheet]');
  var menuOpen = false;

  function zetMenu(open) {
    menuOpen = open;
    sheet.hidden = !open;
    burger.setAttribute('aria-expanded', String(open));
    head.classList.toggle('is-open', open);
    document.body.classList.toggle('is-locked', open);
    $('em', burger).textContent = open ? 'Menu sluiten' : 'Menu openen';
  }
  if (burger && sheet) {
    burger.addEventListener('click', function () { zetMenu(!menuOpen); });
    $$('a', sheet).forEach(function (a) {
      a.addEventListener('click', function () { zetMenu(false); });
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menuOpen) zetMenu(false);
  });

  /* ---------- 3. Scroll: header, rail, voortgang, actieve link ---------- */
  var railCursor = $('[data-rail-cursor]');
  var railLabel = $('[data-rail-label]');
  var progress = $('[data-top-progress]');
  var totop = $('[data-totop]');
  var secties = $$('[data-rail-name]');
  var navLinks = $$('.nav a');
  var vorigeY = window.pageYOffset;
  var wacht = false;

  function opScroll() {
    var y = window.pageYOffset;
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    var deel = maxY > 0 ? Math.min(y / maxY, 1) : 0;

    head.classList.toggle('is-stuck', y > 40);
    if (!menuOpen) head.classList.toggle('is-hidden', y > 420 && y > vorigeY);
    vorigeY = y;

    if (progress) progress.style.width = (deel * 100).toFixed(2) + '%';
    if (railCursor) railCursor.style.transform = 'translateY(' + (deel * (window.innerHeight - 8)).toFixed(1) + 'px)';
    if (totop) totop.classList.toggle('is-on', y > 700);

    /* actieve sectie bepalen */
    var actief = secties[0];
    secties.forEach(function (s) {
      if (s.getBoundingClientRect().top <= window.innerHeight * 0.42) actief = s;
    });
    if (actief) {
      var naam = actief.getAttribute('data-rail-name');
      if (railLabel && railLabel.textContent !== naam) railLabel.textContent = naam;
      navLinks.forEach(function (a) {
        a.classList.toggle('is-active', a.getAttribute('href') === '#' + actief.id);
      });
    }
    wacht = false;
  }
  window.addEventListener('scroll', function () {
    if (!wacht) { wacht = true; requestAnimationFrame(opScroll); }
  }, { passive: true });
  window.addEventListener('resize', opScroll);
  opScroll();

  if (totop) {
    totop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
    });
  }

  /* ---------- 4. Onthullen bij scrollen ---------- */
  var teTonen = $$('.reveal, .steps__item');
  if ('IntersectionObserver' in window && !reduced) {
    var kijker = new IntersectionObserver(function (rijen) {
      rijen.forEach(function (rij, i) {
        if (!rij.isIntersecting) return;
        var el = rij.target;
        setTimeout(function () { el.classList.add('is-in'); }, Math.min(i * 60, 240));
        kijker.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    teTonen.forEach(function (el) { kijker.observe(el); });
  } else {
    teTonen.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 5. Tellers ---------- */
  var tellers = $$('[data-count]');
  function telOp(el) {
    var doel = parseFloat(el.getAttribute('data-count'));
    var decimalen = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var achtervoegsel = el.getAttribute('data-suffix') || '';
    var duur = reduced ? 0 : 1200;
    var start = performance.now();

    function toonWaarde(getal) {
      el.textContent = getal.toFixed(decimalen).replace('.', ',') + achtervoegsel;
    }
    function stap(nu) {
      var v = duur ? Math.min((nu - start) / duur, 1) : 1;
      toonWaarde(doel * (1 - Math.pow(1 - v, 3)));
      if (v < 1) requestAnimationFrame(stap);
    }
    requestAnimationFrame(stap);
    setTimeout(function () { toonWaarde(doel); }, duur + 400);
  }
  if ('IntersectionObserver' in window) {
    var telKijker = new IntersectionObserver(function (rijen) {
      rijen.forEach(function (rij) {
        if (!rij.isIntersecting) return;
        telOp(rij.target);
        telKijker.unobserve(rij.target);
      });
    }, { threshold: 0.6 });
    tellers.forEach(function (el) { telKijker.observe(el); });
  } else {
    tellers.forEach(telOp);
  }

  /* ---------- 6. Foto's: plaatshouder tonen zolang het bestand ontbreekt ---------- */
  $$('.shot img, .gal__item img').forEach(function (img) {
    var houder = img.parentNode;
    function gevonden() { houder.classList.add('has-img'); }
    if (img.complete && img.naturalWidth > 0) gevonden();
    else img.addEventListener('load', gevonden);
  });

  /* ---------- 7. Diensten filteren ---------- */
  var chips = $$('.chip');
  var diensten = $$('.svc__item');
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      /* nog een keer op dezelfde knop klikken heft het filter weer op */
      var uitzetten = chip.classList.contains('is-on');
      var soort = uitzetten ? null : chip.getAttribute('data-filter');

      chips.forEach(function (c) {
        var aan = !uitzetten && c === chip;
        c.classList.toggle('is-on', aan);
        c.setAttribute('aria-pressed', String(aan));
      });
      diensten.forEach(function (item) {
        var toon = !soort || item.getAttribute('data-cat') === soort;
        item.classList.toggle('is-out', !toon);
      });
    });
  });

  /* ---------- 8. Projecten: schuifbare fotorij ---------- */
  var galSpoor = $('[data-gallery]');
  if (galSpoor) {
    var vorigeKnop = $('[data-gal="prev"]');
    var volgendeKnop = $('[data-gal="next"]');

    function kaartStap() {
      var kaart = galSpoor.querySelector('.gal__item');
      if (!kaart) return 300;
      var gat = parseFloat(getComputedStyle(galSpoor).columnGap) || 14;
      return kaart.offsetWidth + gat;
    }
    function knoppenBijwerken() {
      if (!vorigeKnop || !volgendeKnop) return;
      var max = galSpoor.scrollWidth - galSpoor.clientWidth - 2;
      vorigeKnop.disabled = galSpoor.scrollLeft <= 2;
      volgendeKnop.disabled = galSpoor.scrollLeft >= max;
    }
    function grens(x) {
      return Math.max(0, Math.min(x, galSpoor.scrollWidth - galSpoor.clientWidth));
    }
    function dichtstbijzijndeKaart(x) {
      var stap = kaartStap();
      return grens(Math.round(x / stap) * stap);
    }

    /* Eigen animatie in plaats van scroll-behavior:smooth. De browser doet dat
       kort en recht-toe-recht-aan; dit loopt langer en remt aan het eind af. */
    var animatie = null;
    function stopAnimatie() {
      if (animatie) cancelAnimationFrame(animatie);
      animatie = null;
      galSpoor.classList.remove('is-animating');
    }
    function animeerNaar(doel, duur) {
      stopAnimatie();
      doel = grens(doel);
      var start = galSpoor.scrollLeft;
      var afstand = doel - start;
      if (reduced || Math.abs(afstand) < 1) {
        galSpoor.scrollLeft = doel;
        knoppenBijwerken();
        return;
      }
      /* het snappen van de browser even uitzetten, anders trekt dat
         tijdens de animatie aan de rij */
      galSpoor.classList.add('is-animating');
      var begin = performance.now();
      function stap(nu) {
        var v = Math.min((nu - begin) / duur, 1);
        /* easeInOutCubic: rustig op gang, zacht uitrollen */
        var e = v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
        galSpoor.scrollLeft = start + afstand * e;
        knoppenBijwerken();
        if (v < 1) {
          animatie = requestAnimationFrame(stap);
        } else {
          animatie = null;
          galSpoor.classList.remove('is-animating');
        }
      }
      animatie = requestAnimationFrame(stap);
    }

    function schuif(richting) {
      /* op brede schermen twee kaarten tegelijk, dat voelt minder traag */
      var aantal = window.innerWidth >= 1180 ? 2 : 1;
      animeerNaar(dichtstbijzijndeKaart(galSpoor.scrollLeft + richting * kaartStap() * aantal), 620);
    }
    if (vorigeKnop) vorigeKnop.addEventListener('click', function () { schuif(-1); });
    if (volgendeKnop) volgendeKnop.addEventListener('click', function () { schuif(1); });

    /* Slepen met de muis, met uitrollen op snelheid. Op een touchscreen doet
       de browser dit zelf beter, dus daar blijven we eraf. */
    var sleept = false, startX = 0, startScroll = 0;
    var laatsteX = 0, laatsteTijd = 0, snelheid = 0, verplaatst = 0;

    galSpoor.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch' || e.button !== 0) return;
      sleept = true;
      verplaatst = 0;
      snelheid = 0;
      startX = laatsteX = e.clientX;
      startScroll = galSpoor.scrollLeft;
      laatsteTijd = performance.now();
      stopAnimatie();
      galSpoor.classList.add('is-dragging');
      galSpoor.setPointerCapture(e.pointerId);
    });

    galSpoor.addEventListener('pointermove', function (e) {
      if (!sleept) return;
      var dx = e.clientX - startX;
      verplaatst = Math.max(verplaatst, Math.abs(dx));
      galSpoor.scrollLeft = startScroll - dx;
      var nu = performance.now();
      var dt = nu - laatsteTijd;
      if (dt > 0) snelheid = (e.clientX - laatsteX) / dt;
      laatsteX = e.clientX;
      laatsteTijd = nu;
      knoppenBijwerken();
    });

    function sleepKlaar() {
      if (!sleept) return;
      sleept = false;
      galSpoor.classList.remove('is-dragging');
      /* even doorrollen in de richting waarin losgelaten is */
      var uitloop = galSpoor.scrollLeft - snelheid * 240;
      animeerNaar(dichtstbijzijndeKaart(uitloop), 620);
    }
    galSpoor.addEventListener('pointerup', sleepKlaar);
    galSpoor.addEventListener('pointercancel', sleepKlaar);
    galSpoor.addEventListener('dragstart', function (e) { e.preventDefault(); });

    /* na slepen niet ook nog de foto groot openen */
    galSpoor.addEventListener('click', function (e) {
      if (verplaatst > 6) {
        e.stopPropagation();
        e.preventDefault();
        verplaatst = 0;
      }
    }, true);

    galSpoor.addEventListener('scroll', function () {
      clearTimeout(galSpoor._t);
      galSpoor._t = setTimeout(knoppenBijwerken, 80);
    }, { passive: true });
    window.addEventListener('resize', knoppenBijwerken);
    knoppenBijwerken();
    setTimeout(knoppenBijwerken, 300);
  }

  /* ---------- 8b. Projecten: lightbox ---------- */
  var galItems = $$('[data-gallery] .gal__item');
  var lb = $('[data-lightbox]');
  if (lb && galItems.length) {
    var lbImg = $('[data-lb-img]', lb);
    var lbTitel = $('[data-lb-title]', lb);
    var lbMeta = $('[data-lb-meta]', lb);
    var huidig = 0;

    function toon(i) {
      huidig = (i + galItems.length) % galItems.length;
      var item = galItems[huidig];
      var foto = item.querySelector('img');
      var titel = item.getAttribute('data-title') || '';
      lbImg.src = item.classList.contains('has-img') && foto ? foto.getAttribute('src') : '';
      lbImg.alt = foto ? foto.getAttribute('alt') : titel;
      lbTitel.textContent = titel;
      lbMeta.textContent = item.getAttribute('data-meta') || '';
    }
    function open(i) {
      toon(i);
      lb.hidden = false;
      document.body.classList.add('is-locked');
      $('[data-lb-close]', lb).focus();
    }
    function sluit() {
      lb.hidden = true;
      document.body.classList.remove('is-locked');
      galItems[huidig].focus();
    }
    galItems.forEach(function (item, i) {
      item.addEventListener('click', function () { open(i); });
    });
    $('[data-lb-close]', lb).addEventListener('click', sluit);
    $('[data-lb-prev]', lb).addEventListener('click', function () { toon(huidig - 1); });
    $('[data-lb-next]', lb).addEventListener('click', function () { toon(huidig + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) sluit(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') sluit();
      if (e.key === 'ArrowLeft') toon(huidig - 1);
      if (e.key === 'ArrowRight') toon(huidig + 1);
    });
  }

  /* ---------- 9. Reviews-slider ----------
     De sectie toont zichzelf pas zodra er een review in staat. Zolang de lijst
     leeg is verdwijnt hij, samen met het menu-item. Zo hoeft er niets aan- of
     uitgezet te worden: kaarten erin plakken is genoeg. */
  var reviewSectie = $('[data-reviews]');
  var reviewLink = $('[data-reviewlink]');
  var track = $('[data-rev-track]');
  var aantalReviews = track ? $$('.rev__card', track).length : 0;

  if (reviewSectie && aantalReviews === 0) {
    reviewSectie.hidden = true;
    /* uit de meetlat halen, anders telt een onzichtbare sectie mee */
    reviewSectie.removeAttribute('data-rail-name');
    secties = $$('[data-rail-name]');
  } else if (reviewSectie) {
    if (reviewLink) reviewLink.hidden = false;
    navLinks = $$('.nav a');
  }

  if (track && aantalReviews > 0) {
    var kaarten = $$('.rev__card', track);
    var dots = $('[data-rev-dots]');
    var index = 0;
    var autoplay;

    kaarten.forEach(function (_, i) {
      var knop = document.createElement('button');
      knop.type = 'button';
      knop.setAttribute('aria-label', 'Review ' + (i + 1));
      knop.addEventListener('click', function () { ga(i, true); });
      dots.appendChild(knop);
    });
    var dotKnoppen = $$('button', dots);

    function markeer() {
      var breedte = kaarten[0].offsetWidth + 16;
      index = Math.round(track.scrollLeft / breedte);
      dotKnoppen.forEach(function (d, i) { d.classList.toggle('is-on', i === index); });
    }
    function ga(i, handmatig) {
      index = (i + kaarten.length) % kaarten.length;
      var breedte = kaarten[0].offsetWidth + 16;
      track.scrollTo({ left: index * breedte, behavior: reduced ? 'auto' : 'smooth' });
      dotKnoppen.forEach(function (d, n) { d.classList.toggle('is-on', n === index); });
      if (handmatig) stopAutoplay();
    }
    function startAutoplay() {
      if (reduced) return;
      autoplay = setInterval(function () {
        var zichtbaar = Math.round(track.offsetWidth / (kaarten[0].offsetWidth + 16));
        ga(index + 1 >= kaarten.length - zichtbaar + 1 ? 0 : index + 1);
      }, 5200);
    }
    function stopAutoplay() { clearInterval(autoplay); }

    $('[data-rev="prev"]').addEventListener('click', function () { ga(index - 1, true); });
    $('[data-rev="next"]').addEventListener('click', function () { ga(index + 1, true); });
    track.addEventListener('scroll', function () {
      clearTimeout(track._t);
      track._t = setTimeout(markeer, 90);
    }, { passive: true });
    track.addEventListener('pointerdown', stopAutoplay);
    track.addEventListener('mouseenter', stopAutoplay);
    track.addEventListener('mouseleave', startAutoplay);
    markeer();
    startAutoplay();
  }

  /* ---------- 10. Veelgestelde vragen ---------- */
  $$('.faq__q').forEach(function (knop) {
    var paneel = knop.parentNode.nextElementSibling;
    knop.addEventListener('click', function () {
      var open = knop.getAttribute('aria-expanded') === 'true';

      $$('.faq__q').forEach(function (ander) {
        if (ander === knop) return;
        ander.setAttribute('aria-expanded', 'false');
        ander.parentNode.nextElementSibling.style.height = '0px';
      });

      knop.setAttribute('aria-expanded', String(!open));
      paneel.style.height = open ? '0px' : paneel.scrollHeight + 'px';
    });
  });

  /* ---------- 11. Offerteformulier ---------- */
  var form = $('[data-form]');
  if (form) {
    var tekstveld = form.querySelector('textarea');
    var teller = $('[data-counter]', form);
    var klaar = $('[data-done]', form);
    var klaarTekst = $('[data-done-text]', form);
    var knopVersturen = $('[data-submit]', form);

    if (tekstveld && teller) {
      tekstveld.addEventListener('input', function () {
        teller.textContent = tekstveld.value.length + ' tekens';
      });
    }

    function fout(veld, bericht) {
      var houder = veld.closest('.field') || veld.closest('.consent');
      if (!houder) return;
      houder.classList.add('has-err');
      var melding = $('[data-err]', houder);
      if (melding) melding.textContent = bericht;
    }
    function schoon(houder) {
      houder.classList.remove('has-err');
      var melding = $('[data-err]', houder);
      if (melding) melding.textContent = '';
    }
    $$('.field, .consent', form).forEach(function (houder) {
      houder.addEventListener('input', function () { schoon(houder); });
      houder.addEventListener('change', function () { schoon(houder); });
    });

    function controleer() {
      var problemen = [];
      var naam = form.naam, tel = form.telefoon, mail = form.email, plaats = form.plaats;
      var bericht = form.bericht, akkoord = form.akkoord;

      if (naam.value.trim().length < 2) { fout(naam, 'Vul uw naam in.'); problemen.push(naam); }
      if (!/^[0-9+\s().-]{9,}$/.test(tel.value.trim())) { fout(tel, 'Vul een geldig telefoonnummer in.'); problemen.push(tel); }
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(mail.value.trim())) { fout(mail, 'Vul een geldig e-mailadres in.'); problemen.push(mail); }
      if (plaats.value.trim().length < 3) { fout(plaats, 'Vul uw postcode of plaats in.'); problemen.push(plaats); }

      var gekozen = $$('input[name="klus"]:checked', form);
      if (!gekozen.length) {
        var set = $('[data-picks]', form).closest('.field');
        set.classList.add('has-err');
        $('[data-err]', set).textContent = 'Kies minstens één onderdeel.';
        problemen.push(set);
      }
      if (bericht.value.trim().length < 15) { fout(bericht, 'Vertel in het kort wat er moet gebeuren (minimaal 15 tekens).'); problemen.push(bericht); }
      if (!akkoord.checked) { fout(akkoord, 'Zet een vinkje om verder te gaan.'); problemen.push(akkoord); }

      return problemen;
    }

    function samenvatting() {
      var data = new FormData(form);
      var klussen = data.getAll('klus').join(', ');
      return [
        'Naam: ' + data.get('naam'),
        'Telefoon: ' + data.get('telefoon'),
        'E-mail: ' + data.get('email'),
        'Postcode/plaats: ' + data.get('plaats'),
        'Type pand: ' + data.get('pand'),
        'Gewenste start: ' + data.get('start'),
        'Werkzaamheden: ' + klussen,
        '',
        'Omschrijving:',
        data.get('bericht')
      ].join('\n');
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var problemen = controleer();
      if (problemen.length) {
        var eerste = problemen[0];
        var richten = eerste.tagName === 'FIELDSET' ? eerste.querySelector('input') : eerste;
        richten.focus();
        eerste.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
        return;
      }

      form.classList.add('is-sending');
      knopVersturen.textContent = 'Bezig met versturen…';

      function gelukt(viaMail) {
        form.classList.remove('is-sending');
        knopVersturen.textContent = 'Aanvraag versturen';
        klaarTekst.textContent = viaMail
          ? 'Uw mailprogramma is geopend met de aanvraag erin. Verstuur de mail om hem bij ons af te leveren.'
          : 'We nemen zo snel mogelijk contact met u op via ' + form.telefoon.value.trim() + '.';
        klaar.hidden = false;
      }

      if (CONFIG.formulierEndpoint) {
        fetch(CONFIG.formulierEndpoint, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form)
        }).then(function (res) {
          if (!res.ok) throw new Error('mislukt');
          gelukt(false);
        }).catch(function () {
          form.classList.remove('is-sending');
          knopVersturen.textContent = 'Aanvraag versturen';
          fout(form.email, 'Versturen lukte niet. Bel ons op ' + CONFIG.telefoon + ' of mail naar ' + CONFIG.email + '.');
        });
      } else {
        var onderwerp = 'Offerteaanvraag via de website — ' + form.naam.value.trim();
        window.location.href = 'mailto:' + CONFIG.email +
          '?subject=' + encodeURIComponent(onderwerp) +
          '&body=' + encodeURIComponent(samenvatting());
        gelukt(true);
      }
    });

    $('[data-reset]', form).addEventListener('click', function () {
      form.reset();
      klaar.hidden = true;
      if (teller) teller.textContent = '0 tekens';
      $$('.has-err', form).forEach(function (h) { schoon(h); });
      form.naam.focus();
    });
  }

  /* ---------- 12. Cookiemelding ----------
     De site zet zelf geen trackingcookies. De keuze van de bezoeker wordt
     opgeslagen in de browser (localStorage), niet in een cookie.
     Ga je later statistieken meten? Zet die code in laadStatistieken();
     die draait alleen als de bezoeker op Accepteren klikt. */
  var COOKIE_SLEUTEL = 'klusdienst-cookiekeuze';
  var melding = $('[data-cookie]');

  function keuzeLezen() {
    try { return localStorage.getItem(COOKIE_SLEUTEL); } catch (e) { return 'noodzakelijk'; }
  }
  function keuzeOpslaan(waarde) {
    try { localStorage.setItem(COOKIE_SLEUTEL, waarde); } catch (e) { /* privemodus */ }
  }

  function laadStatistieken() {
    /* Hier komt je meetcode, bijvoorbeeld van Google Analytics of Plausible.
       Deze functie draait alleen na toestemming. */
  }

  function meldingHoogte() {
    if (!melding) return;
    var hoog = melding.hidden ? 0 : melding.offsetHeight + 14;
    /* alleen op smalle schermen zitten melding en zweefknoppen elkaar in de weg */
    var smal = window.matchMedia('(max-width: 720px)').matches;
    document.documentElement.style.setProperty('--cookiehoogte', (smal ? hoog : 0) + 'px');
  }

  function meldingTonen(tonen) {
    if (!melding) return;
    melding.hidden = !tonen;
    requestAnimationFrame(meldingHoogte);
    setTimeout(meldingHoogte, 80);
  }

  if (melding) {
    var keuze = keuzeLezen();
    if (!keuze) meldingTonen(true);
    else if (keuze === 'alles') laadStatistieken();

    $('[data-cookie-ja]', melding).addEventListener('click', function () {
      keuzeOpslaan('alles');
      laadStatistieken();
      meldingTonen(false);
    });
    $('[data-cookie-nee]', melding).addEventListener('click', function () {
      keuzeOpslaan('noodzakelijk');
      meldingTonen(false);
    });
    $$('[data-cookie-open]').forEach(function (knop) {
      knop.addEventListener('click', function () { meldingTonen(true); });
    });
    window.addEventListener('resize', meldingHoogte);
  }
})();
