/**
 * Compresión de logos para guardarlos en Firestore sin saturarlo.
 *
 * Un PNG de logo típico pesa 200 KB–2 MB; un documento de Firestore admite
 * como máximo 1 MiB y base64 añade ~33 %. Reescalamos a un lado máximo
 * razonable y codificamos en WebP con alfa: mismo aspecto visual, entre 5 y 20
 * veces menos peso. Si el navegador no puede codificar WebP (Safari antiguo)
 * caemos a PNG reducido, que conserva la transparencia.
 */
(function (global) {
  'use strict';

  const MAX_SIDE = 512;        // suficiente: el logo ocupa una fracción del QR
  const THUMB_SIDE = 96;       // miniatura para la galería
  const MAX_BYTES = 320 * 1024; // margen amplio bajo el límite de 1 MiB
  const QUALITY_STEPS = [0.92, 0.86, 0.78, 0.68, 0.58];
  const SIDE_STEPS = [512, 448, 384, 320, 256];

  let webpSupport = null;

  function supportsWebp() {
    if (webpSupport !== null) return webpSupport;
    try {
      const c = document.createElement('canvas');
      c.width = 2; c.height = 2;
      webpSupport = c.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) {
      webpSupport = false;
    }
    return webpSupport;
  }

  /** Bytes aproximados de un data URL en base64. */
  function dataUrlBytes(dataUrl) {
    const i = String(dataUrl).indexOf(',');
    if (i < 0) return 0;
    const b64 = dataUrl.slice(i + 1);
    return Math.floor(b64.length * 3 / 4);
  }

  function drawScaled(source, side) {
    const sw = source.naturalWidth || source.width;
    const sh = source.naturalHeight || source.height;
    const scale = Math.min(1, side / Math.max(sw, sh));
    const w = Math.max(1, Math.round(sw * scale));
    const h = Math.max(1, Math.round(sh * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(source, 0, 0, w, h);
    return canvas;
  }

  /**
   * Comprime una imagen (HTMLImageElement o canvas) a un data URL ligero.
   * Devuelve { dataUrl, thumbDataUrl, format, width, height, bytes }.
   */
  function compressLogo(source) {
    const webp = supportsWebp();
    const mime = webp ? 'image/webp' : 'image/png';

    let best = null;
    for (let s = 0; s < SIDE_STEPS.length; s++) {
      const canvas = drawScaled(source, SIDE_STEPS[s]);
      if (webp) {
        for (let q = 0; q < QUALITY_STEPS.length; q++) {
          const dataUrl = canvas.toDataURL(mime, QUALITY_STEPS[q]);
          const bytes = dataUrlBytes(dataUrl);
          if (!best || bytes < best.bytes) {
            best = { dataUrl: dataUrl, bytes: bytes, width: canvas.width, height: canvas.height };
          }
          if (bytes <= MAX_BYTES) {
            return finish(source, dataUrl, bytes, canvas, mime);
          }
        }
      } else {
        const dataUrl = canvas.toDataURL('image/png');
        const bytes = dataUrlBytes(dataUrl);
        if (!best || bytes < best.bytes) {
          best = { dataUrl: dataUrl, bytes: bytes, width: canvas.width, height: canvas.height };
        }
        if (bytes <= MAX_BYTES) {
          return finish(source, dataUrl, bytes, canvas, 'image/png');
        }
      }
    }

    if (!best || best.bytes > MAX_BYTES) {
      throw new Error('La imagen es demasiado pesada incluso comprimida. Prueba con un logo más simple.');
    }
    return finish(source, best.dataUrl, best.bytes, drawScaled(source, best.width), mime);
  }

  function finish(source, dataUrl, bytes, canvas, mime) {
    const thumbCanvas = drawScaled(source, THUMB_SIDE);
    const thumbDataUrl = mime === 'image/webp'
      ? thumbCanvas.toDataURL('image/webp', 0.8)
      : thumbCanvas.toDataURL('image/png');
    return {
      dataUrl: dataUrl,
      thumbDataUrl: thumbDataUrl,
      format: mime === 'image/webp' ? 'webp' : 'png',
      width: canvas.width,
      height: canvas.height,
      bytes: bytes
    };
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('No se pudo cargar la imagen.')); };
      img.src = src;
    });
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 KB';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  global.GeneraQRImageStore = {
    MAX_SIDE,
    MAX_BYTES,
    supportsWebp,
    compressLogo,
    loadImage,
    dataUrlBytes,
    formatBytes
  };
})(window);
