/**
 * Redirección rápida de QR dinámicos (+ página intermedia opcional).
 * URL corta: https://generaqr.xyz/r/CODIGO  (404.html o d.html?c=CODIGO)
 */
(function () {
  'use strict';

  const statusEl = document.getElementById('redirect-status');
  const detailEl = document.getElementById('redirect-detail');
  const homeLink = document.getElementById('redirect-home');
  const titleEl = document.getElementById('landing-title');
  const messageEl = document.getElementById('landing-message');
  const hostEl = document.getElementById('landing-host');
  const ctaBtn = document.getElementById('landing-cta');
  const countdownEl = document.getElementById('landing-countdown');
  const skipLink = document.getElementById('landing-skip');

  let targetUrl = '';
  let timer = null;
  let remaining = 0;

  function setStatus(title, detail, isError) {
    if (statusEl) statusEl.textContent = title;
    if (detailEl) {
      detailEl.textContent = detail || '';
      detailEl.style.display = detail ? 'block' : 'none';
    }
    document.body.classList.toggle('is-error', !!isError);
    document.body.classList.remove('is-ready');
  }

  function goNow() {
    if (!targetUrl) return;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (ctaBtn) ctaBtn.disabled = true;
    window.location.replace(targetUrl);
  }

  function startCountdown(seconds) {
    remaining = Math.max(0, seconds | 0);
    if (!countdownEl) return;
    if (remaining <= 0) {
      countdownEl.textContent = '';
      if (skipLink) skipLink.hidden = true;
      // microtask: deja pintar el botón un instante y salta
      setTimeout(goNow, 0);
      return;
    }
    if (skipLink) skipLink.hidden = false;
    const tick = function () {
      countdownEl.textContent = remaining > 0
        ? ('Redirección en ' + remaining + 's…')
        : 'Abriendo…';
      if (remaining <= 0) {
        clearInterval(timer);
        timer = null;
        goNow();
        return;
      }
      remaining -= 1;
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  function showLanding(result) {
    targetUrl = result.targetUrl;
    document.body.classList.remove('is-error');
    document.body.classList.add('is-ready');
    document.title = (result.title || 'Abrir enlace') + ' · GeneraQR';

    if (titleEl) titleEl.textContent = result.title || 'Continuar al enlace';
    if (messageEl) {
      const msg = (result.landingMessage || '').trim();
      messageEl.textContent = msg || 'Estás a punto de abrir el destino de este código QR.';
      messageEl.style.display = 'block';
    }
    if (hostEl) hostEl.textContent = result.destinationHost || result.targetUrl;
    if (ctaBtn) {
      ctaBtn.disabled = false;
      ctaBtn.onclick = goNow;
    }
    if (skipLink) {
      skipLink.href = result.targetUrl;
      skipLink.onclick = function (e) {
        e.preventDefault();
        goNow();
      };
    }
    startCountdown(result.landingCountdown || 0);
  }

  async function run() {
    const api = window.GeneraQRFirebase;
    if (!api) {
      setStatus('Error de carga', 'No se pudo cargar el módulo de Firebase.', true);
      return;
    }

    if (!api.isConfigured()) {
      setStatus(
        'Firebase sin configurar',
        'Edita firebase-config.js con las claves de tu proyecto. Ver FIREBASE_SETUP.md.',
        true
      );
      return;
    }

    const code = api.extractCodeFromLocation();
    if (!code) {
      setStatus('Código no encontrado', 'La URL no incluye un código QR válido.', true);
      if (homeLink) homeLink.hidden = false;
      return;
    }

    setStatus('Abriendo…', '');

    try {
      api.init();
      const result = await api.registerScanAndGetTarget(code);
      targetUrl = result.targetUrl;

      // Por defecto: redirect inmediato (sin página intermedia)
      if (!result.landingEnabled) {
        goNow();
        return;
      }

      showLanding(result);
    } catch (err) {
      console.error(err);
      const msg = (err && err.message) || 'No se pudo abrir este QR.';
      setStatus('No se pudo redirigir', msg, true);
      if (homeLink) homeLink.hidden = false;
    }
  }

  // Arrancar lo antes posible (no esperar DOMContentLoaded si ya está listo)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
