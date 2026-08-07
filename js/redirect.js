/**
 * Página de redirección de QR dinámicos.
 * URL corta: https://generaqr.xyz/r/CODIGO  (vía 404.html)
 * Alternativa: https://generaqr.xyz/d.html?c=CODIGO
 */
(function () {
  'use strict';

  const statusEl = document.getElementById('redirect-status');
  const detailEl = document.getElementById('redirect-detail');
  const homeLink = document.getElementById('redirect-home');

  function setStatus(title, detail, isError) {
    if (statusEl) statusEl.textContent = title;
    if (detailEl) {
      detailEl.textContent = detail || '';
      detailEl.style.display = detail ? 'block' : 'none';
    }
    document.body.classList.toggle('is-error', !!isError);
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

    setStatus('Redirigiendo…', 'Registrando escaneo y abriendo el destino.');

    try {
      api.init();
      const result = await api.registerScanAndGetTarget(code);
      setStatus('Listo', 'Abriendo ' + result.targetUrl);
      // Pequeña pausa para que el update de Firestore salga antes de navegar
      setTimeout(function () {
        window.location.replace(result.targetUrl);
      }, 120);
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
