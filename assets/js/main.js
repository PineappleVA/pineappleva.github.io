/* ============================================================
   Pineapple — Portafolio · Scripts
   Intencionadamente mínimo y "amigable" con Google Translate:
   solo alterna clases y atributos, nunca reestructura el texto,
   de modo que la traducción automática no rompe la página.
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Año del pie ---------- */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* ---------- Menú móvil ---------- */
  var navToggle = document.getElementById('navToggle');
  var siteNav = document.getElementById('siteNav');
  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var open = siteNav.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      navToggle.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    });
    siteNav.addEventListener('click', function (e) {
      if (e.target && e.target.closest && e.target.closest('a')) {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Enlaces de traducción (Google Translate) ----------
     Convierte data-lang en enlaces del tipo:
     https://<dominio-con-guiones>.translate.goog/<ruta>?_x_tr_sl=es&_x_tr_tl=<idioma>
     Funciona en el sitio real (pineappleva.github.io). */
  var langLinks = document.querySelectorAll('a[data-lang]');
  var host = (location.hostname && location.hostname.indexOf('.') !== -1)
    ? location.hostname.replace(/\./g, '-') + '.translate.goog'
    : null;
  var path = location.pathname + location.search;
  langLinks.forEach(function (a) {
    var tl = a.getAttribute('data-lang');
    if (!host || !tl || tl === 'es') return;
    a.href = 'https://' + host + path + '?_x_tr_sl=es&_x_tr_tl=' + encodeURIComponent(tl) + '&_x_tr_hl=es';
  });

  /* ---------- Desplegable de idioma de la cabecera ---------- */
  document.querySelectorAll('[data-dropdown]').forEach(function (dd) {
    var btn = dd.querySelector('button');
    var menu = dd.querySelector('.dropdown-menu');
    if (!btn || !menu) return;

    function setOpen(open) {
      if (open) {
        menu.removeAttribute('hidden');
        btn.setAttribute('aria-expanded', 'true');
        dd.setAttribute('data-open', 'true');
      } else {
        menu.setAttribute('hidden', '');
        btn.setAttribute('aria-expanded', 'false');
        dd.setAttribute('data-open', 'false');
      }
    }

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(menu.hasAttribute('hidden'));
    });
    document.addEventListener('click', function (e) {
      if (!dd.contains(e.target)) setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  });

  /* ---------- Aparición suave al hacer scroll ---------- */
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var revealEls = document.querySelectorAll('.reveal');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { obs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- Sombra del encabezado al desplazar ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }
})();
