/**
 * Panel UI de QR dinámicos + barra de sesión Google.
 * Depende de GeneraQRFirebase y (opcional) QRCodeStyling en la página.
 */
(function () {
  'use strict';

  const api = () => window.GeneraQRFirebase;
  let currentUser = null;
  let selectedQrId = null;
  let listCache = [];
  let detailQr = null;
  let versionsCache = [];
  let previewQr = null;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
  }

  function formatDate(ts) {
    if (!ts) return '—';
    try {
      const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
      return d.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return '—';
    }
  }

  function showToast(msg, isError) {
    const el = $('dyn-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => el.classList.remove('show'), 3200);
  }

  function setAuthUI(user) {
    currentUser = user;
    const loggedOut = $('auth-logged-out');
    const loggedIn = $('auth-logged-in');
    const gate = $('dyn-auth-gate');
    const app = $('dyn-app');

    if (loggedOut) loggedOut.hidden = !!user;
    if (loggedIn) loggedIn.hidden = !user;

    if (user) {
      const nameEl = $('auth-user-name');
      const avatarEl = $('auth-user-avatar');
      if (nameEl) nameEl.textContent = user.displayName || user.email || 'Cuenta';
      if (avatarEl) {
        if (user.photoURL) {
          avatarEl.src = user.photoURL;
          avatarEl.hidden = false;
        } else {
          avatarEl.hidden = true;
        }
      }
    }

    if (gate) gate.hidden = !!user;
    if (app) app.hidden = !user;

    if (user) {
      refreshList();
    } else {
      selectedQrId = null;
      detailQr = null;
      const detail = $('dyn-detail');
      if (detail) detail.hidden = true;
      const empty = $('dyn-list-empty');
      const list = $('dyn-list');
      if (list) list.innerHTML = '';
      if (empty) empty.hidden = false;
    }
  }

  function configBanner() {
    const banner = $('dyn-config-banner');
    if (!banner) return;
    try {
      if (!api() || !api().isConfigured()) {
        banner.hidden = false;
      } else {
        banner.hidden = true;
      }
    } catch (e) {
      banner.hidden = false;
    }
  }

  async function handleSignIn() {
    try {
      configBanner();
      if (!api().isConfigured()) {
        showToast('Configura firebase-config.js primero. Ver FIREBASE_SETUP.md', true);
        return;
      }
      api().init();
      await api().signInWithGoogle();
      showToast('Sesión iniciada');
    } catch (err) {
      console.error(err);
      const code = err && err.code;
      let msg = (err && err.message) || 'No se pudo iniciar sesión.';
      if (code === 'auth/unauthorized-domain') {
        msg = 'Añade este dominio en Firebase Authentication → Settings → Authorized domains.';
      } else if (code === 'auth/popup-blocked') {
        msg = 'El navegador bloqueó la ventana de Google. Permite popups e inténtalo de nuevo.';
      } else if (code === 'auth/popup-closed-by-user') {
        msg = 'Inicio de sesión cancelado.';
      }
      showToast(msg, true);
    }
  }

  async function handleSignOut() {
    try {
      await api().signOut();
      showToast('Sesión cerrada');
    } catch (err) {
      showToast(err.message || 'Error al cerrar sesión', true);
    }
  }

  async function refreshList() {
    const list = $('dyn-list');
    const empty = $('dyn-list-empty');
    const loading = $('dyn-list-loading');
    if (loading) loading.hidden = false;
    try {
      listCache = await api().listMyDynamicQrs();
      if (!list) return;
      list.innerHTML = '';
      if (!listCache.length) {
        if (empty) empty.hidden = false;
      } else {
        if (empty) empty.hidden = true;
        listCache.forEach((qr) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'dyn-list-item' + (qr.id === selectedQrId ? ' active' : '');
          btn.dataset.id = qr.id;
          btn.innerHTML =
            '<span class="dyn-list-title">' + escapeHtml(qr.title || qr.id) + '</span>' +
            '<span class="dyn-list-meta">' + escapeHtml(api().shortLink(qr.id)) + '</span>' +
            (qr.active === false ? '<span class="dyn-badge warn">Inactivo</span>' : '');
          btn.addEventListener('click', () => openDetail(qr.id));
          list.appendChild(btn);
        });
      }
    } catch (err) {
      console.error(err);
      showToast(explainFirestoreError(err), true);
    } finally {
      if (loading) loading.hidden = true;
    }
  }

  function explainFirestoreError(err) {
    const code = err && err.code;
    if (code === 'permission-denied') {
      return 'Permiso denegado en Firestore. Publica firestore.rules y crea el índice compuesto si Firebase lo pide.';
    }
    if (code === 'failed-precondition') {
      return 'Falta un índice en Firestore. Abre el enlace del error en la consola del navegador para crearlo.';
    }
    return (err && err.message) || 'Error de Firestore.';
  }

  async function openDetail(id) {
    selectedQrId = id;
    document.querySelectorAll('.dyn-list-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === id);
    });
    const detail = $('dyn-detail');
    const loading = $('dyn-detail-loading');
    if (detail) detail.hidden = false;
    if (loading) loading.hidden = false;

    try {
      detailQr = await api().getDynamicQr(id);
      if (!detailQr) throw new Error('QR no encontrado.');
      versionsCache = await api().listVersions(id);
      renderDetail();
    } catch (err) {
      console.error(err);
      showToast(explainFirestoreError(err), true);
    } finally {
      if (loading) loading.hidden = true;
    }
  }

  function currentVersion() {
    if (!detailQr) return null;
    return versionsCache.find((v) => v.id === detailQr.currentVersionId) || versionsCache[0] || null;
  }

  function renderDetail() {
    if (!detailQr) return;
    const shortUrl = api().shortLink(detailQr.id);
    $('dyn-detail-title').textContent = detailQr.title || detailQr.id;
    $('dyn-detail-link').textContent = shortUrl;
    $('dyn-detail-link').href = shortUrl;
    $('dyn-title-input').value = detailQr.title || '';
    $('dyn-target-input').value = detailQr.targetUrl || '';

    const ver = currentVersion();
    const stats = ver && ver.stats
      ? ver.stats
      : { daily: 0, monthly: 0, total: 0 };

    $('dyn-stat-daily').textContent = String(stats.daily);
    $('dyn-stat-monthly').textContent = String(stats.monthly);
    $('dyn-stat-total').textContent = String(stats.total);

    // Totales de todas las versiones
    let life = 0;
    versionsCache.forEach((v) => { life += (v.stats && v.stats.total) || v.scansTotal || 0; });
    const lifeEl = $('dyn-stat-lifetime');
    if (lifeEl) lifeEl.textContent = String(life);

    const activeNote = $('dyn-active-note');
    if (activeNote) {
      activeNote.textContent = detailQr.active === false
        ? 'Este QR está desactivado: los escaneos ya no redirigen.'
        : 'Las estadísticas de arriba son de la versión actual del enlace. Si cambias la URL, se reinician los contadores en una versión nueva.';
    }

    const landingEnabled = $('dyn-landing-enabled');
    const landingMessage = $('dyn-landing-message');
    const landingCountdown = $('dyn-landing-countdown');
    if (landingEnabled) landingEnabled.checked = detailQr.landingEnabled === true;
    if (landingMessage) landingMessage.value = detailQr.landingMessage || '';
    if (landingCountdown) {
      const c = parseInt(detailQr.landingCountdown, 10);
      landingCountdown.value = String(isNaN(c) ? 2 : c);
    }

    renderChart(ver && ver.dailyCounts);
    renderVersions();
    renderPreview(shortUrl);
  }

  function renderChart(dailyCounts) {
    const chart = $('dyn-chart');
    const peakEl = $('dyn-chart-peak');
    if (!chart) return;
    const series = api().buildDailySeries(dailyCounts || {}, 14);
    const max = Math.max.apply(null, series.map((p) => p.count).concat([0]));
    if (peakEl) peakEl.textContent = max > 0 ? ('Pico: ' + max) : 'Sin escaneos aún';
    chart.innerHTML = '';
    if (max === 0) {
      chart.innerHTML = '<div class="dyn-chart-empty" style="width:100%;">Todavía no hay escaneos en estos 14 días.</div>';
      return;
    }
    series.forEach((p) => {
      const col = document.createElement('div');
      col.className = 'dyn-chart-bar';
      const h = Math.max(3, Math.round((p.count / max) * 100));
      col.innerHTML = '<i style="height:' + h + '%" title="' + escapeHtml(p.date) + ': ' + p.count + '"></i><em>' + escapeHtml(p.label) + '</em>';
      chart.appendChild(col);
    });
  }

  function renderVersions() {
    const wrap = $('dyn-versions');
    if (!wrap) return;
    wrap.innerHTML = '';
    if (!versionsCache.length) {
      wrap.innerHTML = '<p class="field-hint">Sin versiones todavía.</p>';
      return;
    }
    versionsCache.forEach((v, idx) => {
      const isCurrent = detailQr && v.id === detailQr.currentVersionId;
      const card = document.createElement('div');
      card.className = 'dyn-version-card' + (isCurrent ? ' current' : '');
      const s = v.stats || { daily: 0, monthly: 0, total: 0 };
      card.innerHTML =
        '<div class="dyn-version-head">' +
          '<strong>' + (isCurrent ? 'Versión actual' : ('Versión ' + (versionsCache.length - idx))) + '</strong>' +
          (isCurrent ? '<span class="dyn-badge">Activa</span>' : '<span class="dyn-badge muted">Anterior</span>') +
        '</div>' +
        '<div class="dyn-version-url">' + escapeHtml(v.targetUrl || '') + '</div>' +
        '<div class="dyn-version-meta">Desde ' + escapeHtml(formatDate(v.createdAt)) +
          (v.endedAt ? ' · Hasta ' + escapeHtml(formatDate(v.endedAt)) : '') +
        '</div>' +
        '<div class="dyn-version-stats">' +
          '<span><b>' + s.daily + '</b> hoy</span>' +
          '<span><b>' + s.monthly + '</b> mes</span>' +
          '<span><b>' + s.total + '</b> total</span>' +
        '</div>';
      wrap.appendChild(card);
    });
  }

  function renderPreview(shortUrl) {
    const holder = $('dyn-qr-holder');
    if (!holder) return;
    holder.innerHTML = '';
    if (typeof QRCodeStyling === 'undefined') {
      holder.innerHTML = '<p class="field-hint">Vista previa no disponible.</p>';
      return;
    }
    previewQr = new QRCodeStyling({
      width: 220,
      height: 220,
      type: 'canvas',
      data: shortUrl,
      margin: 8,
      qrOptions: { errorCorrectionLevel: 'M' },
      dotsOptions: { type: 'rounded', color: '#1D1D1F' },
      cornersSquareOptions: { type: 'extra-rounded', color: '#1D1D1F' },
      cornersDotOptions: { type: 'dot', color: '#1D1D1F' },
      backgroundOptions: { color: '#FFFFFF' }
    });
    previewQr.append(holder);
  }

  async function handleCreate(e) {
    e.preventDefault();
    const title = $('dyn-new-title').value;
    const target = $('dyn-new-target').value;
    const btn = $('dyn-create-btn');
    if (btn) btn.disabled = true;
    try {
      const created = await api().createDynamicQr({ title, targetUrl: target });
      $('dyn-new-title').value = '';
      $('dyn-new-target').value = '';
      showToast('QR dinámico creado');
      await refreshList();
      await openDetail(created.id);
    } catch (err) {
      console.error(err);
      showToast(explainFirestoreError(err), true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function handleChangeUrl(e) {
    e.preventDefault();
    if (!selectedQrId) return;
    const url = $('dyn-target-input').value;
    if (!confirm('¿Cambiar el destino? Se creará una versión nueva con estadísticas en cero. El código QR impreso seguirá siendo el mismo.')) {
      return;
    }
    const btn = $('dyn-save-target-btn');
    if (btn) btn.disabled = true;
    try {
      await api().changeDestination(selectedQrId, url);
      showToast('Nueva versión creada · contadores reiniciados');
      await refreshList();
      await openDetail(selectedQrId);
    } catch (err) {
      console.error(err);
      showToast(explainFirestoreError(err) || err.message, true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function handleSaveTitle(e) {
    e.preventDefault();
    if (!selectedQrId) return;
    try {
      await api().updateTitle(selectedQrId, $('dyn-title-input').value);
      showToast('Nombre actualizado');
      await refreshList();
      await openDetail(selectedQrId);
    } catch (err) {
      showToast(err.message || 'Error', true);
    }
  }

  async function handleDeactivate() {
    if (!selectedQrId) return;
    if (!confirm('¿Desactivar este QR? Dejará de redirigir al escanearlo.')) return;
    try {
      await api().deactivateQr(selectedQrId);
      showToast('QR desactivado');
      await refreshList();
      await openDetail(selectedQrId);
    } catch (err) {
      showToast(err.message || 'Error', true);
    }
  }

  async function handleLandingSave(e) {
    e.preventDefault();
    if (!selectedQrId) return;
    const btn = $('dyn-landing-save-btn');
    if (btn) btn.disabled = true;
    try {
      await api().updateLandingSettings(selectedQrId, {
        landingEnabled: !!($('dyn-landing-enabled') && $('dyn-landing-enabled').checked),
        landingMessage: ($('dyn-landing-message') && $('dyn-landing-message').value) || '',
        landingCountdown: ($('dyn-landing-countdown') && $('dyn-landing-countdown').value) || 5
      });
      showToast('Página intermedia guardada');
      await openDetail(selectedQrId);
    } catch (err) {
      showToast(err.message || 'Error al guardar', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function copyShortLink() {
    if (!detailQr) return;
    const url = api().shortLink(detailQr.id);
    try {
      await navigator.clipboard.writeText(url);
      showToast('Enlace copiado');
    } catch (e) {
      prompt('Copia este enlace:', url);
    }
  }

  async function downloadDynQr() {
    if (!previewQr || !detailQr) return;
    try {
      await previewQr.download({ name: 'generaqr-dinamico-' + detailQr.id, extension: 'png' });
    } catch (e) {
      const canvas = $('dyn-qr-holder') && $('dyn-qr-holder').querySelector('canvas');
      if (!canvas) return;
      const a = document.createElement('a');
      a.download = 'generaqr-dinamico-' + detailQr.id + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    }
  }

  function wire() {
    configBanner();

    const signInBtns = document.querySelectorAll('[data-auth-signin]');
    signInBtns.forEach((b) => b.addEventListener('click', handleSignIn));
    const signOutBtn = $('auth-signout-btn');
    if (signOutBtn) signOutBtn.addEventListener('click', handleSignOut);

    const createForm = $('dyn-create-form');
    if (createForm) createForm.addEventListener('submit', handleCreate);

    const targetForm = $('dyn-target-form');
    if (targetForm) targetForm.addEventListener('submit', handleChangeUrl);

    const titleForm = $('dyn-title-form');
    if (titleForm) titleForm.addEventListener('submit', handleSaveTitle);

    const landingForm = $('dyn-landing-form');
    if (landingForm) landingForm.addEventListener('submit', handleLandingSave);

    const copyBtn = $('dyn-copy-link');
    if (copyBtn) copyBtn.addEventListener('click', copyShortLink);

    const dlBtn = $('dyn-download-qr');
    if (dlBtn) dlBtn.addEventListener('click', downloadDynQr);

    const refreshBtn = $('dyn-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', async () => {
      await refreshList();
      if (selectedQrId) await openDetail(selectedQrId);
      showToast('Actualizado');
    });

    const deactBtn = $('dyn-deactivate-btn');
    if (deactBtn) deactBtn.addEventListener('click', handleDeactivate);

    // Auth listener solo si está configurado
    try {
      if (api() && api().isConfigured()) {
        api().init();
        api().onAuth(setAuthUI);
      } else {
        setAuthUI(null);
      }
    } catch (e) {
      console.warn(e);
      setAuthUI(null);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
