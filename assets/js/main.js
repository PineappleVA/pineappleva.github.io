/* ============================================================
   Pineapple — Portafolio · Scripts comunes
   Sin dependencias: tema claro/oscuro, menú móvil, barra de
   progreso, contadores, tilt 3D y reproductor de juegos.
   (El blog tiene su propio script: blog.js)
   ============================================================ */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Tema claro/oscuro ----------
     El tema se aplica antes de pintar con el script inline del <head>
     (lee localStorage 'pa-theme'; si no hay, usa prefers-color-scheme).
     Aquí solo está el botón que alterna y guarda la elección. */
  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      var next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('pa-theme', next); } catch (e) {}
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', next === 'light' ? '#faf5ea' : '#131007');
    });
  }

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

  /* ---------- Barra de progreso + sombra del header + volver arriba ---------- */
  var progressBar = document.getElementById('progressBar');
  var header = document.querySelector('.site-header');
  var toTop = document.getElementById('toTop');

  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (progressBar) {
      var p = max > 0 ? Math.min(y / max, 1) : 0;
      progressBar.style.transform = 'scaleX(' + p + ')';
    }
    if (header) header.classList.toggle('scrolled', y > 8);
    if (toTop) toTop.classList.toggle('show', y > 480);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  /* ---------- Aparición suave al hacer scroll ---------- */
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

  /* ---------- Contadores animados ---------- */
  var counters = document.querySelectorAll('[data-count]');
  function animateCounter(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (isNaN(target)) return;
    if (reduceMotion || !('requestAnimationFrame' in window)) { el.textContent = String(target); return; }
    var dur = 1300, start = null;
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(eased * target));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if (counters.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var cObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            cObs.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { cObs.observe(el); });
    } else {
      counters.forEach(animateCounter);
    }
  }

  /* ---------- Efecto tilt 3D ---------- */
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  if (finePointer && !reduceMotion) {
    document.querySelectorAll('.tilt').forEach(function (card) {
      var raf = null;
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          card.style.transform =
            'perspective(700px) rotateX(' + (-py * 5).toFixed(2) + 'deg) rotateY(' + (px * 5).toFixed(2) + 'deg) translateY(-4px)';
        });
      });
      card.addEventListener('pointerleave', function () {
        if (raf) cancelAnimationFrame(raf);
        card.style.transform = '';
      });
    });
  }

  /* ---------- Reproductor de juegos (juegos.html) ---------- */
  var gameFrame = document.getElementById('gameFrame');
  var playerShell = document.getElementById('player');
  if (gameFrame && playerShell) {
    var playerCaption = document.getElementById('playerCaption');
    var playerStop = document.getElementById('playerStop');
    var defaultCaption = playerCaption ? playerCaption.textContent : '';
    var gameButtons = document.querySelectorAll('[data-game]');

    gameButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = btn.getAttribute('data-game');
        gameFrame.setAttribute('src', src);
        playerShell.classList.add('playing');
        if (playerCaption) playerCaption.textContent = btn.getAttribute('data-name') || 'Jugando…';
        if (playerStop) playerStop.hidden = false;
        gameButtons.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        playerShell.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });

    if (playerStop) {
      playerStop.addEventListener('click', function () {
        gameFrame.removeAttribute('src');
        playerShell.classList.remove('playing');
        if (playerCaption) playerCaption.textContent = defaultCaption;
        playerStop.hidden = true;
        gameButtons.forEach(function (b) { b.classList.remove('active'); });
      });
    }
  }

  /* ---------- Formulario de contacto → mailto ---------- */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (form.elements['nombre'] || {}).value || '';
      var topic = (form.elements['tema'] || {}).value || 'Consulta';
      var msg = (form.elements['mensaje'] || {}).value || '';
      var subject = '[web] ' + topic + ' — ' + (name || 'sin nombre');
      var body = 'Hola Pineapple:\n\n' + msg + '\n\n— ' + (name || 'anónimo');
      location.href = 'mailto:pineapplevacorp@gmail.com' +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
    });
  }
})();
