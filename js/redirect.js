/**
 * Redirección de QR dinámicos (+ página intermedia opcional).
 * URL corta: https://generaqr.xyz/r/CODIGO  (404.html o d.html?c=CODIGO)
 *
 * Usa la API REST de Firestore en lugar del SDK por dos motivos:
 *
 * 1. Velocidad: el SDK son ~400 KB que había que descargar y arrancar antes de
 *    poder leer un solo documento. Un `fetch` resuelve en un viaje.
 * 2. Fiabilidad del contador: el SDK dejaba la escritura del +1 en vuelo y
 *    `location.replace()` la abortaba, así que algunos escaneos no se contaban.
 *    `fetch(..., { keepalive: true })` sobrevive a la navegación.
 */
(function () {
  'use strict';

  const GET_TIMEOUT_MS = 6000;
  const GET_RETRIES = 1;

  const statusEl = document.getElementById('redirect-status');
  const detailEl = document.getElementById('redirect-detail');
  const homeLink = document.getElementById('redirect-home');
  const retryBtn = document.getElementById('redirect-retry');
  const titleEl = document.getElementById('landing-title');
  const messageEl = document.getElementById('landing-message');
  const hostEl = document.getElementById('landing-host');
  const hostWrap = document.getElementById('landing-dest');
  const ctaBtn = document.getElementById('landing-cta');
  const countdownEl = document.getElementById('landing-countdown');
  const skipLink = document.getElementById('landing-skip');
  const brandEl = document.querySelector('.brand');

  let targetUrl = '';
  let timer = null;
  let remaining = 0;

  /* ---------- utilidades ---------- */

  function config() {
    return window.FIREBASE_CONFIG || {};
  }

  function isConfigured() {
    const cfg = config();
    return !!(cfg.apiKey && cfg.projectId) &&
      String(cfg.apiKey).indexOf('TU_') === -1 &&
      String(cfg.projectId).indexOf('TU_') === -1;
  }

  function extractCode() {
    const params = new URLSearchParams(location.search);
    if (params.get('c')) return params.get('c').trim();
    if (params.get('r')) return params.get('r').trim();

    const m = (location.pathname || '').match(/\/r\/([A-Za-z0-9_-]+)\/?$/);
    if (m) return m[1];

    if (location.hash) {
      const hm = location.hash.match(/[#/]*r\/([A-Za-z0-9_-]+)/);
      if (hm) return hm[1];
    }
    return '';
  }

  function todayKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function docBase() {
    return 'https://firestore.googleapis.com/v1/projects/' +
      encodeURIComponent(config().projectId) + '/databases/(default)/documents';
  }

  /** Convierte los valores tipados de la REST API a JS plano. */
  function readField(fields, name) {
    const f = fields && fields[name];
    if (!f) return undefined;
    if ('stringValue' in f) return f.stringValue;
    if ('booleanValue' in f) return f.booleanValue;
    if ('integerValue' in f) return parseInt(f.integerValue, 10);
    if ('doubleValue' in f) return f.doubleValue;
    if ('nullValue' in f) return null;
    return undefined;
  }

  function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const id = setTimeout(function () { controller.abort(); }, timeoutMs);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .finally(function () { clearTimeout(id); });
  }

  async function fetchQrDoc(code) {
    const url = docBase() + '/dynamicQrs/' + encodeURIComponent(code) +
      '?key=' + encodeURIComponent(config().apiKey);

    let lastErr = null;
    for (let attempt = 0; attempt <= GET_RETRIES; attempt++) {
      try {
        const res = await fetchWithTimeout(url, { cache: 'no-store' }, GET_TIMEOUT_MS);
        if (res.status === 404) {
          const err = new Error('Este código QR no existe.');
          err.fatal = true;
          throw err;
        }
        if (res.status === 403) {
          const err = new Error('Este código QR no está disponible.');
          err.fatal = true;
          throw err;
        }
        if (!res.ok) throw new Error('Firestore respondió ' + res.status);
        return await res.json();
      } catch (err) {
        if (err && err.fatal) throw err;
        lastErr = err;
      }
    }
    throw lastErr || new Error('No se pudo consultar el código.');
  }

  /**
   * Suma el escaneo sin retrasar la redirección.
   *
   * Se envía con `sendBeacon`, que está pensado justo para esto: el navegador se
   * encarga de entregarlo aunque la página se cierre o navegue. Además, al ir
   * como `text/plain` (tipo permitido en CORS simple) no hay petición previa
   * OPTIONS que pudiera quedarse a medias. Firestore acepta el cuerpo JSON igual.
   */
  function registerScan(code, versionId) {
    if (!versionId) return null;

    const body = JSON.stringify({
      writes: [{
        transform: {
          document: 'projects/' + config().projectId +
            '/databases/(default)/documents/dynamicQrs/' + code + '/versions/' + versionId,
          fieldTransforms: [
            { fieldPath: 'scansTotal', increment: { integerValue: '1' } },
            { fieldPath: 'dailyCounts.`' + todayKey() + '`', increment: { integerValue: '1' } },
            { fieldPath: 'lastScanAt', setToServerValue: 'REQUEST_TIME' }
          ]
        }
      }]
    });

    const url = docBase().replace(/\/documents$/, '/documents:commit') +
      '?key=' + encodeURIComponent(config().apiKey);
    const type = 'text/plain;charset=UTF-8';

    try {
      if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: type }))) {
        return null; // entregado por el navegador, no hay nada que esperar
      }
    } catch (e) { /* seguimos con fetch */ }

    try {
      return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': type },
        body: body,
        keepalive: true
      }).catch(function (e) {
        console.warn('No se pudo registrar el escaneo:', e);
      });
    } catch (e) {
      console.warn('No se pudo registrar el escaneo:', e);
      return null;
    }
  }

  function supportsKeepalive() {
    try {
      return 'keepalive' in new Request('https://example.com');
    } catch (e) {
      return false;
    }
  }

  /* ---------- interfaz ---------- */

  function setStatus(title, detail, isError) {
    if (statusEl) statusEl.textContent = title;
    if (detailEl) {
      detailEl.textContent = detail || '';
      detailEl.style.display = detail ? 'block' : 'none';
    }
    document.body.classList.toggle('is-error', !!isError);
    document.body.classList.remove('is-ready');
    if (retryBtn) retryBtn.hidden = true;
  }

  function showError(message, options) {
    const opts = options || {};
    setStatus(opts.title || 'No se pudo abrir el enlace', message, true);
    if (homeLink) homeLink.hidden = false;
    if (retryBtn && opts.retry) retryBtn.hidden = false;
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

  /** Texto legible sobre el color de acento elegido. */
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

  function applyTheme(qr) {
    const bg = qr.landingBg || '#F5F5F7';
    const accent = qr.landingAccent || '#0A84FF';
    const text = qr.landingText || '#1D1D1F';

    document.body.style.background = bg;
    document.body.style.color = text;
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-soft', rgba(accent, 0.1));

    if (brandEl) {
      brandEl.style.color = accent;
      brandEl.style.display = qr.landingShowBrand === false ? 'none' : '';
    }
    if (ctaBtn) {
      ctaBtn.style.background = accent;
      ctaBtn.style.color = readableOn(accent);
      ctaBtn.textContent = qr.landingCta || 'Abrir enlace';
    }
    if (hostWrap) {
      hostWrap.style.background = rgba(accent, 0.1);
      hostWrap.style.borderColor = rgba(accent, 0.2);
    }
    if (hostEl) hostEl.style.color = accent;
    if (titleEl) titleEl.style.color = text;
  }

  function destinationHost(url) {
    try {
      return new URL(url).host || url;
    } catch (e) {
      return String(url || '').replace(/^https?:\/\//i, '').split('/')[0] || url;
    }
  }

  function showLanding(qr) {
    document.body.classList.remove('is-error');
    document.body.classList.add('is-ready');
    applyTheme(qr);

    const heading = (qr.landingTitle || qr.title || 'Continuar al enlace').trim();
    document.title = heading + ' · GeneraQR';
    if (titleEl) titleEl.textContent = heading;
    if (messageEl) {
      const msg = (qr.landingMessage || '').trim();
      messageEl.textContent = msg || 'Estás a punto de abrir el destino de este código QR.';
      messageEl.style.display = 'block';
    }
    if (hostEl) hostEl.textContent = destinationHost(qr.targetUrl);
    if (hostWrap) hostWrap.style.display = qr.landingShowHost === false ? 'none' : '';
    if (ctaBtn) {
      ctaBtn.disabled = false;
      ctaBtn.onclick = goNow;
    }
    if (skipLink) {
      skipLink.href = qr.targetUrl;
      skipLink.onclick = function (e) {
        e.preventDefault();
        goNow();
      };
    }
    startCountdown(qr.landingCountdown);
  }

  /* ---------- flujo principal ---------- */

  async function run() {
    if (!isConfigured()) {
      showError('Edita firebase-config.js con las claves de tu proyecto. Ver FIREBASE_SETUP.md.', {
        title: 'Firebase sin configurar'
      });
      return;
    }

    const code = extractCode();
    if (!code) {
      showError('La URL no incluye un código QR válido.', { title: 'Código no encontrado' });
      return;
    }

    setStatus('Abriendo…', '');

    let doc;
    try {
      doc = await fetchQrDoc(code);
    } catch (err) {
      console.error(err);
      showError(err.message || 'No se pudo abrir este QR.', { retry: !err.fatal });
      return;
    }

    const fields = doc && doc.fields;
    const qr = {
      targetUrl: readField(fields, 'targetUrl'),
      currentVersionId: readField(fields, 'currentVersionId'),
      active: readField(fields, 'active'),
      title: readField(fields, 'title') || '',
      landingEnabled: readField(fields, 'landingEnabled') === true,
      landingTitle: readField(fields, 'landingTitle') || '',
      landingMessage: readField(fields, 'landingMessage') || '',
      landingCta: readField(fields, 'landingCta') || 'Abrir enlace',
      landingCountdown: readField(fields, 'landingCountdown'),
      landingBg: readField(fields, 'landingBg') || '#F5F5F7',
      landingAccent: readField(fields, 'landingAccent') || '#0A84FF',
      landingText: readField(fields, 'landingText') || '#1D1D1F',
      landingShowBrand: readField(fields, 'landingShowBrand'),
      landingShowHost: readField(fields, 'landingShowHost')
    };
    if (isNaN(qr.landingCountdown)) qr.landingCountdown = 2;

    if (qr.active === false) {
      showError('Este código QR está desactivado.', { title: 'QR desactivado' });
      return;
    }
    if (!qr.targetUrl) {
      showError('Este QR todavía no tiene destino configurado.', { title: 'Sin destino' });
      return;
    }

    targetUrl = qr.targetUrl;
    const scanRequest = registerScan(code, qr.currentVersionId);

    if (qr.landingEnabled) {
      // Con página intermedia hay tiempo de sobra para que la escritura termine
      showLanding(qr);
      return;
    }

    // Sin keepalive la navegación abortaría el +1: se le da un margen mínimo
    if (scanRequest && !supportsKeepalive()) {
      await Promise.race([
        scanRequest,
        new Promise(function (resolve) { setTimeout(resolve, 700); })
      ]);
    }
    goNow();
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', function () {
      retryBtn.hidden = true;
      run();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
