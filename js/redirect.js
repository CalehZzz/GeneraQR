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
  const hostWrap = document.getElementById('landing-dest');
  const ctaBtn = document.getElementById('landing-cta');
  const countdownEl = document.getElementById('landing-countdown');
  const skipLink = document.getElementById('landing-skip');
  const brandEl = document.querySelector('.brand');
  const cardEl = document.querySelector('.card');

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

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  /** Luminancia relativa para decidir texto claro u oscuro sobre el acento. */
  function readableOn(hex) {
    const c = hexToRgb(hex);
    if (!c) return '#FFFFFF';
    const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    return lum > 0.62 ? '#1D1D1F' : '#FFFFFF';
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    if (!c) return 'rgba(10,132,255,' + alpha + ')';
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  function applyTheme(result) {
    const bg = result.landingBg || '#F5F5F7';
    const accent = result.landingAccent || '#0A84FF';
    const text = result.landingText || '#1D1D1F';

    document.body.style.background = bg;
    document.body.style.color = text;
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-soft', rgba(accent, 0.1));

    if (brandEl) {
      brandEl.style.color = accent;
      brandEl.style.display = result.landingShowBrand === false ? 'none' : '';
    }
    if (ctaBtn) {
      ctaBtn.style.background = accent;
      ctaBtn.style.color = readableOn(accent);
      ctaBtn.textContent = result.landingCta || 'Abrir enlace';
    }
    if (hostWrap) {
      hostWrap.style.background = rgba(accent, 0.1);
      hostWrap.style.borderColor = rgba(accent, 0.2);
    }
    if (hostEl) hostEl.style.color = accent;
    if (titleEl) titleEl.style.color = text;
  }

  function showLanding(result) {
    targetUrl = result.targetUrl;
    document.body.classList.remove('is-error');
    document.body.classList.add('is-ready');
    applyTheme(result);

    const heading = (result.landingTitle || result.title || 'Continuar al enlace').trim();
    document.title = heading + ' · GeneraQR';
    if (titleEl) titleEl.textContent = heading;
    if (messageEl) {
      const msg = (result.landingMessage || '').trim();
      messageEl.textContent = msg || 'Estás a punto de abrir el destino de este código QR.';
      messageEl.style.display = 'block';
    }
    if (hostEl) hostEl.textContent = result.destinationHost || result.targetUrl;
    if (hostWrap) hostWrap.style.display = result.landingShowHost === false ? 'none' : '';
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
    const firebaseApi = window.GeneraQRFirebase;
    if (!firebaseApi) {
      setStatus('Error de carga', 'No se pudo cargar el módulo de Firebase.', true);
      return;
    }

    if (!firebaseApi.isConfigured()) {
      setStatus(
        'Firebase sin configurar',
        'Edita firebase-config.js con las claves de tu proyecto. Ver FIREBASE_SETUP.md.',
        true
      );
      return;
    }

    const code = firebaseApi.extractCodeFromLocation();
    if (!code) {
      setStatus('Código no encontrado', 'La URL no incluye un código QR válido.', true);
      if (homeLink) homeLink.hidden = false;
      return;
    }

    setStatus('Abriendo…', '');

    try {
      firebaseApi.init();
      const result = await firebaseApi.registerScanAndGetTarget(code);
      targetUrl = result.targetUrl;

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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
