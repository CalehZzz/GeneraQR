/**
 * API de GeneraQR
 * ================
 * Expone el "diseño activo" (estilo de QR: colores, formas, logo) para que
 * apps externas del mismo dueño (por ahora, PICO) puedan generar QR con el
 * mismo diseño guardado en GeneraQR, sin necesidad de acceder a Firestore
 * directamente ni conocer las reglas internas del proyecto.
 *
 * Endpoints (HTTPS, 1 función por endpoint, región us-central1):
 *
 *   GET  /getActiveDesign
 *     Público, sin autenticación. Devuelve el estilo del diseño publicado
 *     como "activo" (colores, formas, logo en base64 ya embebido).
 *     Usado por PICO (o cualquier otra app) para dibujar los QR.
 *
 *   GET  /listMyDesigns
 *     Requiere header  Authorization: Bearer <idToken>  de un usuario de
 *     GeneraQR (Firebase Auth de este mismo proyecto) cuyo email sea
 *     calebrenebr@gmail.com. Devuelve la lista de designPresets del dueño.
 *
 *   POST /setActiveDesign   { presetId: string }
 *     Igual que arriba, requiere Authorization: Bearer <idToken> con email
 *     calebrenebr@gmail.com. Copia el estilo del preset elegido (+ el logo,
 *     si tiene) al documento público publicConfig/activeDesign.
 *
 * Solo calebrenebr@gmail.com puede listar y publicar diseños. La lectura
 * del diseño activo es pública a propósito: los QR de pedidos de PICO los
 * ve cualquier cliente, no solo el admin.
 */

const { onRequest } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const cors = require('cors');

admin.initializeApp();
const db = admin.firestore();

// Único correo autorizado a administrar (elegir/publicar) el diseño activo.
const ADMIN_EMAIL = 'calebrenebr@gmail.com';

// Orígenes desde los que se puede llamar a esta API.
const ALLOWED_ORIGINS = [
  'https://picosv.com',
  'https://www.picosv.com',
  'https://generaqr.xyz',
  'https://www.generaqr.xyz',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'http://localhost:5500'
];

const corsHandler = cors({
  origin: (origin, callback) => {
    // Permite llamadas sin header Origin (curl, servidor a servidor) y
    // cualquier origen de la whitelist.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error('Origen no permitido'));
  }
});

// Mismos campos que STYLE_KEYS en js/generaqr-firebase.js (sin ownerId).
const STYLE_KEYS = [
  'dotsType', 'csquareType', 'cdotType', 'colorState',
  'bgColor', 'logoBgShape', 'logoSize', 'logoPadding', 'targetSize',
  'logoId'
];

function pickStyle(style) {
  const out = {};
  STYLE_KEYS.forEach((k) => {
    if (style && style[k] !== undefined) out[k] = style[k];
  });
  return out;
}

function withCors(handler) {
  return (req, res) => {
    corsHandler(req, res, () => handler(req, res));
  };
}

/** Verifica el ID token del header Authorization y exige el email admin. */
async function requireAdmin(req, res) {
  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) {
    res.status(401).json({ error: 'Falta el token de autenticación.' });
    return null;
  }
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(match[1]);
  } catch (err) {
    logger.warn('Token inválido', err);
    res.status(401).json({ error: 'Token inválido o expirado.' });
    return null;
  }
  if (decoded.email !== ADMIN_EMAIL) {
    res.status(403).json({ error: 'No tienes permiso para usar esta API.' });
    return null;
  }
  return decoded;
}

/**
 * GET /getActiveDesign
 * Público. Devuelve el estilo publicado como activo, con el logo ya
 * embebido en base64 (si tiene) para que quien lo consuma no necesite
 * ninguna otra llamada ni autenticación.
 */
exports.getActiveDesign = onRequest({ region: 'us-central1', cors: false }, withCors(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido.' });
    return;
  }
  try {
    const snap = await db.collection('publicConfig').doc('activeDesign').get();
    if (!snap.exists) {
      res.status(404).json({ error: 'No hay ningún diseño activo publicado todavía.' });
      return;
    }
    const data = snap.data();
    res.set('Cache-Control', 'public, max-age=120');
    res.status(200).json(data);
  } catch (err) {
    logger.error('getActiveDesign', err);
    res.status(500).json({ error: 'Error interno al leer el diseño activo.' });
  }
}));

/**
 * GET /listMyDesigns
 * Restringido a ADMIN_EMAIL. Lista los designPresets del dueño para que
 * PICO pueda mostrar un selector.
 */
exports.listMyDesigns = onRequest({ region: 'us-central1', cors: false }, withCors(async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Método no permitido.' });
    return;
  }
  const decoded = await requireAdmin(req, res);
  if (!decoded) return;

  try {
    const snap = await db.collection('designPresets')
      .where('ownerId', '==', decoded.uid)
      .orderBy('updatedAt', 'desc')
      .get();
    const list = snap.docs.map((d) => Object.assign({ id: d.id }, pickStyle(d.data()), { name: d.data().name || 'Sin nombre' }));
    res.status(200).json({ designs: list });
  } catch (err) {
    logger.error('listMyDesigns', err);
    res.status(500).json({ error: 'Error interno al listar diseños.' });
  }
}));

/**
 * POST /setActiveDesign  { presetId }
 * Restringido a ADMIN_EMAIL. Copia el estilo del preset (y su logo, si
 * tiene) a publicConfig/activeDesign.
 */
exports.setActiveDesign = onRequest({ region: 'us-central1', cors: false }, withCors(async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido.' });
    return;
  }
  const decoded = await requireAdmin(req, res);
  if (!decoded) return;

  const presetId = String((req.body && req.body.presetId) || '').trim();
  if (!presetId) {
    res.status(400).json({ error: 'Falta presetId.' });
    return;
  }

  try {
    const presetRef = db.collection('designPresets').doc(presetId);
    const presetSnap = await presetRef.get();
    if (!presetSnap.exists) {
      res.status(404).json({ error: 'Ese diseño no existe.' });
      return;
    }
    const preset = presetSnap.data();
    if (preset.ownerId !== decoded.uid) {
      res.status(403).json({ error: 'Ese diseño no te pertenece.' });
      return;
    }

    const style = pickStyle(preset);

    // Si el diseño usa un logo guardado, lo embebemos en base64 para que
    // quien consuma la API pública no necesite autenticarse para leerlo.
    let logoDataUrl = null;
    if (style.logoId) {
      const logoSnap = await db.collection('logoAssets').doc(style.logoId).get();
      if (logoSnap.exists && logoSnap.data().ownerId === decoded.uid) {
        logoDataUrl = logoSnap.data().dataUrl || null;
      }
    }
    delete style.logoId;

    const payload = Object.assign({}, style, {
      name: preset.name || 'Sin nombre',
      sourcePresetId: presetId,
      logoDataUrl: logoDataUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: decoded.email
    });

    await db.collection('publicConfig').doc('activeDesign').set(payload);
    res.status(200).json(Object.assign({ ok: true }, payload, { updatedAt: undefined }));
  } catch (err) {
    logger.error('setActiveDesign', err);
    res.status(500).json({ error: 'Error interno al publicar el diseño.' });
  }
}));
