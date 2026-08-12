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
  let previewToken = 0;
  const logoImageCache = new Map(); // logoId -> HTMLImageElement

  const DEFAULT_STYLE = {
    dotsType: 'rounded',
    csquareType: 'extra-rounded',
    cdotType: 'dot',
    colorState: {
      dots: { mode: 'solid', color1: '#1D1D1F', color2: '#FF375F', gradType: 'linear', angle: 45 },
      csquare: { mode: 'solid', color1: '#1D1D1F', color2: '#FF375F', gradType: 'linear', angle: 45 },
      cdot: { mode: 'solid', color1: '#1D1D1F', color2: '#FF375F', gradType: 'linear', angle: 45 }
    },
    bgColor: '#FFFFFF'
  };

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

  function syncHexPair(colorId, hexId) {
    const color = $(colorId);
    const hex = $(hexId);
    if (!color || !hex) return;
    const apply = () => {
      let v = hex.value.trim();
      if (v && v[0] !== '#') v = '#' + v;
      if (/^#[0-9a-fA-F]{6}$/.test(v)) {
        color.value = v;
        hex.value = v.toUpperCase();
        updateLandingPreview();
      }
    };
    color.addEventListener('input', () => {
      hex.value = color.value.toUpperCase();
      updateLandingPreview();
    });
    hex.addEventListener('change', apply);
    hex.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); apply(); }
    });
  }

  function setAuthUI(user) {
    currentUser = user;
    const loggedOut = $('auth-logged-out');
    const loggedIn = $('auth-logged-in');
    const gate = $('dyn-auth-gate');
    const appEl = $('dyn-app');

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
    if (appEl) appEl.hidden = !user;

    if (user) {
      refreshList(false);
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
      if (!api() || !api().isConfigured()) banner.hidden = false;
      else banner.hidden = true;
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
      if (currentUser && api().cacheInvalidateUser) api().cacheInvalidateUser(currentUser.uid);
      await api().signOut();
      showToast('Sesión cerrada');
    } catch (err) {
      showToast(err.message || 'Error al cerrar sesión', true);
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

  function renderList() {
    const list = $('dyn-list');
    const empty = $('dyn-list-empty');
    if (!list) return;
    list.innerHTML = '';
    if (!listCache.length) {
      if (empty) empty.hidden = false;
      return;
    }
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
      btn.addEventListener('click', () => openDetail(qr.id, false));
      list.appendChild(btn);
    });
  }

  async function refreshList(force) {
    const loading = $('dyn-list-loading');
    if (loading && force) loading.hidden = false;
    try {
      // Primero cache (rápido), luego red si force o para refrescar en silencio
      listCache = await api().listMyDynamicQrs({ force: !!force });
      renderList();
      if (!force) {
        api().listMyDynamicQrs({ force: true }).then((fresh) => {
          listCache = fresh;
          renderList();
        }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      showToast(explainFirestoreError(err), true);
    } finally {
      if (loading) loading.hidden = true;
    }
  }

  async function openDetail(id, force) {
    selectedQrId = id;
    document.querySelectorAll('.dyn-list-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.id === id);
    });
    const detail = $('dyn-detail');
    const loading = $('dyn-detail-loading');
    if (detail) detail.hidden = false;
    if (loading && force) loading.hidden = false;

    try {
      const [qr, versions] = await Promise.all([
        api().getDynamicQr(id, { force: !!force }),
        api().listVersions(id, { force: !!force })
      ]);
      if (!qr) throw new Error('QR no encontrado.');
      detailQr = qr;
      versionsCache = versions;
      renderDetail();
      // Refresh silencioso en segundo plano
      if (!force) {
        Promise.all([
          api().getDynamicQr(id, { force: true }),
          api().listVersions(id, { force: true })
        ]).then(([qr, versions]) => {
          if (selectedQrId !== id) return;
          detailQr = qr;
          versionsCache = versions;
          renderDetail();
        }).catch(() => {});
      }
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

  function activeStyle() {
    return detailQr && detailQr.qrStyle ? detailQr.qrStyle : DEFAULT_STYLE;
  }

  /** Carga (y cachea) el logo del diseño aplicado a este QR. */
  async function activeLogoImage() {
    const style = activeStyle();
    const logoId = style && style.logoId;
    if (!logoId) return null;
    if (logoImageCache.has(logoId)) return logoImageCache.get(logoId);
    try {
      const asset = await api().getLogoAsset(logoId);
      if (!asset || !asset.dataUrl) return null;
      const img = await window.GeneraQRImageStore.loadImage(asset.dataUrl);
      logoImageCache.set(logoId, img);
      return img;
    } catch (err) {
      console.warn('No se pudo cargar el logo del diseño:', err);
      return null;
    }
  }

  /** Opciones de render con el diseño aplicado (incluido el logo). */
  async function renderOptionsForQr(size) {
    const style = activeStyle();
    const logo = await activeLogoImage();
    return window.GeneraQRRender.optionsFromStyle(style, {
      size: size,
      logoImage: logo,
      // El enlace corto es corto: con corrección alta el logo tapa sin romperlo
      errorCorrectionLevel: 'H'
    });
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
    const stats = ver && ver.stats ? ver.stats : { daily: 0, monthly: 0, total: 0 };
    $('dyn-stat-daily').textContent = String(stats.daily);
    $('dyn-stat-monthly').textContent = String(stats.monthly);
    $('dyn-stat-total').textContent = String(stats.total);

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

    const styleNote = $('dyn-style-note');
    if (styleNote) {
      const style = activeStyle();
      const withLogo = style && style.logoId ? ' · con logo' : '';
      styleNote.textContent = detailQr.styleName
        ? ('Diseño: ' + detailQr.styleName + withLogo)
        : 'Estilo por defecto';
    }

    fillLandingFieldsFromQr();
    updateLandingPreview();
    renderChart(ver && ver.dailyCounts);
    renderVersions();
    renderPreview(shortUrl);
  }

  function fillLandingFieldsFromQr() {
    const setVal = (id, v) => { const el = $(id); if (el) el.value = v; };
    const setCheck = (id, v) => { const el = $(id); if (el) el.checked = !!v; };
    setCheck('dyn-landing-enabled', detailQr.landingEnabled === true);
    setVal('dyn-landing-title', detailQr.landingTitle || detailQr.title || '');
    setVal('dyn-landing-message', detailQr.landingMessage || '');
    setVal('dyn-landing-cta', detailQr.landingCta || 'Abrir enlace');
    const c = parseInt(detailQr.landingCountdown, 10);
    setVal('dyn-landing-countdown', String(isNaN(c) ? 2 : c));
    const bg = detailQr.landingBg || '#F5F5F7';
    const accent = detailQr.landingAccent || '#0A84FF';
    const text = detailQr.landingText || '#1D1D1F';
    setVal('dyn-landing-bg', bg);
    setVal('dyn-landing-bg-hex', bg.toUpperCase());
    setVal('dyn-landing-accent', accent);
    setVal('dyn-landing-accent-hex', accent.toUpperCase());
    setVal('dyn-landing-text', text);
    setVal('dyn-landing-text-hex', text.toUpperCase());
    setCheck('dyn-landing-show-brand', detailQr.landingShowBrand !== false);
    setCheck('dyn-landing-show-host', detailQr.landingShowHost !== false);
  }

  function landingFormState() {
    const host = detailQr ? api().destinationHost(detailQr.targetUrl) : 'tusitio.com';
    const title = ($('dyn-landing-title') && $('dyn-landing-title').value.trim())
      || (detailQr && detailQr.title)
      || 'Continuar al enlace';
    const msg = ($('dyn-landing-message') && $('dyn-landing-message').value.trim())
      || 'Estás a punto de abrir el destino de este código QR.';
    const cta = ($('dyn-landing-cta') && $('dyn-landing-cta').value.trim()) || 'Abrir enlace';
    let countdown = parseInt($('dyn-landing-countdown') && $('dyn-landing-countdown').value, 10);
    if (isNaN(countdown)) countdown = 2;
    return {
      title: title,
      msg: msg,
      cta: cta,
      host: host,
      countdown: countdown,
      bg: ($('dyn-landing-bg') && $('dyn-landing-bg').value) || '#F5F5F7',
      accent: ($('dyn-landing-accent') && $('dyn-landing-accent').value) || '#0A84FF',
      text: ($('dyn-landing-text') && $('dyn-landing-text').value) || '#1D1D1F',
      showBrand: !($('dyn-landing-show-brand') && !$('dyn-landing-show-brand').checked),
      showHost: !($('dyn-landing-show-host') && !$('dyn-landing-show-host').checked)
    };
  }

  function hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }

  function rgba(hex, alpha) {
    const c = hexToRgb(hex);
    if (!c) return 'rgba(10,132,255,' + alpha + ')';
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + alpha + ')';
  }

  function readableOn(hex) {
    const c = hexToRgb(hex);
    if (!c) return '#FFFFFF';
    const lum = (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
    return lum > 0.62 ? '#1D1D1F' : '#FFFFFF';
  }

  function updateLandingPreview() {
    const s = landingFormState();
    document.querySelectorAll('[data-landing-preview]').forEach((box) => {
      box.style.background = s.bg;
      box.style.color = s.text;
      const brand = box.querySelector('[data-lp="brand"]');
      const title = box.querySelector('[data-lp="title"]');
      const msg = box.querySelector('[data-lp="msg"]');
      const host = box.querySelector('[data-lp="host"]');
      const cta = box.querySelector('[data-lp="cta"]');
      const count = box.querySelector('[data-lp="count"]');
      if (brand) {
        brand.textContent = 'GeneraQR';
        brand.style.color = s.accent;
        brand.style.display = s.showBrand ? '' : 'none';
      }
      if (title) title.textContent = s.title;
      if (msg) msg.textContent = s.msg;
      if (host) {
        host.textContent = s.host;
        host.style.display = s.showHost ? '' : 'none';
        host.style.color = s.accent;
        host.style.background = rgba(s.accent, 0.12);
      }
      if (cta) {
        cta.textContent = s.cta;
        cta.style.background = s.accent;
        cta.style.color = readableOn(s.accent);
      }
      if (count) {
        count.textContent = s.countdown > 0
          ? ('Redirección en ' + s.countdown + 's…')
          : 'Sin auto-redirección';
      }
    });
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

  /**
   * Vista previa con el diseño aplicado. Se genera a 640 px y se muestra
   * reducida por CSS: así se ve nítida en pantallas retina en lugar de pixelada.
   */
  async function renderPreview(shortUrl) {
    const holder = $('dyn-qr-holder');
    if (!holder) return;
    if (typeof QRCodeStyling === 'undefined' || !window.GeneraQRRender) {
      holder.innerHTML = '<p class="field-hint">Vista previa no disponible.</p>';
      return;
    }
    const token = ++previewToken;
    try {
      const opts = await renderOptionsForQr(640);
      const canvas = await window.GeneraQRRender.renderQrCanvas(
        Object.assign(opts, { data: shortUrl })
      );
      if (token !== previewToken) return;
      holder.innerHTML = '';
      holder.appendChild(canvas);
    } catch (err) {
      console.error(err);
      if (token === previewToken) {
        holder.innerHTML = '<p class="field-hint">No se pudo generar la vista previa.</p>';
      }
    }
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
      await refreshList(true);
      await openDetail(created.id, true);
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
      await refreshList(true);
      await openDetail(selectedQrId, true);
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
      await refreshList(true);
      await openDetail(selectedQrId, true);
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
      await refreshList(true);
      await openDetail(selectedQrId, true);
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
      const s = landingFormState();
      await api().updateLandingSettings(selectedQrId, {
        landingEnabled: !!($('dyn-landing-enabled') && $('dyn-landing-enabled').checked),
        landingTitle: ($('dyn-landing-title') && $('dyn-landing-title').value) || '',
        landingMessage: ($('dyn-landing-message') && $('dyn-landing-message').value) || '',
        landingCta: s.cta,
        landingCountdown: s.countdown,
        landingBg: s.bg,
        landingAccent: s.accent,
        landingText: s.text,
        landingShowBrand: s.showBrand,
        landingShowHost: s.showHost
      });
      showToast('Página intermedia guardada');
      await openDetail(selectedQrId, true);
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
    if (!detailQr) return;
    const save = window.GeneraQRSave;
    const base = (detailQr.title || 'generaqr-dinamico-' + detailQr.id);
    const name = save ? save.safeFilename(base, 'png', 'codigo-qr') : base + '.png';
    const btn = $('dyn-download-qr');
    if (btn) btn.disabled = true;

    try {
      // Se genera de nuevo a 1024 px: escalar la vista previa dejaba el PNG pixelado
      const opts = await renderOptionsForQr(1024);
      const canvas = await window.GeneraQRRender.renderQrCanvas(
        Object.assign(opts, { data: api().shortLink(detailQr.id) })
      );
      const result = await save.saveCanvas(canvas, name, { title: name });
      if (result === 'shared') showToast('Elige “Guardar imagen” o “Guardar en Archivos”');
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar el QR. Inténtalo de nuevo.', true);
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  function openDesignerWithShortLink() {
    if (!detailQr) return;
    const shortUrl = api().shortLink(detailQr.id);
    const modeBtn = document.querySelector('#mode-toggle .mode-btn[data-mode="designer"]');
    if (modeBtn) modeBtn.click();
    const linkType = document.querySelector('#content-type-grid .swatch[data-value="link"]');
    if (linkType) linkType.click();
    const urlInput = document.getElementById('url-input');
    if (urlInput) {
      urlInput.value = shortUrl;
      urlInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    showToast('Diseñador abierto con tu enlace corto');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function openPresetModal() {
    const modal = $('dyn-preset-modal');
    const list = $('dyn-preset-pick-list');
    const empty = $('dyn-preset-pick-empty');
    if (!modal || !list) return;
    modal.hidden = false;
    list.innerHTML = '<p class="dyn-loading">Cargando diseños…</p>';
    if (empty) empty.hidden = true;
    try {
      let presets = await api().listDesignPresets({ force: false });
      api().listDesignPresets({ force: true }).then((fresh) => {
        presets = fresh;
        renderPresetPicker(presets);
      }).catch(() => {});
      renderPresetPicker(presets);
    } catch (err) {
      list.innerHTML = '';
      showToast(explainFirestoreError(err), true);
    }
  }

  function renderPresetPicker(presets) {
    const list = $('dyn-preset-pick-list');
    const empty = $('dyn-preset-pick-empty');
    if (!list) return;
    list.innerHTML = '';
    if (!presets || !presets.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;
    presets.forEach((p) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'dyn-preset-pick-item';
      const bg = p.bgColor || '#fff';
      const dot = (p.colorState && p.colorState.dots && p.colorState.dots.color1) || '#1D1D1F';
      const logoBadge = p.logoId
        ? '<span class="dyn-badge" style="margin-top:0;margin-left:6px;">con logo</span>'
        : '';
      btn.innerHTML =
        '<span class="preset-swatch" style="background:' + escapeHtml(bg) + '">' +
          '<span class="preset-dot" style="background:' + escapeHtml(dot) + '"></span>' +
        '</span>' +
        '<span class="preset-name">' + escapeHtml(p.name || 'Diseño') + logoBadge + '</span>';
      btn.addEventListener('click', () => applyPresetToCurrentQr(p));
      list.appendChild(btn);
    });
  }

  async function applyPresetToCurrentQr(preset) {
    if (!selectedQrId || !preset) return;
    try {
      await api().updateQrStyle(selectedQrId, preset, preset.name || 'Diseño');
      $('dyn-preset-modal').hidden = true;
      showToast('Diseño aplicado al QR');
      await openDetail(selectedQrId, true);
    } catch (err) {
      showToast(err.message || 'No se pudo aplicar el diseño', true);
    }
  }

  function wireLandingLivePreview() {
    [
      'dyn-landing-title', 'dyn-landing-message', 'dyn-landing-cta', 'dyn-landing-countdown',
      'dyn-landing-show-brand', 'dyn-landing-show-host', 'dyn-landing-enabled'
    ].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', updateLandingPreview);
      el.addEventListener('change', updateLandingPreview);
    });
    syncHexPair('dyn-landing-bg', 'dyn-landing-bg-hex');
    syncHexPair('dyn-landing-accent', 'dyn-landing-accent-hex');
    syncHexPair('dyn-landing-text', 'dyn-landing-text-hex');
  }

  function wire() {
    configBanner();
    wireLandingLivePreview();

    document.querySelectorAll('[data-auth-signin]').forEach((b) => b.addEventListener('click', handleSignIn));
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
    const designBtn = $('dyn-open-designer-btn');
    if (designBtn) designBtn.addEventListener('click', openDesignerWithShortLink);
    const usePresetBtn = $('dyn-use-preset-btn');
    if (usePresetBtn) usePresetBtn.addEventListener('click', openPresetModal);
    const modalClose = $('dyn-preset-modal-close');
    if (modalClose) modalClose.addEventListener('click', () => { $('dyn-preset-modal').hidden = true; });
    const modal = $('dyn-preset-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.hidden = true;
      });
    }

    const refreshBtn = $('dyn-refresh-btn');
    if (refreshBtn) refreshBtn.addEventListener('click', async () => {
      await refreshList(true);
      if (selectedQrId) await openDetail(selectedQrId, true);
      showToast('Actualizado');
    });

    const deactBtn = $('dyn-deactivate-btn');
    if (deactBtn) deactBtn.addEventListener('click', handleDeactivate);

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
