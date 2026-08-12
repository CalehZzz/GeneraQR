/**
 * Guardado de archivos compatible con iOS/Android.
 *
 * En iPhone (Safari) un enlace con `download` y un `data:` URL no descarga nada:
 * o abre la imagen en la misma pestaña o se ignora. La ruta fiable es un Blob y,
 * cuando existe, la hoja de compartir del sistema — que permite "Guardar en Fotos"
 * o "Guardar en Archivos".
 */
(function (global) {
  'use strict';

  function isIOS() {
    const ua = navigator.userAgent || '';
    // iPadOS 13+ se anuncia como Macintosh, pero tiene puntos táctiles
    return /iPad|iPhone|iPod/.test(ua) ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  }

  function isMobile() {
    return isIOS() || /Android/i.test(navigator.userAgent || '');
  }

  function supportsDownloadAttr() {
    const a = document.createElement('a');
    return typeof a.download !== 'undefined' && !isIOS();
  }

  function canShareFiles(file) {
    try {
      return !!(navigator.canShare && navigator.share && navigator.canShare({ files: [file] }));
    } catch (e) {
      return false;
    }
  }

  /** Nombre de archivo seguro: sin rutas ni caracteres raros, con extensión. */
  function safeFilename(name, extension, fallback) {
    let base = String(name == null ? '' : name)
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\.+$/, '');
    if (extension) {
      const rx = new RegExp('\\.' + extension + '$', 'i');
      base = base.replace(rx, '');
    }
    if (!base) base = fallback || 'codigo-qr';
    base = base.slice(0, 60);
    return extension ? base + '.' + extension : base;
  }

  function extensionOf(filename) {
    const m = /\.([a-z0-9]+)$/i.exec(filename || '');
    return m ? m[1].toLowerCase() : '';
  }

  function mimeFor(extension) {
    if (extension === 'svg') return 'image/svg+xml';
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'webp') return 'image/webp';
    return 'image/png';
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise(function (resolve, reject) {
      if (canvas.toBlob) {
        canvas.toBlob(function (blob) {
          if (blob) resolve(blob);
          else reject(new Error('No se pudo generar la imagen.'));
        }, mime || 'image/png', quality);
        return;
      }
      try {
        resolve(dataUrlToBlob(canvas.toDataURL(mime || 'image/png', quality)));
      } catch (e) {
        reject(e);
      }
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl).split(',');
    const meta = parts[0] || '';
    const mime = (meta.match(/data:([^;]+)/) || [, 'image/png'])[1];
    if (/;base64/i.test(meta)) {
      const bin = atob(parts[1] || '');
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes], { type: mime });
    }
    return new Blob([decodeURIComponent(parts[1] || '')], { type: mime });
  }

  function downloadViaAnchor(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 4000);
  }

  function openInNewTab(blob) {
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
    return !!win;
  }

  /**
   * Guarda un Blob con el mejor mecanismo disponible.
   * Devuelve 'shared' | 'downloaded' | 'opened'.
   */
  async function saveBlob(blob, filename, options) {
    const opts = options || {};
    const name = safeFilename(filename, extensionOf(filename), opts.fallbackName);
    let file = null;
    try {
      file = new File([blob], name, { type: blob.type || mimeFor(extensionOf(name)) });
    } catch (e) {
      file = null;
    }

    // En móvil la hoja de compartir es la única vía a Fotos/Archivos
    const preferShare = opts.preferShare !== undefined ? opts.preferShare : isMobile();
    if (file && preferShare && canShareFiles(file)) {
      try {
        await navigator.share({ files: [file], title: opts.title || name });
        return 'shared';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'shared';
        // Si el share falla seguimos con la descarga normal
      }
    }

    if (supportsDownloadAttr()) {
      downloadViaAnchor(blob, name);
      return 'downloaded';
    }

    if (file && canShareFiles(file)) {
      try {
        await navigator.share({ files: [file], title: opts.title || name });
        return 'shared';
      } catch (err) {
        if (err && err.name === 'AbortError') return 'shared';
      }
    }

    if (openInNewTab(blob)) return 'opened';
    downloadViaAnchor(blob, name);
    return 'downloaded';
  }

  async function saveCanvas(canvas, filename, options) {
    const opts = options || {};
    const ext = extensionOf(filename) || 'png';
    const blob = await canvasToBlob(canvas, mimeFor(ext), opts.quality);
    return saveBlob(blob, safeFilename(filename, ext, opts.fallbackName), opts);
  }

  global.GeneraQRSave = {
    isIOS,
    isMobile,
    canShareFiles,
    safeFilename,
    extensionOf,
    mimeFor,
    canvasToBlob,
    dataUrlToBlob,
    saveBlob,
    saveCanvas,
    /** true si el navegador puede mandar imágenes a la hoja de compartir */
    shareSupported: function () {
      try {
        const probe = new File([new Blob([''], { type: 'image/png' })], 'a.png', { type: 'image/png' });
        return canShareFiles(probe);
      } catch (e) {
        return false;
      }
    }
  };
})(window);
