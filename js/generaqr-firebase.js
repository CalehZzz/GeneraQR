/**
 * Núcleo compartido Firebase + helpers de QR dinámico.
 * Requiere: firebase-app/auth/firestore compat + firebase-config.js
 */
(function (global) {
  'use strict';

  function isConfigured() {
    const cfg = global.FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || !cfg.projectId || !cfg.appId) return false;
    const values = [cfg.apiKey, cfg.projectId, cfg.appId, cfg.authDomain || ''];
    return values.every((v) => v && String(v).indexOf('TU_') === -1);
  }

  let app = null;
  let auth = null;
  let db = null;
  let googleProvider = null;
  let initError = null;

  const CACHE_PREFIX = 'generaqr_fs_cache_v1:';
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

  function cacheKey(parts) {
    return CACHE_PREFIX + parts.join(':');
  }

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.t !== 'number') return null;
      if (Date.now() - parsed.t > CACHE_TTL_MS) return null;
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  function cacheSet(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ t: Date.now(), data: data }));
    } catch (e) { /* quota / private mode */ }
  }

  function cacheRemove(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  function cacheInvalidateUser(uid) {
    if (!uid) return;
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf(CACHE_PREFIX) === 0 && k.indexOf(':' + uid) !== -1) keys.push(k);
      }
      keys.forEach(function (k) { localStorage.removeItem(k); });
    } catch (e) { /* ignore */ }
  }

  function cacheInvalidateQr(uid, qrId) {
    if (!uid || !qrId) return;
    cacheRemove(cacheKey(['qr', uid, qrId]));
    cacheRemove(cacheKey(['versions', uid, qrId]));
    cacheRemove(cacheKey(['list', uid]));
  }

  function init() {
    if (app) return { app, auth, db, googleProvider };
    if (typeof firebase === 'undefined') {
      initError = 'Firebase SDK no cargó. Revisa la conexión a internet.';
      throw new Error(initError);
    }
    if (!isConfigured()) {
      initError = 'Firebase no está configurado. Edita firebase-config.js con tus claves.';
      throw new Error(initError);
    }
    app = firebase.initializeApp(global.FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.firestore();
    googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
    return { app, auth, db, googleProvider };
  }

  function getInitError() {
    return initError;
  }

  function publicOrigin() {
    if (global.GENERQR_PUBLIC_ORIGIN) return String(global.GENERQR_PUBLIC_ORIGIN).replace(/\/$/, '');
    return location.origin;
  }

  function shortLink(code) {
    return publicOrigin() + '/r/' + code;
  }

  function todayKey(date) {
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function monthPrefix(date) {
    return todayKey(date).slice(0, 7);
  }

  function computeStats(dailyCounts, scansTotal) {
    const counts = dailyCounts || {};
    const today = todayKey();
    const month = monthPrefix();
    let monthly = 0;
    Object.keys(counts).forEach((k) => {
      if (k.indexOf(month) === 0) monthly += Number(counts[k]) || 0;
    });
    return {
      daily: Number(counts[today]) || 0,
      monthly: monthly,
      total: Number(scansTotal) || 0
    };
  }

  const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function randomCode(len) {
    const n = len || 8;
    const arr = new Uint8Array(n);
    crypto.getRandomValues(arr);
    let out = '';
    for (let i = 0; i < n; i++) out += ALPHABET[arr[i] % ALPHABET.length];
    return out;
  }

  function normalizeUrl(raw) {
    const v = String(raw || '').trim();
    if (!v) return '';
    if (/^(https?:|mailto:|tel:)/i.test(v)) return v;
    return 'https://' + v;
  }

  function isValidDestination(url) {
    if (!url || url.length > 2048) return false;
    return /^(https?:\/\/.+|mailto:.+|tel:.+)/i.test(url);
  }

  async function ensureUserProfile(user) {
    const { db } = init();
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    const payload = {
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (!snap.exists) {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await ref.set(payload);
    } else {
      await ref.set(payload, { merge: true });
    }
  }

  async function signInWithGoogle() {
    const { auth, googleProvider } = init();
    const result = await auth.signInWithPopup(googleProvider);
    await ensureUserProfile(result.user);
    return result.user;
  }

  async function signOut() {
    const { auth } = init();
    await auth.signOut();
  }

  function onAuth(callback) {
    const { auth } = init();
    return auth.onAuthStateChanged(callback);
  }

  async function createDynamicQr({ title, targetUrl }) {
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión.');

    const url = normalizeUrl(targetUrl);
    if (!isValidDestination(url)) throw new Error('URL de destino no válida.');
    const name = String(title || '').trim() || 'Mi QR dinámico';
    if (name.length > 80) throw new Error('El nombre es demasiado largo.');

    let code = randomCode(8);
    for (let i = 0; i < 5; i++) {
      const exists = await db.collection('dynamicQrs').doc(code).get();
      if (!exists.exists) break;
      code = randomCode(8);
    }

    const qrRef = db.collection('dynamicQrs').doc(code);
    const versionRef = qrRef.collection('versions').doc();
    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();

    batch.set(versionRef, {
      ownerId: user.uid,
      targetUrl: url,
      createdAt: now,
      endedAt: null,
      scansTotal: 0,
      dailyCounts: {},
      lastScanAt: null
    });

    batch.set(qrRef, {
      ownerId: user.uid,
      title: name,
      targetUrl: url,
      currentVersionId: versionRef.id,
      createdAt: now,
      updatedAt: now,
      active: true,
      qrStyle: null,
      styleName: '',
      landingEnabled: false,
      landingTitle: '',
      landingMessage: '',
      landingCta: 'Abrir enlace',
      landingCountdown: 2,
      landingBg: '#0B1220',
      landingAccent: '#7CF2D6',
      landingText: '#F4F7FB',
      landingShowBrand: true,
      landingShowHost: true
    });

    await batch.commit();
    cacheInvalidateUser(user.uid);
    return { id: code, shortUrl: shortLink(code), versionId: versionRef.id };
  }

  async function listMyDynamicQrs(options) {
    const opts = options || {};
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) return [];
    const key = cacheKey(['list', user.uid]);
    if (!opts.force) {
      const cached = cacheGet(key);
      if (cached) return cached;
    }
    const snap = await db.collection('dynamicQrs')
      .where('ownerId', '==', user.uid)
      .orderBy('updatedAt', 'desc')
      .get();
    const list = snap.docs.map((d) => Object.assign({ id: d.id }, d.data()));
    cacheSet(key, list);
    return list;
  }

  async function getDynamicQr(id, options) {
    const opts = options || {};
    const { auth, db } = init();
    const user = auth.currentUser;
    const key = user ? cacheKey(['qr', user.uid, id]) : null;
    if (!opts.force && key) {
      const cached = cacheGet(key);
      if (cached) return cached;
    }
    const snap = await db.collection('dynamicQrs').doc(id).get();
    if (!snap.exists) return null;
    const data = Object.assign({ id: snap.id }, snap.data());
    if (key) cacheSet(key, data);
    return data;
  }

  async function listVersions(qrId, options) {
    const opts = options || {};
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión.');
    const key = cacheKey(['versions', user.uid, qrId]);
    if (!opts.force) {
      const cached = cacheGet(key);
      if (cached) return cached;
    }
    const snap = await db.collection('dynamicQrs').doc(qrId)
      .collection('versions')
      .where('ownerId', '==', user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const list = snap.docs.map((d) => {
      const data = d.data();
      return Object.assign({
        id: d.id,
        stats: computeStats(data.dailyCounts, data.scansTotal)
      }, data);
    });
    cacheSet(key, list);
    return list;
  }

  async function getVersion(qrId, versionId) {
    const { db } = init();
    const snap = await db.collection('dynamicQrs').doc(qrId)
      .collection('versions').doc(versionId).get();
    if (!snap.exists) return null;
    const data = snap.data();
    return Object.assign({
      id: snap.id,
      stats: computeStats(data.dailyCounts, data.scansTotal)
    }, data);
  }

  /**
   * Cambia el destino del QR. El código corto (y el QR impreso) no cambia,
   * pero se cierra la versión actual y se abre una nueva con contadores en cero.
   */
  async function changeDestination(qrId, newTargetUrl) {
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión.');

    const url = normalizeUrl(newTargetUrl);
    if (!isValidDestination(url)) throw new Error('URL de destino no válida.');

    const qrRef = db.collection('dynamicQrs').doc(qrId);
    const qrSnap = await qrRef.get();
    if (!qrSnap.exists) throw new Error('QR no encontrado.');
    const qr = qrSnap.data();
    if (qr.ownerId !== user.uid) throw new Error('No tienes permiso sobre este QR.');
    if (normalizeUrl(qr.targetUrl) === url) throw new Error('Esa ya es la URL actual.');

    const batch = db.batch();
    const now = firebase.firestore.FieldValue.serverTimestamp();
    const oldVersionRef = qrRef.collection('versions').doc(qr.currentVersionId);
    batch.update(oldVersionRef, { endedAt: now });

    const newVersionRef = qrRef.collection('versions').doc();
    batch.set(newVersionRef, {
      ownerId: user.uid,
      targetUrl: url,
      createdAt: now,
      endedAt: null,
      scansTotal: 0,
      dailyCounts: {},
      lastScanAt: null
    });

    batch.update(qrRef, {
      targetUrl: url,
      currentVersionId: newVersionRef.id,
      updatedAt: now
    });

    await batch.commit();
    cacheInvalidateQr(user.uid, qrId);
    return { versionId: newVersionRef.id, targetUrl: url };
  }

  async function updateTitle(qrId, title) {
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión.');
    const name = String(title || '').trim();
    if (!name || name.length > 80) throw new Error('Nombre no válido.');
    const qrRef = db.collection('dynamicQrs').doc(qrId);
    const snap = await qrRef.get();
    if (!snap.exists || snap.data().ownerId !== user.uid) throw new Error('QR no encontrado.');
    await qrRef.update({
      title: name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    cacheInvalidateQr(user.uid, qrId);
  }

  async function deactivateQr(qrId) {
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión.');
    const qrRef = db.collection('dynamicQrs').doc(qrId);
    const snap = await qrRef.get();
    if (!snap.exists || snap.data().ownerId !== user.uid) throw new Error('QR no encontrado.');
    await qrRef.update({
      active: false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    cacheInvalidateQr(user.uid, qrId);
  }

  function normalizeHex(value, fallback) {
    const v = String(value || '').trim();
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
    return fallback;
  }

  async function updateLandingSettings(qrId, settings) {
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión.');
    const qrRef = db.collection('dynamicQrs').doc(qrId);
    const snap = await qrRef.get();
    if (!snap.exists || snap.data().ownerId !== user.uid) throw new Error('QR no encontrado.');

    let countdown = parseInt(settings.landingCountdown, 10);
    if (isNaN(countdown)) countdown = 2;
    countdown = Math.max(0, Math.min(30, countdown));

    await qrRef.update({
      landingEnabled: !!settings.landingEnabled,
      landingTitle: String(settings.landingTitle || '').trim().slice(0, 80),
      landingMessage: String(settings.landingMessage || '').trim().slice(0, 160),
      landingCta: String(settings.landingCta || 'Abrir enlace').trim().slice(0, 40) || 'Abrir enlace',
      landingCountdown: countdown,
      landingBg: normalizeHex(settings.landingBg, '#0B1220'),
      landingAccent: normalizeHex(settings.landingAccent, '#7CF2D6'),
      landingText: normalizeHex(settings.landingText, '#F4F7FB'),
      landingShowBrand: settings.landingShowBrand !== false,
      landingShowHost: settings.landingShowHost !== false,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    cacheInvalidateQr(user.uid, qrId);
  }

  async function updateQrStyle(qrId, style, styleName) {
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión.');
    const qrRef = db.collection('dynamicQrs').doc(qrId);
    const snap = await qrRef.get();
    if (!snap.exists || snap.data().ownerId !== user.uid) throw new Error('QR no encontrado.');
    await qrRef.update({
      qrStyle: pickStyle(style || {}),
      styleName: String(styleName || '').trim().slice(0, 80),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    cacheInvalidateQr(user.uid, qrId);
  }

  function buildDailySeries(dailyCounts, days) {
    const n = days || 14;
    const counts = dailyCounts || {};
    const series = [];
    const now = new Date();
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = todayKey(d);
      series.push({
        date: key,
        label: String(d.getDate()),
        count: Number(counts[key]) || 0
      });
    }
    return series;
  }

  function destinationHost(url) {
    try {
      const u = new URL(normalizeUrl(url));
      return u.host || url;
    } catch (e) {
      return String(url || '').replace(/^https?:\/\//i, '').split('/')[0] || url;
    }
  }

  /**
   * Registra un escaneo y devuelve la URL de destino + opciones de landing.
   * Usado por la página de redirección (/r/CODE).
   */
  async function registerScanAndGetTarget(code) {
    const { db } = init();
    const qrRef = db.collection('dynamicQrs').doc(code);
    const qrSnap = await qrRef.get();
    if (!qrSnap.exists) {
      const err = new Error('Este código QR no existe.');
      err.code = 'not-found';
      throw err;
    }
    const qr = qrSnap.data();
    if (qr.active === false) {
      const err = new Error('Este código QR está desactivado.');
      err.code = 'inactive';
      throw err;
    }
    if (!qr.targetUrl || !qr.currentVersionId) {
      const err = new Error('Este QR no tiene destino configurado.');
      err.code = 'no-target';
      throw err;
    }

    const versionRef = qrRef.collection('versions').doc(qr.currentVersionId);
    const day = todayKey();
    // No esperamos el incremento: la redirección no debe bloquearse por el contador.
    versionRef.update({
      scansTotal: firebase.firestore.FieldValue.increment(1),
      ['dailyCounts.' + day]: firebase.firestore.FieldValue.increment(1),
      lastScanAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(function (e) {
      console.warn('No se pudo registrar el escaneo:', e);
    });

    // Solo si está explícitamente activada (por defecto: redirect inmediato)
    const landingEnabled = qr.landingEnabled === true;
    let countdown = parseInt(qr.landingCountdown, 10);
    if (isNaN(countdown)) countdown = 2;

    return {
      targetUrl: qr.targetUrl,
      title: qr.title || '',
      versionId: qr.currentVersionId,
      landingEnabled: landingEnabled,
      landingTitle: qr.landingTitle || '',
      landingMessage: qr.landingMessage || '',
      landingCta: qr.landingCta || 'Abrir enlace',
      landingCountdown: Math.max(0, Math.min(30, countdown)),
      landingBg: qr.landingBg || '#0B1220',
      landingAccent: qr.landingAccent || '#7CF2D6',
      landingText: qr.landingText || '#F4F7FB',
      landingShowBrand: qr.landingShowBrand !== false,
      landingShowHost: qr.landingShowHost !== false,
      destinationHost: destinationHost(qr.targetUrl)
    };
  }

  function extractCodeFromLocation(loc) {
    const location = loc || global.location;
    const params = new URLSearchParams(location.search);
    if (params.get('c')) return params.get('c').trim();
    if (params.get('r')) return params.get('r').trim();

    const path = location.pathname || '';
    const m = path.match(/\/r\/([A-Za-z0-9_-]+)\/?$/);
    if (m) return m[1];

    // GitHub Pages 404: a veces la ruta queda en ?pathname= o se pasa via hash
    if (location.hash) {
      const hm = location.hash.match(/[#/]*r\/([A-Za-z0-9_-]+)/);
      if (hm) return hm[1];
    }
    return '';
  }

  function getCurrentUser() {
    try {
      const { auth } = init();
      return auth.currentUser;
    } catch (e) {
      return null;
    }
  }

  const STYLE_KEYS = [
    'dotsType', 'csquareType', 'cdotType', 'colorState',
    'bgColor', 'logoBgShape', 'logoSize', 'logoPadding', 'targetSize'
  ];

  function pickStyle(style) {
    const out = {};
    STYLE_KEYS.forEach((k) => {
      if (style && style[k] !== undefined) out[k] = style[k];
    });
    return out;
  }

  async function listDesignPresets(options) {
    const opts = options || {};
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) return [];
    const key = cacheKey(['presets', user.uid]);
    if (!opts.force) {
      const cached = cacheGet(key);
      if (cached) return cached;
    }
    const snap = await db.collection('designPresets')
      .where('ownerId', '==', user.uid)
      .orderBy('updatedAt', 'desc')
      .get();
    const list = snap.docs.map((d) => Object.assign({ id: d.id, source: 'cloud' }, d.data()));
    cacheSet(key, list);
    return list;
  }

  async function saveDesignPreset({ name, style }) {
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión para guardar en tu cuenta.');

    const cleanName = String(name || '').trim() || 'Diseño sin nombre';
    if (cleanName.length > 80) throw new Error('El nombre es demasiado largo.');

    const existing = await db.collection('designPresets')
      .where('ownerId', '==', user.uid)
      .get();
    if (existing.size >= 40) {
      throw new Error('Límite de 40 diseños por cuenta. Borra alguno para guardar otro.');
    }

    const now = firebase.firestore.FieldValue.serverTimestamp();
    const ref = db.collection('designPresets').doc();
    const payload = Object.assign({
      ownerId: user.uid,
      name: cleanName,
      createdAt: now,
      updatedAt: now
    }, pickStyle(style));

    await ref.set(payload);
    cacheRemove(cacheKey(['presets', user.uid]));
    return Object.assign({ id: ref.id, source: 'cloud' }, payload, { name: cleanName });
  }

  async function deleteDesignPreset(id) {
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user) throw new Error('Debes iniciar sesión.');
    const ref = db.collection('designPresets').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return;
    if (snap.data().ownerId !== user.uid) throw new Error('No tienes permiso.');
    await ref.delete();
    cacheRemove(cacheKey(['presets', user.uid]));
  }

  /**
   * Sube diseños locales del navegador a la cuenta (una sola vez por navegador).
   * Devuelve cuántos se migraron.
   */
  async function migrateLocalDesignPresets(localList) {
    const { auth, db } = init();
    const user = auth.currentUser;
    if (!user || !localList || !localList.length) return 0;

    const flagKey = 'generaqr_presets_migrated_' + user.uid;
    try {
      if (localStorage.getItem(flagKey) === '1') return 0;
    } catch (e) { /* ignore */ }

    const existing = await db.collection('designPresets')
      .where('ownerId', '==', user.uid)
      .get();
    const existingNames = new Set(existing.docs.map((d) => (d.data().name || '').toLowerCase()));

    let migrated = 0;
    const room = Math.max(0, 40 - existing.size);
    const toUpload = localList.slice(0, room);

    for (let i = 0; i < toUpload.length; i++) {
      const item = toUpload[i];
      const name = String(item.name || 'Diseño importado').trim().slice(0, 80);
      if (existingNames.has(name.toLowerCase())) continue;
      const now = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('designPresets').doc().set(Object.assign({
        ownerId: user.uid,
        name: name,
        createdAt: now,
        updatedAt: now,
        migratedFromLocal: true
      }, pickStyle(item)));
      existingNames.add(name.toLowerCase());
      migrated++;
    }

    try { localStorage.setItem(flagKey, '1'); } catch (e) { /* ignore */ }
    if (migrated > 0) cacheRemove(cacheKey(['presets', user.uid]));
    return migrated;
  }

  global.GeneraQRFirebase = {
    isConfigured,
    init,
    getInitError,
    publicOrigin,
    shortLink,
    todayKey,
    monthPrefix,
    computeStats,
    normalizeUrl,
    isValidDestination,
    signInWithGoogle,
    signOut,
    onAuth,
    getCurrentUser,
    createDynamicQr,
    listMyDynamicQrs,
    getDynamicQr,
    listVersions,
    getVersion,
    changeDestination,
    updateTitle,
    deactivateQr,
    registerScanAndGetTarget,
    extractCodeFromLocation,
    updateLandingSettings,
    updateQrStyle,
    buildDailySeries,
    destinationHost,
    listDesignPresets,
    saveDesignPreset,
    deleteDesignPreset,
    migrateLocalDesignPresets,
    cacheInvalidateUser,
    cacheInvalidateQr
  };
})(window);
