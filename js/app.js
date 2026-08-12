  /* ---------- tabs ---------- */
  const tabBtns = document.querySelectorAll('#option-tabs .tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.querySelector(`.tab-panel[data-panel="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  /* ---------- mode toggle ---------- */
  document.querySelectorAll('#mode-toggle .mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#mode-toggle .mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.mode-panel').forEach(p => p.classList.remove('active'));
      document.querySelector(`.mode-panel[data-mode-panel="${btn.dataset.mode}"]`).classList.add('active');
    });
  });

  /* ---------- element refs ---------- */
  const urlInput = document.getElementById('url-input');
  const bgColorInput = document.getElementById('bg-color');
  const bgHex = document.getElementById('bg-hex');
  const contrastWarning = document.getElementById('contrast-warning');

  const uploadBox = document.getElementById('upload-box');
  const logoInput = document.getElementById('logo-input');
  const logoPreview = document.getElementById('logo-preview');
  const logoPreviewImg = document.getElementById('logo-preview-img');
  const logoEditBtn = document.getElementById('logo-edit');
  const logoRemoveBtn = document.getElementById('logo-remove');

  const cropSection = document.getElementById('crop-section');
  const cropCanvas = document.getElementById('crop-canvas');
  const cropZoomSlider = document.getElementById('crop-zoom');
  const cropConfirmBtn = document.getElementById('crop-confirm');
  const cropCancelBtn = document.getElementById('crop-cancel');
  const bgRemoveToggle = document.getElementById('bg-remove-toggle');
  const bgRemoveField = document.getElementById('bg-remove-field');
  const bgRemoveTolerance = document.getElementById('bg-remove-tolerance');
  const bgRemoveToleranceVal = document.getElementById('bg-remove-tolerance-val');

  const logoColorField = document.getElementById('logo-color-field');
  const logoColorCanvas = document.getElementById('logo-color-canvas');
  const logoSizeField = document.getElementById('logo-size-field');
  const logoSize = document.getElementById('logo-size');
  const logoSizeVal = document.getElementById('logo-size-val');
  const logoSizeWarning = document.getElementById('logo-size-warning');
  const logoPaddingField = document.getElementById('logo-padding-field');
  const logoPadding = document.getElementById('logo-padding');
  const logoPaddingVal = document.getElementById('logo-padding-val');
  const logoPaddingWarning = document.getElementById('logo-padding-warning');
  const logoBgField = document.getElementById('logo-bg-field');
  const logoBgGroup = document.getElementById('logo-bg-group');

  const sizeGroup = document.getElementById('size-group');
  const qrHolder = document.getElementById('qr-canvas-holder');
  const emptyState = document.getElementById('empty-state');
  const downloadBtn = document.getElementById('download-btn');
  const regenerateBtn = document.getElementById('regenerate-btn');

  function wireCollapsibleToggle(toggleId, panelEl){
    const toggle = document.getElementById(toggleId);
    if(!toggle || !panelEl) return;
    toggle.addEventListener('click', () => {
      panelEl.classList.toggle('collapsed');
      const collapsed = panelEl.classList.contains('collapsed');
      toggle.setAttribute('aria-expanded', String(!collapsed));
    });
  }
  wireCollapsibleToggle('preview-toggle', document.getElementById('preview-card'));
  wireCollapsibleToggle('tpl-preview-toggle', document.getElementById('tpl-canvas-wrap'));
  const metaSize = document.getElementById('meta-size');

  /* En móvil (Diseñador): el preview sticky se encoge al scrollear.
     El encogido arranca solo cuando la tarjeta ya está pegada arriba y
     empezaría a tapar el contenido; los botones se comprimen, no se ocultan. */
  (function wireDesignerPreviewShrink(){
    const previewCard = document.getElementById('preview-card');
    const previewPanel = document.querySelector('.preview-panel');
    if(!previewCard || !previewPanel) return;

    const mq = window.matchMedia('(max-width:900px)');
    const FULL = 220, MIN = 124;   // tamaño del QR
    const RANGE = 260;             // px de scroll para llegar al mínimo
    let stickyStart = null;
    let ticking = false;

    function reset(){
      previewCard.style.setProperty('--designer-qr-size', FULL + 'px');
      previewCard.style.setProperty('--preview-pad', '16px');
      previewCard.style.setProperty('--preview-gap', '16px');
      previewCard.style.setProperty('--preview-btn-pad', '14px 18px');
      previewCard.style.setProperty('--preview-btn-size', '14px');
      previewCard.style.setProperty('--preview-meta-size', '11px');
      previewCard.style.setProperty('--preview-meta-opacity', '1');
    }

    function lerp(a, b, t){ return a + (b - a) * t; }

    function apply(){
      ticking = false;
      const designerActive = !!document.querySelector('.mode-panel[data-mode-panel="designer"].active');
      if(!mq.matches || !designerActive || previewCard.classList.contains('collapsed')){
        stickyStart = null;
        reset();
        return;
      }

      const y = window.scrollY || document.documentElement.scrollTop || 0;
      // Punto en el que el panel se vuelve sticky (deja de moverse con la página)
      if(stickyStart === null){
        const stickyTop = parseFloat(getComputedStyle(previewPanel).top) || 8;
        stickyStart = Math.max(0, previewPanel.getBoundingClientRect().top + y - stickyTop);
      }

      if(y <= stickyStart){
        reset();
        return;
      }

      const t = Math.min(1, (y - stickyStart) / RANGE);
      previewCard.style.setProperty('--designer-qr-size', Math.round(lerp(FULL, MIN, t)) + 'px');
      previewCard.style.setProperty('--preview-pad', Math.round(lerp(16, 10, t)) + 'px');
      previewCard.style.setProperty('--preview-gap', Math.round(lerp(16, 8, t)) + 'px');
      previewCard.style.setProperty(
        '--preview-btn-pad',
        Math.round(lerp(14, 9, t)) + 'px ' + Math.round(lerp(18, 12, t)) + 'px'
      );
      previewCard.style.setProperty('--preview-btn-size', lerp(14, 12, t).toFixed(1) + 'px');
      previewCard.style.setProperty('--preview-meta-size', lerp(11, 9.5, t).toFixed(1) + 'px');
      previewCard.style.setProperty('--preview-meta-opacity', lerp(1, 0.6, t).toFixed(2));
    }

    function onScroll(){
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(apply);
    }

    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', () => { stickyStart = null; onScroll(); });
    document.querySelectorAll('#mode-toggle .mode-btn').forEach(btn => {
      btn.addEventListener('click', () => { stickyStart = null; setTimeout(apply, 0); });
    });
    const toggle = document.getElementById('preview-toggle');
    if(toggle) toggle.addEventListener('click', () => { stickyStart = null; setTimeout(apply, 0); });
    reset();
    onScroll();
  })();

  const presetNameInput = document.getElementById('preset-name-input');
  const presetSaveBtn = document.getElementById('preset-save-btn');
  const presetListEl = document.getElementById('preset-list');
  const presetEmpty = document.getElementById('preset-empty');

  const tplGrid = document.getElementById('tpl-grid');
  const tplGallery = document.getElementById('tpl-gallery');
  const tplEditor = document.getElementById('tpl-editor');
  const tplBackBtn = document.getElementById('tpl-back-btn');
  const tplResetBtn = document.getElementById('tpl-reset-btn');
  const tplCanvas = document.getElementById('tpl-canvas');
  const tplEditorTitle = document.getElementById('tpl-editor-title');
  const tplTitleInput = document.getElementById('tpl-title-input');
  const tplSubtitleInput = document.getElementById('tpl-subtitle-input');
  const tplQrInput = document.getElementById('tpl-qr-input');
  const tplTitleFontSelect = document.getElementById('tpl-title-font');
  const tplSubtitleFontSelect = document.getElementById('tpl-subtitle-font');
  const tplBgColor = document.getElementById('tpl-bg-color');
  const tplBgHex = document.getElementById('tpl-bg-hex');
  const tplTitleColor = document.getElementById('tpl-title-color');
  const tplTitleColorHex = document.getElementById('tpl-title-color-hex');
  const tplSubtitleColor = document.getElementById('tpl-subtitle-color');
  const tplSubtitleColorHex = document.getElementById('tpl-subtitle-color-hex');
  const tplAccentColor = document.getElementById('tpl-accent-color');
  const tplAccentHex = document.getElementById('tpl-accent-hex');
  const tplAccentGroup = document.getElementById('tpl-accent-group');
  const tplUseMainStyle = document.getElementById('tpl-use-main-style');
  const tplDownloadBtn = document.getElementById('tpl-download-btn');

  /* ---------- state ---------- */
  let logoImage = null;      // final cropped image used on the QR
  let originalImage = null;  // image currently used for cropping (raw or bg-removed)
  let rawOriginalImage = null; // untouched uploaded image, kept to toggle bg removal on/off
  let bgRemoveActive = false;
  let finalCanvas = null;
  let debounceTimer = null;
  let targetSize = 1024;
  let logoBgShape = 'rounded';

  // Espera a que QRCodeStyling termine de pintar su <canvas>. La librería lo
  // dibuja de forma asíncrona (no está listo apenas se llama a .append()), así
  // que se necesita un margen mínimo antes de leerlo — si se lee demasiado
  // pronto se copia un canvas en blanco y el QR "desaparece". Se mantiene el
  // mismo tiempo de espera que ya funcionaba, con un pequeño sondeo extra por
  // si en algún dispositivo tarda más.
  function waitForCanvas(container, cb){
    setTimeout(() => {
      const c = container.querySelector('canvas');
      if(c){ cb(c); return; }
      // fallback: sigue esperando un poco más si aún no está listo
      let attempts = 0;
      const poll = () => {
        const c2 = container.querySelector('canvas');
        if(c2 || attempts > 20){ cb(c2); return; }
        attempts++;
        setTimeout(poll, 50);
      };
      poll();
    }, 120);
  }
  let contentType = 'link';

  const dotsTypes = [
    {value:'square', label:'Cuadrado', shape:'shape-square'},
    {value:'dots', label:'Puntos', shape:'shape-dots'},
    {value:'rounded', label:'Redondeado', shape:'shape-rounded'},
    {value:'extra-rounded', label:'Extra redondeado', shape:'shape-extra-rounded'},
    {value:'classy', label:'Clásico', shape:'shape-classy'},
    {value:'classy-rounded', label:'Clásico redondeado', shape:'shape-classy-rounded'}
  ];
  const cornerSquareTypes = [
    {value:'square', label:'Cuadrado', frame:'frame-square'},
    {value:'extra-rounded', label:'Redondeado', frame:'frame-extra-rounded'},
    {value:'dot', label:'Círculo', frame:'frame-dot'}
  ];
  const cornerDotTypes = [
    {value:'square', label:'Cuadrado', dot:'dot-square'},
    {value:'dot', label:'Círculo', dot:'dot-dot'}
  ];
  const logoBgShapes = [
    {value:'rounded', label:'Redondeado'},
    {value:'circle', label:'Círculo'},
    {value:'square', label:'Cuadrado'},
    {value:'none', label:'Sin fondo'}
  ];

  let selectedDotsType = 'rounded';
  let selectedCSquareType = 'extra-rounded';
  let selectedCDotType = 'dot';

  const colorState = {
    dots:    { mode:'solid', color1:'#1D1D1F', color2:'#FF375F', gradType:'linear', angle:45 },
    csquare: { mode:'solid', color1:'#1D1D1F', color2:'#FF375F', gradType:'linear', angle:45 },
    cdot:    { mode:'solid', color1:'#1D1D1F', color2:'#FF375F', gradType:'linear', angle:45 }
  };

  /* ---------- build swatch grids ---------- */
  function buildTypeGrid(container, items, iconBuilder, onSelect, defaultValue){
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'swatch' + (item.value === defaultValue ? ' active' : '');
      el.dataset.value = item.value;
      el.innerHTML = iconBuilder(item) + '<span>' + item.label + '</span>';
      el.addEventListener('click', () => {
        container.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        onSelect(item.value);
        scheduleGenerate();
      });
      container.appendChild(el);
    });
  }

  buildTypeGrid(
    document.getElementById('dots-type-group'), dotsTypes,
    (item) => `<div class="pattern-icon ${item.shape}"><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div><div class="cell"></div></div>`,
    (v) => selectedDotsType = v, selectedDotsType
  );
  buildTypeGrid(
    document.getElementById('csquare-type-group'), cornerSquareTypes,
    (item) => `<div class="corner-icon"><div class="frame ${item.frame}"></div><div class="dot dot-square"></div></div>`,
    (v) => selectedCSquareType = v, selectedCSquareType
  );
  buildTypeGrid(
    document.getElementById('cdot-type-group'), cornerDotTypes,
    (item) => `<div class="corner-icon"><div class="frame frame-square"></div><div class="dot ${item.dot}"></div></div>`,
    (v) => selectedCDotType = v, selectedCDotType
  );
  buildTypeGrid(
    document.getElementById('logo-bg-group'), logoBgShapes,
    (item) => item.value === 'none'
      ? `<div class="corner-icon"><div style="position:absolute;inset:4px;border:2px dashed currentColor;opacity:0.55;border-radius:4px;"></div><div style="position:absolute;top:50%;left:50%;width:150%;height:2px;background:currentColor;opacity:0.55;transform:translate(-50%,-50%) rotate(45deg);"></div></div>`
      : `<div class="corner-icon"><div class="frame frame-square" style="border-width:0;background:currentColor;opacity:0.18;border-radius:${item.value==='circle'?'50%':item.value==='square'?'2px':'30%'};"></div></div>`,
    (v) => { logoBgShape = v; checkLogoSafety(); }, logoBgShape
  );

  /* ---------- generic color group wiring ---------- */
  function wireColorGroup(prefix){
    const modeButtons = document.querySelectorAll(`[data-mode-group="${prefix}"] button`);
    modeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        colorState[prefix].mode = btn.dataset.mode;
        document.querySelector(`[data-solid-row="${prefix}"]`).style.display = colorState[prefix].mode === 'solid' ? 'flex' : 'none';
        document.querySelector(`[data-gradient-row="${prefix}"]`).classList.toggle('show', colorState[prefix].mode === 'gradient');
        checkContrast();
        scheduleGenerate();
      });
    });

    document.querySelectorAll(`[data-color1="${prefix}"]`).forEach(input => {
      input.addEventListener('input', () => {
        colorState[prefix].color1 = input.value;
        document.querySelectorAll(`[data-hex1="${prefix}"]`).forEach(h => h.value = input.value.toUpperCase());
        // keep both solid + gradient color1 pickers in sync visually
        document.querySelectorAll(`[data-color1="${prefix}"]`).forEach(i => { if(i!==input) i.value = input.value; });
        checkContrast();
        scheduleGenerate();
      });
    });
    document.querySelectorAll(`[data-color2="${prefix}"]`).forEach(input => {
      input.addEventListener('input', () => {
        colorState[prefix].color2 = input.value;
        document.querySelectorAll(`[data-hex2="${prefix}"]`).forEach(h => h.value = input.value.toUpperCase());
        scheduleGenerate();
      });
    });

    const gradTypeButtons = document.querySelectorAll(`[data-gradtype-group="${prefix}"] button`);
    gradTypeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        gradTypeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        colorState[prefix].gradType = btn.dataset.gradtype;
        document.querySelector(`[data-angle-wrap="${prefix}"]`).classList.toggle('show', colorState[prefix].gradType === 'linear');
        scheduleGenerate();
      });
    });

    const angleInput = document.querySelector(`[data-angle="${prefix}"]`);
    angleInput.addEventListener('input', () => {
      colorState[prefix].angle = parseInt(angleInput.value, 10);
      document.querySelector(`[data-angle-val="${prefix}"]`).textContent = angleInput.value + '°';
      scheduleGenerate();
    });
  }
  ['dots','csquare','cdot'].forEach(wireColorGroup);

  function getColorOption(prefix){
    const s = colorState[prefix];
    if(s.mode === 'solid'){
      return { color: s.color1 };
    }
    return {
      gradient: {
        type: s.gradType,
        rotation: (s.angle * Math.PI) / 180,
        colorStops: [
          { offset: 0, color: s.color1 },
          { offset: 1, color: s.color2 }
        ]
      }
    };
  }

  /* ---------- background + contrast ---------- */
  bgColorInput.addEventListener('input', () => {
    bgHex.value = bgColorInput.value.toUpperCase();
    checkContrast();
    scheduleGenerate();
  });

  function luminance(hex){
    const c = hex.substring(1);
    const r = parseInt(c.substring(0,2),16)/255;
    const g = parseInt(c.substring(2,4),16)/255;
    const b = parseInt(c.substring(4,6),16)/255;
    const a = [r,g,b].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*a[0] + 0.7152*a[1] + 0.0722*a[2];
  }
  function contrastRatio(hex1, hex2){
    const l1 = luminance(hex1) + 0.05;
    const l2 = luminance(hex2) + 0.05;
    return l1 > l2 ? l1/l2 : l2/l1;
  }
  function checkContrast(){
    const dotColor = colorState.dots.color1;
    const ratio = contrastRatio(dotColor, bgColorInput.value);
    contrastWarning.classList.toggle('show', ratio < 2.5);
  }

  /* ---------- hex inputs: easy copy & paste ---------- */
  function sanitizeHexInput(raw){
    let v = (raw || '').trim();
    if(!v) return null;
    if(!v.startsWith('#')) v = '#' + v;
    if(!/^#[0-9A-Fa-f]{6}$/.test(v)) return null;
    return v.toUpperCase();
  }
  function revertHexInput(el){
    if(el.dataset.hex1) el.value = colorState[el.dataset.hex1].color1.toUpperCase();
    else if(el.dataset.hex2) el.value = colorState[el.dataset.hex2].color2.toUpperCase();
    else if(el.id === 'bg-hex') el.value = bgColorInput.value.toUpperCase();
    else if(el.id === 'tpl-bg-hex') el.value = (tplState.bgColor || '').toUpperCase();
    else if(el.id === 'tpl-title-color-hex') el.value = (tplState.titleColor || '').toUpperCase();
    else if(el.id === 'tpl-subtitle-color-hex') el.value = (tplState.subtitleColor || '').toUpperCase();
    else if(el.id === 'tpl-accent-hex') el.value = (tplState.accent || '').toUpperCase();
  }
  function applyHexToTarget(el, hex){
    if(el.dataset.hex1){
      const prefix = el.dataset.hex1;
      colorState[prefix].color1 = hex;
      document.querySelectorAll(`[data-color1="${prefix}"]`).forEach(i => i.value = hex);
      document.querySelectorAll(`[data-hex1="${prefix}"]`).forEach(h => h.value = hex);
      checkContrast(); scheduleGenerate();
    } else if(el.dataset.hex2){
      const prefix = el.dataset.hex2;
      colorState[prefix].color2 = hex;
      document.querySelectorAll(`[data-color2="${prefix}"]`).forEach(i => i.value = hex);
      document.querySelectorAll(`[data-hex2="${prefix}"]`).forEach(h => h.value = hex);
      scheduleGenerate();
    } else if(el.id === 'bg-hex'){
      bgColorInput.value = hex;
      checkContrast(); scheduleGenerate();
    } else if(el.id === 'tpl-bg-hex'){
      tplState.bgColor = hex; tplState.bgGradient = null;
      tplBgColor.value = hex;
      scheduleTplRender();
    } else if(el.id === 'tpl-title-color-hex'){
      tplState.titleColor = hex; tplTitleColor.value = hex;
      scheduleTplRender();
    } else if(el.id === 'tpl-subtitle-color-hex'){
      tplState.subtitleColor = hex; tplSubtitleColor.value = hex;
      scheduleTplRender();
    } else if(el.id === 'tpl-accent-hex'){
      tplState.accent = hex; tplAccentColor.value = hex;
      document.querySelectorAll('#tpl-accent-group .swatch').forEach(s => s.classList.remove('active'));
      scheduleTplRender();
    }
  }
  function wireHexCopyPaste(){
    document.querySelectorAll('input.hex-val').forEach(el => {
      el.addEventListener('focus', () => el.select());
      el.addEventListener('input', () => {
        if(el.value && !el.value.startsWith('#')) el.value = '#' + el.value;
      });
      el.addEventListener('keydown', (e) => { if(e.key === 'Enter') el.blur(); });
      el.addEventListener('change', () => {
        const hex = sanitizeHexInput(el.value);
        if(!hex){
          el.classList.add('invalid');
          setTimeout(() => { el.classList.remove('invalid'); revertHexInput(el); }, 650);
          return;
        }
        el.classList.remove('invalid');
        el.value = hex;
        applyHexToTarget(el, hex);
      });
    });
  }
  wireHexCopyPaste();

  /* ---------- resolution pills ---------- */
  sizeGroup.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      sizeGroup.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      targetSize = parseInt(btn.dataset.size, 10);
      generate(true);
    });
  });

  /* ---------- logo upload + crop ---------- */
  const CROP_SIZE = 320;
  let cropZoom = 1, cropOffsetX = 0, cropOffsetY = 0, cropBaseScale = 1;

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        rawOriginalImage = img;
        originalImage = img;
        bgRemoveActive = false;
        bgRemoveToggle.classList.remove('active');
        bgRemoveToggle.textContent = '✂️ Quitar fondo de la imagen';
        bgRemoveField.style.display = 'none';
        openCropper();
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // Quita el fondo de la imagen subida: toma el color promedio de sus 4
  // esquinas (asumiendo que ahí está el fondo) y vuelve transparente todo
  // pixel de un color parecido, con un borde suavizado para que no quede
  // dentado. Funciona directamente sobre la imagen original (no la recortada)
  // para que el resultado se vea bien sin importar el zoom o la posición.
  function removeBackgroundFromImage(img, tolerancePct){
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const cx = c.getContext('2d');
    cx.drawImage(img, 0, 0);
    const imgData = cx.getImageData(0, 0, c.width, c.height);
    const d = imgData.data;
    const sampleAt = (x, y) => {
      const i = (y * c.width + x) * 4;
      return [d[i], d[i+1], d[i+2]];
    };
    const corners = [sampleAt(0,0), sampleAt(c.width-1,0), sampleAt(0,c.height-1), sampleAt(c.width-1,c.height-1)];
    const bg = [0,1,2].map(ch => Math.round(corners.reduce((s,p) => s + p[ch], 0) / 4));
    const maxDist = Math.sqrt(3 * 255 * 255);
    const threshold = (tolerancePct / 100) * maxDist;
    const inner = threshold * 0.7, outer = threshold * 1.15;
    for(let i = 0; i < d.length; i += 4){
      const dr = d[i] - bg[0], dg = d[i+1] - bg[1], db = d[i+2] - bg[2];
      const dist = Math.sqrt(dr*dr + dg*dg + db*db);
      if(dist <= inner){
        d[i+3] = 0;
      } else if(dist < outer){
        d[i+3] = Math.round(d[i+3] * ((dist - inner) / (outer - inner)));
      }
    }
    cx.putImageData(imgData, 0, 0);
    return c;
  }

  function applyBgRemovalState(){
    if(!rawOriginalImage) return;
    if(bgRemoveActive){
      originalImage = removeBackgroundFromImage(rawOriginalImage, parseInt(bgRemoveTolerance.value, 10));
    } else {
      originalImage = rawOriginalImage;
    }
    clampCropOffsets();
    drawCrop();
  }

  bgRemoveToggle.addEventListener('click', () => {
    bgRemoveActive = !bgRemoveActive;
    bgRemoveToggle.classList.toggle('active', bgRemoveActive);
    bgRemoveToggle.textContent = bgRemoveActive ? '✓ Fondo quitado' : '✂️ Quitar fondo de la imagen';
    bgRemoveField.style.display = bgRemoveActive ? 'block' : 'none';
    applyBgRemovalState();
  });
  bgRemoveTolerance.addEventListener('input', () => {
    bgRemoveToleranceVal.textContent = bgRemoveTolerance.value + '%';
    if(bgRemoveActive) applyBgRemovalState();
  });

  function openCropper(){
    cropZoom = 1;
    cropZoomSlider.value = 100;
    cropBaseScale = Math.min(CROP_SIZE / originalImage.width, CROP_SIZE / originalImage.height);
    centerCrop();
    drawCrop();
    cropSection.classList.add('show');
    uploadBox.style.display = 'none';
    logoPreview.classList.remove('show');
  }

  function currentDrawSize(){
    const totalScale = cropBaseScale * cropZoom;
    return { w: originalImage.width * totalScale, h: originalImage.height * totalScale };
  }
  function centerCrop(){
    const { w, h } = currentDrawSize();
    cropOffsetX = (CROP_SIZE - w) / 2;
    cropOffsetY = (CROP_SIZE - h) / 2;
  }
  function clampCropOffsets(){
    const { w, h } = currentDrawSize();
    const minX = CROP_SIZE - w, minY = CROP_SIZE - h;
    cropOffsetX = Math.min(0, Math.max(minX, cropOffsetX));
    cropOffsetY = Math.min(0, Math.max(minY, cropOffsetY));
  }
  function drawCrop(){
    const ctx = cropCanvas.getContext('2d');
    ctx.clearRect(0, 0, CROP_SIZE, CROP_SIZE);
    const { w, h } = currentDrawSize();
    ctx.drawImage(originalImage, cropOffsetX, cropOffsetY, w, h);
  }

  cropZoomSlider.addEventListener('input', () => {
    cropZoom = parseInt(cropZoomSlider.value, 10) / 100;
    clampCropOffsets();
    drawCrop();
  });

  let cropDragging = false, cropLastX = 0, cropLastY = 0;
  cropCanvas.addEventListener('pointerdown', (e) => {
    cropDragging = true; cropLastX = e.clientX; cropLastY = e.clientY;
    cropCanvas.setPointerCapture(e.pointerId);
  });
  cropCanvas.addEventListener('pointermove', (e) => {
    if(!cropDragging) return;
    const rect = cropCanvas.getBoundingClientRect();
    const scaleFactor = CROP_SIZE / rect.width;
    cropOffsetX += (e.clientX - cropLastX) * scaleFactor;
    cropOffsetY += (e.clientY - cropLastY) * scaleFactor;
    clampCropOffsets();
    drawCrop();
    cropLastX = e.clientX; cropLastY = e.clientY;
  });
  window.addEventListener('pointerup', () => { cropDragging = false; });

  cropCancelBtn.addEventListener('click', () => {
    cropSection.classList.remove('show');
    if(logoImage){
      logoPreview.classList.add('show');
    } else {
      uploadBox.style.display = 'block';
    }
  });

  cropConfirmBtn.addEventListener('click', () => {
    const OUTPUT = 512;
    const ratio = OUTPUT / CROP_SIZE;
    const { w, h } = currentDrawSize();
    const outCanvas = document.createElement('canvas');
    outCanvas.width = OUTPUT; outCanvas.height = OUTPUT;
    const octx = outCanvas.getContext('2d');
    octx.drawImage(originalImage, cropOffsetX * ratio, cropOffsetY * ratio, w * ratio, h * ratio);

    const finalImg = new Image();
    finalImg.onload = () => {
      // Recorte nuevo: deja de estar ligado a un logo de la galería
      applyLogoImage(finalImg, { logoId: null });
    };
    finalImg.src = outCanvas.toDataURL();
  });

  logoEditBtn.addEventListener('click', () => {
    if(!originalImage) return;
    logoPreview.classList.remove('show');
    cropBaseScale = Math.min(CROP_SIZE / originalImage.width, CROP_SIZE / originalImage.height);
    clampCropOffsets();
    drawCrop();
    cropSection.classList.add('show');
  });

  logoRemoveBtn.addEventListener('click', () => {
    logoImage = null;
    originalImage = null;
    rawOriginalImage = null;
    activeLogoId = null;
    renderLogoGallery();
    bgRemoveActive = false;
    bgRemoveToggle.classList.remove('active');
    bgRemoveToggle.textContent = '✂️ Quitar fondo de la imagen';
    bgRemoveField.style.display = 'none';
    logoInput.value = '';
    logoPreview.classList.remove('show');
    cropSection.classList.remove('show');
    uploadBox.style.display = 'block';
    logoSizeField.style.display = 'none';
    logoPaddingField.style.display = 'none';
    logoBgField.style.display = 'none';
    logoColorField.style.display = 'none';
    logoSizeWarning.classList.remove('show');
    scheduleGenerate();
  });

  function drawLogoOnColorCanvas(img){
    const ctx = logoColorCanvas.getContext('2d');
    const cw = logoColorCanvas.width, ch = logoColorCanvas.height;
    ctx.clearRect(0,0,cw,ch);
    const scale = Math.min(cw/img.width, ch/img.height);
    const dw = img.width*scale, dh = img.height*scale;
    ctx.drawImage(img, (cw-dw)/2, (ch-dh)/2, dw, dh);
  }
  function rgbToHex(r,g,b){ return '#' + [r,g,b].map(v => v.toString(16).padStart(2,'0')).join(''); }

  // Aplica un color sólido a las 3 partes del QR (puntos, esquinas y centro de
  // esquinas), forzando el modo "Sólido" en cada una y sincronizando toda la UI
  // (pickers, campos hex y botones de modo) para que quede consistente.
  function setQrColorEverywhere(hex){
    ['dots','csquare','cdot'].forEach(prefix => {
      colorState[prefix].mode = 'solid';
      colorState[prefix].color1 = hex;

      const modeButtons = document.querySelectorAll(`[data-mode-group="${prefix}"] button`);
      modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === 'solid'));

      const solidRow = document.querySelector(`[data-solid-row="${prefix}"]`);
      if(solidRow) solidRow.style.display = 'flex';
      const gradientRow = document.querySelector(`[data-gradient-row="${prefix}"]`);
      if(gradientRow) gradientRow.classList.remove('show');

      document.querySelectorAll(`[data-color1="${prefix}"]`).forEach(i => i.value = hex);
      document.querySelectorAll(`[data-hex1="${prefix}"]`).forEach(h => h.value = hex.toUpperCase());
    });
    checkContrast();
  }

  logoColorCanvas.addEventListener('click', (e) => {
    const ctx = logoColorCanvas.getContext('2d');
    const rect = logoColorCanvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (logoColorCanvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (logoColorCanvas.height / rect.height));
    let pixel;
    try{ pixel = ctx.getImageData(x, y, 1, 1).data; } catch(err){ return; }
    if(pixel[3] === 0) return;
    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
    setQrColorEverywhere(hex);
    logoColorCanvas.classList.add('picked');
    setTimeout(() => logoColorCanvas.classList.remove('picked'), 400);
    scheduleGenerate();
  });

  // El "fondo" (badge) del logo ahora es un tamaño directo e independiente,
  // expresado como % del QR (slider "logo-padding" ya NO es relativo al logo).
  // Así, mover "Tamaño del logo" nunca cambia el fondo y viceversa. Su único
  // límite real es el riesgo de que el QR falle al escanear, señalado con un
  // aviso — el usuario decide qué tan grande lo deja.
  // La única excepción es una salvaguarda mínima: si el logo llega a ser más
  // grande que el fondo elegido, el fondo crece lo justo para no dejarlo fuera.
  function computeBadgeSize(baseSize, logoMax, badgePct){
    return Math.max(baseSize * badgePct, logoMax);
  }

  function checkLogoSafety(){
    const size = parseInt(logoSize.value, 10);
    const badgePct = parseInt(logoPadding.value, 10);
    const covered = logoBgShape === 'none' ? size : Math.max(size, badgePct);
    const risky = covered >= 30;
    logoSizeWarning.classList.toggle('show', !!logoImage && risky);
    logoPaddingWarning.classList.toggle('show', !!logoImage && risky && logoBgShape !== 'none');
  }
  logoSize.addEventListener('input', () => {
    logoSizeVal.textContent = logoSize.value + '%';
    checkLogoSafety();
    scheduleGenerate();
  });
  logoPadding.addEventListener('input', () => {
    logoPaddingVal.textContent = logoPadding.value + '% del QR';
    checkLogoSafety();
    scheduleGenerate();
  });

  function roundRect(ctx, x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  /* ---------- content types: link, email, call, whatsapp, wifi, pdf, app, imágenes, video, redes sociales, evento ---------- */
  const ICON_LINK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9.5 14.5 14.5 9.5"/><path d="M7 17 5 19a3.5 3.5 0 0 1-5-5l2-2"/><path d="M17 7l2-2a3.5 3.5 0 0 1 5 5l-2 2"/><path d="M13.5 5.5 17 2M6.5 18.5 3 22" stroke="none"/><path d="M8.5 15.5 4 20a3 3 0 0 0 4 4l4.5-4.5" stroke="none"/><path d="M9.8 14.2 6.3 17.7a3 3 0 0 0 4 4l3.5-3.5"/><path d="M14.2 9.8 17.7 6.3a3 3 0 0 1 4 4l-3.5 3.5"/></svg>`;
  const ICON_MAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3.5 6 8.5 7 8.5-7"/></svg>`;
  const ICON_CALL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4.5C4 14.5 9.5 20 19.5 20l1-4-5.3-1.6-1.6 2C10.9 15 9 13.1 7.6 10.4l2-1.6L8 3.5z"/></svg>`;
  const ICON_CHAT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 1 3.4 6.8L3 20l1.3-3.7A8.4 8.4 0 0 1 3.5 12Z"/></svg>`;
  const ICON_WIFI = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M2.5 8.5a15 15 0 0 1 19 0"/><path d="M5.8 12.3a10.4 10.4 0 0 1 12.4 0"/><path d="M9 16a5.3 5.3 0 0 1 6 0"/><circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none"/></svg>`;
  const ICON_PDF = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2.5h8l4 4V21a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-18a.5.5 0 0 1 .5-.5Z"/><path d="M14 2.5V7h4"/><path d="M8.3 17v-4h1.1a1.3 1.3 0 0 1 0 2.6H8.3M12.3 17v-4h.9a1.9 1.9 0 0 1 0 4h-.9zM17.5 13h-1.8v4M17 15h-1.3"/></svg>`;
  const ICON_APP = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6.5" y="1.5" width="11" height="21" rx="2.3"/><path d="M10.3 19.3h3.4"/></svg>`;
  const ICON_IMAGE = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4" width="19" height="16" rx="2.3"/><circle cx="8.3" cy="9.3" r="1.7"/><path d="m4 18 5.5-5.8a1.8 1.8 0 0 1 2.6 0L16 16.1l1.4-1.5a1.8 1.8 0 0 1 2.6 0L21.5 16"/></svg>`;
  const ICON_VIDEO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="14" height="14" rx="2.3"/><path d="M16.5 10.3 21 7.5v9l-4.5-2.8"/></svg>`;
  const ICON_SOCIAL = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="12" r="2.6"/><circle cx="18" cy="5.5" r="2.6"/><circle cx="18" cy="18.5" r="2.6"/><path d="m7.7 10.7 8-3.7M7.7 13.3l8 3.7"/></svg>`;
  const ICON_EVENT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="17" rx="2.3"/><path d="M2.5 9.5h19M7.5 2v4.5M16.5 2v4.5"/><circle cx="8.2" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none"/><circle cx="15.8" cy="14" r="1" fill="currentColor" stroke="none"/></svg>`;
  const ICON_VCARD = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2.3"/><circle cx="9" cy="10" r="2.2"/><path d="M5.5 16.2c.7-1.8 2-2.7 3.5-2.7s2.8.9 3.5 2.7"/><path d="M14.5 9.5h4M14.5 13h4"/></svg>`;

  const contentTypes = [
    { id:'link', label:'Enlace', icon:ICON_LINK },
    { id:'vcard', label:'Contacto', icon:ICON_VCARD },
    { id:'email', label:'E-mail', icon:ICON_MAIL },
    { id:'call', label:'Llamada', icon:ICON_CALL },
    { id:'whatsapp', label:'WhatsApp', icon:ICON_CHAT },
    { id:'wifi', label:'WiFi', icon:ICON_WIFI },
    { id:'pdf', label:'PDF', icon:ICON_PDF },
    { id:'app', label:'App', icon:ICON_APP },
    { id:'image', label:'Imágenes', icon:ICON_IMAGE },
    { id:'video', label:'Video', icon:ICON_VIDEO },
    { id:'social', label:'Redes sociales', icon:ICON_SOCIAL },
    { id:'event', label:'Evento', icon:ICON_EVENT }
  ];
  const SOCIAL_BASE = {
    instagram:'https://instagram.com/',
    facebook:'https://facebook.com/',
    twitter:'https://x.com/',
    tiktok:'https://tiktok.com/@',
    linkedin:'https://linkedin.com/in/',
    youtube:'https://youtube.com/@'
  };

  function buildContentTypeGrid(){
    const grid = document.getElementById('content-type-grid');
    grid.innerHTML = '';
    contentTypes.forEach(t => {
      const el = document.createElement('div');
      el.className = 'swatch type-swatch' + (t.id === contentType ? ' active' : '');
      el.dataset.value = t.id;
      el.innerHTML = t.icon + `<span>${t.label}</span>`;
      el.addEventListener('click', () => setContentType(t.id));
      grid.appendChild(el);
    });
  }
  function setContentType(id){
    contentType = id;
    document.querySelectorAll('#content-type-grid .swatch').forEach(s => s.classList.toggle('active', s.dataset.value === id));
    document.querySelectorAll('.content-field').forEach(f => f.classList.toggle('active', f.dataset.contentType === id));
    scheduleGenerate();
  }
  buildContentTypeGrid();

  const wifiEncSelect = document.getElementById('wifi-enc');
  const wifiPasswordField = document.getElementById('wifi-password-field');
  wifiEncSelect.addEventListener('change', () => {
    wifiPasswordField.style.display = wifiEncSelect.value === 'nopass' ? 'none' : 'block';
  });

  document.querySelectorAll('.content-field input, .content-field select').forEach(el => {
    el.addEventListener('input', scheduleGenerate);
    el.addEventListener('change', scheduleGenerate);
  });

  function icsDate(value){
    if(!value) return '';
    return value.replace(/[-:]/g, '') + '00';
  }
  function composeQrData(){
    switch(contentType){
      case 'email': {
        const to = document.getElementById('email-to').value.trim();
        if(!to) return '';
        const subject = document.getElementById('email-subject').value.trim();
        const body = document.getElementById('email-body').value.trim();
        const params = [];
        if(subject) params.push('subject=' + encodeURIComponent(subject));
        if(body) params.push('body=' + encodeURIComponent(body));
        return 'mailto:' + to + (params.length ? '?' + params.join('&') : '');
      }
      case 'call': {
        const phone = document.getElementById('call-phone').value.trim();
        return phone ? 'tel:' + phone.replace(/[^\d+]/g, '') : '';
      }
      case 'whatsapp': {
        const phone = document.getElementById('wa-phone').value.trim().replace(/[^\d]/g, '');
        if(!phone) return '';
        const msg = document.getElementById('wa-message').value.trim();
        return 'https://wa.me/' + phone + (msg ? '?text=' + encodeURIComponent(msg) : '');
      }
      case 'wifi': {
        const ssid = document.getElementById('wifi-ssid').value.trim();
        if(!ssid) return '';
        const esc = s => s.replace(/([\\;,:"])/g, '\\$1');
        const enc = wifiEncSelect.value;
        const pass = document.getElementById('wifi-password').value;
        const hidden = document.getElementById('wifi-hidden').checked ? 'true' : 'false';
        let s = `WIFI:T:${enc};S:${esc(ssid)};`;
        if(enc !== 'nopass') s += `P:${esc(pass)};`;
        s += `H:${hidden};;`;
        return s;
      }
      case 'pdf': return document.getElementById('pdf-url').value.trim();
      case 'app': return document.getElementById('app-url').value.trim();
      case 'image': return document.getElementById('img-url').value.trim();
      case 'video': return document.getElementById('video-url').value.trim();
      case 'social': {
        const handle = document.getElementById('social-handle').value.trim().replace(/^@/, '');
        if(!handle) return '';
        if(/^https?:\/\//i.test(handle)) return handle;
        const base = SOCIAL_BASE[document.getElementById('social-platform').value] || '';
        return base + handle;
      }
      case 'event': {
        const title = document.getElementById('event-title').value.trim();
        if(!title) return '';
        const location = document.getElementById('event-location').value.trim();
        const desc = document.getElementById('event-desc').value.trim();
        const start = document.getElementById('event-start').value;
        const end = document.getElementById('event-end').value;
        let ics = 'BEGIN:VEVENT\n' + `SUMMARY:${title}\n`;
        if(location) ics += `LOCATION:${location}\n`;
        if(desc) ics += `DESCRIPTION:${desc}\n`;
        if(start) ics += `DTSTART:${icsDate(start)}\n`;
        if(end) ics += `DTEND:${icsDate(end)}\n`;
        ics += 'END:VEVENT';
        return ics;
      }
      case 'vcard': {
        const first = document.getElementById('vcard-first').value.trim();
        const last = document.getElementById('vcard-last').value.trim();
        const org = document.getElementById('vcard-org').value.trim();
        const title = document.getElementById('vcard-title').value.trim();
        const phone = document.getElementById('vcard-phone').value.trim();
        const email = document.getElementById('vcard-email').value.trim();
        let web = document.getElementById('vcard-url').value.trim();
        if(!first && !last && !phone && !email) return '';
        const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
        if(web && !/^https?:\/\//i.test(web)) web = 'https://' + web;
        const full = [first, last].filter(Boolean).join(' ');
        let v = 'BEGIN:VCARD\nVERSION:3.0\n';
        v += 'N:' + esc(last) + ';' + esc(first) + ';;;\n';
        if(full) v += 'FN:' + esc(full) + '\n';
        if(org) v += 'ORG:' + esc(org) + '\n';
        if(title) v += 'TITLE:' + esc(title) + '\n';
        if(phone) v += 'TEL;TYPE=CELL:' + esc(phone) + '\n';
        if(email) v += 'EMAIL:' + esc(email) + '\n';
        if(web) v += 'URL:' + esc(web) + '\n';
        v += 'END:VCARD';
        return v;
      }
      case 'link':
      default:
        return urlInput.value.trim();
    }
  }

  /* ---------- QR generation ---------- */
  urlInput.addEventListener('input', scheduleGenerate);
  regenerateBtn.addEventListener('click', () => generate(true));

  let downloadFormat = 'png';
  const formatGroup = document.getElementById('format-group');
  const sizeField = document.getElementById('size-field');
  function syncDownloadFormatUI(){
    if(formatGroup){
      formatGroup.querySelectorAll('button').forEach(b => {
        b.classList.toggle('active', b.dataset.format === downloadFormat);
      });
    }
    if(sizeField) sizeField.style.display = downloadFormat === 'png' ? 'block' : 'none';
    downloadBtn.textContent = downloadFormat === 'svg' ? 'Descargar SVG' : 'Descargar PNG';
    syncFilenameExt();
  }
  if(formatGroup){
    formatGroup.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        downloadFormat = btn.dataset.format || 'png';
        syncDownloadFormatUI();
      });
    });
  }
  syncDownloadFormatUI();

  function scheduleGenerate(){
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => generate(true), 150);
  }

  function generate(animate){
    const text = (composeQrData() || '').trim();
    qrHolder.innerHTML = '';
    if(!text){
      emptyState.style.display = 'block';
      downloadBtn.disabled = true;
      finalCanvas = null;
      return;
    }
    emptyState.style.display = 'none';

    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.position = 'fixed';
    hiddenDiv.style.left = '-9999px';
    document.body.appendChild(hiddenDiv);

    const qrObj = new QRCodeStyling({
      width: targetSize,
      height: targetSize,
      type: 'canvas',
      data: text,
      margin: Math.round(targetSize * 0.05),
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: Object.assign({ type: selectedDotsType }, getColorOption('dots')),
      cornersSquareOptions: Object.assign({ type: selectedCSquareType }, getColorOption('csquare')),
      cornersDotOptions: Object.assign({ type: selectedCDotType }, getColorOption('cdot')),
      backgroundOptions: { color: bgColorInput.value }
    });
    qrObj.append(hiddenDiv);

    waitForCanvas(hiddenDiv, (sourceCanvas) => {
      if(!sourceCanvas){ document.body.removeChild(hiddenDiv); return; }

      const outCanvas = document.createElement('canvas');
      outCanvas.width = targetSize;
      outCanvas.height = targetSize;
      const ctx = outCanvas.getContext('2d');
      ctx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);

      if(logoImage){
        const pct = parseInt(logoSize.value, 10) / 100;
        const logoMax = targetSize * pct;
        let logoW, logoH;
        if(logoImage.width >= logoImage.height){
          logoW = logoMax; logoH = logoMax * (logoImage.height / logoImage.width);
        } else {
          logoH = logoMax; logoW = logoMax * (logoImage.width / logoImage.height);
        }
        const padPct = parseInt(logoPadding.value, 10) / 100;
        const badgeSize = computeBadgeSize(targetSize, logoMax, padPct);
        const bx = (targetSize - badgeSize) / 2;
        const by = (targetSize - badgeSize) / 2;

        if(logoBgShape !== 'none'){
          ctx.fillStyle = bgColorInput.value;
          if(logoBgShape === 'circle'){
            ctx.beginPath();
            ctx.arc(targetSize/2, targetSize/2, badgeSize/2, 0, Math.PI*2);
            ctx.fill();
          } else if(logoBgShape === 'square'){
            ctx.fillRect(bx, by, badgeSize, badgeSize);
          } else {
            roundRect(ctx, bx, by, badgeSize, badgeSize, badgeSize*0.22);
            ctx.fill();
          }
        }
        ctx.drawImage(logoImage, (targetSize-logoW)/2, (targetSize-logoH)/2, logoW, logoH);
      }

      finalCanvas = outCanvas;
      qrHolder.innerHTML = '';
      const displayCanvas = document.createElement('canvas');
      displayCanvas.width = targetSize;
      displayCanvas.height = targetSize;
      displayCanvas.getContext('2d').drawImage(outCanvas, 0, 0);
      qrHolder.appendChild(displayCanvas);

      downloadBtn.disabled = false;
      metaSize.textContent = targetSize + ' × ' + targetSize + ' px';

      if(animate){
        qrHolder.classList.remove('pop');
        void qrHolder.offsetWidth;
        qrHolder.classList.add('pop');
      }

      document.body.removeChild(hiddenDiv);
    });
  }

  /* ---------- nombre de archivo + guardado (iOS/Android incluidos) ----------
     Los elementos se buscan al usarlos: estas funciones también se llaman
     durante la inicialización, antes de que se declaren las constantes de más
     abajo en el archivo. */
  function chosenFilename(extension){
    const input = document.getElementById('filename-input');
    const raw = (input && input.value) || '';
    const save = window.GeneraQRSave;
    if(save) return save.safeFilename(raw, extension, 'codigo-qr');
    return (raw.trim() || 'codigo-qr') + '.' + extension;
  }

  function syncFilenameExt(){
    const el = document.getElementById('filename-ext');
    if(el) el.textContent = '.' + downloadFormat;
  }

  function updateDownloadHelp(){
    const help = document.getElementById('download-help');
    if(!help) return;
    const save = window.GeneraQRSave;
    if(save && save.isMobile() && save.shareSupported()){
      help.textContent = 'Al descargar se abre la hoja de compartir: elige “Guardar imagen” (Fotos) o “Guardar en Archivos”.';
    } else if(save && save.isIOS()){
      help.textContent = 'En iPhone la imagen se abre en una pestaña nueva: mantén pulsado para guardarla en Fotos.';
    } else {
      help.textContent = 'Se guarda en tu carpeta de descargas. Puedes cambiarle el nombre arriba.';
    }
  }

  async function saveQrFile(blobOrCanvas, extension){
    const save = window.GeneraQRSave;
    const name = chosenFilename(extension);
    if(!save){
      // Último recurso si el helper no cargó
      const link = document.createElement('a');
      link.download = name;
      link.href = blobOrCanvas instanceof Blob
        ? URL.createObjectURL(blobOrCanvas)
        : blobOrCanvas.toDataURL('image/png');
      link.click();
      return;
    }
    if(blobOrCanvas instanceof Blob){
      await save.saveBlob(blobOrCanvas, name, { title: name });
    } else {
      await save.saveCanvas(blobOrCanvas, name, { title: name });
    }
  }

  async function buildSvgBlob(){
    const text = (composeQrData() || '').trim();
    if(!text) return null;
    const svgSize = Math.max(targetSize, 512);
    const options = {
      width: svgSize,
      height: svgSize,
      type: 'svg',
      data: text,
      margin: Math.round(svgSize * 0.05),
      qrOptions: { errorCorrectionLevel: 'H' },
      dotsOptions: Object.assign({ type: selectedDotsType }, getColorOption('dots')),
      cornersSquareOptions: Object.assign({ type: selectedCSquareType }, getColorOption('csquare')),
      cornersDotOptions: Object.assign({ type: selectedCDotType }, getColorOption('cdot')),
      backgroundOptions: { color: bgColorInput.value }
    };
    if(logoImage && logoImage.src){
      options.image = logoImage.src;
      options.imageOptions = {
        crossOrigin: 'anonymous',
        margin: 6,
        // Sin tope: respetamos el tamaño elegido por el usuario
        imageSize: Math.max(0.05, parseInt(logoSize.value, 10) / 100)
      };
    }
    const qrObj = new QRCodeStyling(options);
    const blob = await qrObj.getRawData('svg');
    return blob instanceof Blob ? blob : new Blob([blob], { type: 'image/svg+xml' });
  }

  downloadBtn.addEventListener('click', async () => {
    const originalLabel = downloadBtn.textContent;
    downloadBtn.disabled = true;
    try{
      if(downloadFormat === 'svg'){
        const blob = await buildSvgBlob();
        if(!blob) return;
        await saveQrFile(blob, 'svg');
      } else {
        if(!finalCanvas) return;
        await saveQrFile(finalCanvas, 'png');
      }
    } catch(err){
      console.error(err);
      alert('No se pudo guardar la imagen. Inténtalo de nuevo.');
    } finally {
      downloadBtn.textContent = originalLabel;
      downloadBtn.disabled = !(composeQrData() || '').trim();
    }
  });

  /* ---------- saved design presets (cuenta Firebase o localStorage) ---------- */
  const PRESETS_KEY = 'generaqr_presets_v1';
  let presetsCache = [];
  let presetsCloudMode = false;
  const presetStorageHint = document.getElementById('preset-storage-hint');

  function getLocalPresets(){
    try{ return JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); }
    catch(e){ return []; }
  }
  function setLocalPresets(list){
    try{ localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); return true; }
    catch(e){ return false; }
  }
  function clearLocalPresets(){
    try{ localStorage.removeItem(PRESETS_KEY); } catch(e){ /* ignore */ }
  }
  function escapeHtml(s){
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
  function currentStyleSnapshot(){
    return {
      dotsType: selectedDotsType,
      csquareType: selectedCSquareType,
      cdotType: selectedCDotType,
      colorState: JSON.parse(JSON.stringify(colorState)),
      bgColor: bgColorInput.value,
      logoBgShape: logoBgShape,
      logoSize: logoSize.value,
      logoPadding: logoPadding.value,
      targetSize: targetSize,
      logoId: activeLogoId || null
    };
  }
  function setActiveInGroup(containerId, value){
    const container = document.getElementById(containerId);
    container.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s.dataset.value === value));
  }
  function applyColorGroupState(prefix, state){
    if(!state) return;
    colorState[prefix] = JSON.parse(JSON.stringify(state));
    const modeButtons = document.querySelectorAll(`[data-mode-group="${prefix}"] button`);
    modeButtons.forEach(b => b.classList.toggle('active', b.dataset.mode === state.mode));
    document.querySelector(`[data-solid-row="${prefix}"]`).style.display = state.mode === 'solid' ? 'flex' : 'none';
    document.querySelector(`[data-gradient-row="${prefix}"]`).classList.toggle('show', state.mode === 'gradient');
    document.querySelectorAll(`[data-color1="${prefix}"]`).forEach(i => i.value = state.color1);
    document.querySelectorAll(`[data-hex1="${prefix}"]`).forEach(h => h.value = state.color1.toUpperCase());
    document.querySelectorAll(`[data-color2="${prefix}"]`).forEach(i => i.value = state.color2);
    document.querySelectorAll(`[data-hex2="${prefix}"]`).forEach(h => h.value = state.color2.toUpperCase());
    const gradTypeButtons = document.querySelectorAll(`[data-gradtype-group="${prefix}"] button`);
    gradTypeButtons.forEach(b => b.classList.toggle('active', b.dataset.gradtype === state.gradType));
    document.querySelector(`[data-angle-wrap="${prefix}"]`).classList.toggle('show', state.gradType === 'linear');
    const angleInput = document.querySelector(`[data-angle="${prefix}"]`);
    angleInput.value = state.angle;
    document.querySelector(`[data-angle-val="${prefix}"]`).textContent = state.angle + '°';
  }
  function updatePresetStorageHint(){
    if(!presetStorageHint) return;
    if(presetsCloudMode){
      presetStorageHint.textContent = 'Guardado en tu cuenta de Google. Disponible en cualquier dispositivo al iniciar sesión.';
    } else {
      presetStorageHint.textContent = 'Sin sesión: se guarda solo en este navegador. Entra con Google para sincronizarlos en tu cuenta.';
    }
  }
  function applyPreset(id){
    const preset = presetsCache.find(p => p.id === id);
    if(!preset) return;

    selectedDotsType = preset.dotsType;
    selectedCSquareType = preset.csquareType;
    selectedCDotType = preset.cdotType;
    setActiveInGroup('dots-type-group', preset.dotsType);
    setActiveInGroup('csquare-type-group', preset.csquareType);
    setActiveInGroup('cdot-type-group', preset.cdotType);

    logoBgShape = preset.logoBgShape;
    setActiveInGroup('logo-bg-group', preset.logoBgShape);

    ['dots','csquare','cdot'].forEach(prefix => applyColorGroupState(prefix, preset.colorState && preset.colorState[prefix]));

    bgColorInput.value = preset.bgColor;
    bgHex.value = preset.bgColor.toUpperCase();

    logoSize.value = preset.logoSize;
    logoSizeVal.textContent = preset.logoSize + '%';
    logoPadding.value = preset.logoPadding;
    logoPaddingVal.textContent = preset.logoPadding + '% del QR';

    targetSize = preset.targetSize;
    sizeGroup.querySelectorAll('button').forEach(b => b.classList.toggle('active', parseInt(b.dataset.size,10) === targetSize));

    checkLogoSafety();
    checkContrast();
    scheduleGenerate();

    // El diseño puede traer un logo de la galería
    if(preset.logoId && preset.logoId !== activeLogoId){
      useLogoFromGallery(preset.logoId).catch(err => console.warn(err));
    }
  }
  function renderPresets(){
    const presets = presetsCache;
    presetListEl.innerHTML = '';
    presetEmpty.style.display = presets.length ? 'none' : 'block';
    if(!presets.length){
      presetEmpty.textContent = presetsCloudMode
        ? 'Aún no tienes diseños en tu cuenta.'
        : 'Aún no tienes diseños guardados.';
    }
    presets.forEach(p => {
      const card = document.createElement('div');
      card.className = 'preset-card';
      const badge = presetsCloudMode
        ? '<span class="dyn-badge" style="margin-top:0;margin-left:6px;">Cuenta</span>'
        : '<span class="dyn-badge muted" style="margin-top:0;margin-left:6px;">Local</span>';
      const dotsColor = (p.colorState && p.colorState.dots && p.colorState.dots.color1) || '#1D1D1F';
      card.innerHTML = `
        <div class="preset-swatch" style="background:${escapeHtml(p.bgColor || '#fff')}">
          <span class="preset-dot" style="background:${escapeHtml(dotsColor)}"></span>
        </div>
        <div class="preset-info">
          <span class="preset-name">${escapeHtml(p.name)}${badge}</span>
          <div class="preset-actions">
            <button type="button" class="pill-btn" data-apply="${escapeHtml(p.id)}">Usar</button>
            <button type="button" class="pill-btn danger" data-del="${escapeHtml(p.id)}">Borrar</button>
          </div>
        </div>`;
      presetListEl.appendChild(card);
    });
    presetListEl.querySelectorAll('[data-apply]').forEach(btn => {
      btn.addEventListener('click', () => applyPreset(btn.dataset.apply));
    });
    presetListEl.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', () => deletePreset(btn.dataset.del));
    });
    updatePresetStorageHint();
  }

  async function deletePreset(id){
    if(presetsCloudMode && window.GeneraQRFirebase){
      try{
        await window.GeneraQRFirebase.deleteDesignPreset(id);
        presetsCache = presetsCache.filter(p => p.id !== id);
        renderPresets();
      } catch(err){
        alert(err.message || 'No se pudo borrar el diseño.');
      }
      return;
    }
    presetsCache = getLocalPresets().filter(p => p.id !== id);
    setLocalPresets(presetsCache);
    renderPresets();
  }

  async function refreshPresetsFromCloud(){
    if(!window.GeneraQRFirebase || !window.GeneraQRFirebase.isConfigured()) return false;
    const user = window.GeneraQRFirebase.getCurrentUser && window.GeneraQRFirebase.getCurrentUser();
    if(!user) return false;
    const local = getLocalPresets();
    if(local.length){
      try{
        const n = await window.GeneraQRFirebase.migrateLocalDesignPresets(local);
        if(n > 0) clearLocalPresets();
      } catch(err){
        console.warn('Migración de diseños locales:', err);
      }
    }
    presetsCache = await window.GeneraQRFirebase.listDesignPresets();
    presetsCloudMode = true;
    renderPresets();
    return true;
  }

  function loadLocalPresetsIntoCache(){
    presetsCache = getLocalPresets().map(p => Object.assign({}, p, { source: 'local' }));
    presetsCloudMode = false;
    renderPresets();
  }

  presetSaveBtn.addEventListener('click', async () => {
    const name = presetNameInput.value.trim() || 'Diseño sin nombre';
    const style = currentStyleSnapshot();

    if(presetsCloudMode && window.GeneraQRFirebase){
      presetSaveBtn.disabled = true;
      try{
        await window.GeneraQRFirebase.saveDesignPreset({ name, style });
        presetNameInput.value = '';
        await refreshPresetsFromCloud();
      } catch(err){
        console.error(err);
        const msg = (err && err.code === 'failed-precondition')
          ? 'Falta un índice en Firestore para designPresets. Abre el enlace del error en la consola del navegador.'
          : (err.message || 'No se pudo guardar en tu cuenta.');
        alert(msg);
      } finally {
        presetSaveBtn.disabled = false;
      }
      return;
    }

    const presets = getLocalPresets();
    presets.unshift({ id: 'p' + Date.now(), name, ...style });
    const ok = setLocalPresets(presets.slice(0, 20));
    if(!ok){
      presetEmpty.textContent = 'No se pudo guardar. Revisa los permisos de almacenamiento del navegador.';
      presetEmpty.style.display = 'block';
      return;
    }
    presetNameInput.value = '';
    loadLocalPresetsIntoCache();
  });

  // Sync con login Google: al entrar, diseños → cuenta; al salir, vuelve a local
  function wirePresetAuthSync(){
    loadLocalPresetsIntoCache();
    try{
      if(!window.GeneraQRFirebase || !window.GeneraQRFirebase.isConfigured()) return;
      window.GeneraQRFirebase.init();
      window.GeneraQRFirebase.onAuth(async (user) => {
        if(user){
          try{ await refreshPresetsFromCloud(); }
          catch(err){
            console.warn(err);
            loadLocalPresetsIntoCache();
          }
          refreshLogoGallery(false).catch(err => console.warn(err));
        } else {
          loadLocalPresetsIntoCache();
          logoGalleryCache = [];
          renderLogoGallery();
        }
      });
    } catch(e){
      console.warn(e);
      loadLocalPresetsIntoCache();
    }
  }
  wirePresetAuthSync();

  /* ---------- galería de logos (Firestore, comprimidos en WebP) ---------- */
  const logoGalleryEl = document.getElementById('logo-gallery');
  const logoGalleryEmpty = document.getElementById('logo-gallery-empty');
  const logoGalleryLoading = document.getElementById('logo-gallery-loading');
  const logoGallerySaveField = document.getElementById('logo-gallery-save-field');
  const logoGalleryNameInput = document.getElementById('logo-gallery-name');
  const logoGallerySaveBtn = document.getElementById('logo-gallery-save');
  const logoGalleryHint = document.getElementById('logo-gallery-hint');
  const logoGalleryRefreshBtn = document.getElementById('logo-gallery-refresh');

  let logoGalleryCache = [];
  let activeLogoId = null;
  const logoDataCache = new Map(); // id -> dataUrl (evita releer Firestore)

  function loggedIn(){
    const fb = window.GeneraQRFirebase;
    return !!(fb && fb.isConfigured() && fb.getCurrentUser && fb.getCurrentUser());
  }

  function updateLogoGalleryVisibility(){
    const hasLogo = !!logoImage;
    if(logoGallerySaveField){
      logoGallerySaveField.style.display = hasLogo && loggedIn() ? 'block' : 'none';
    }
    if(logoGalleryEmpty){
      if(!loggedIn()){
        logoGalleryEmpty.textContent = 'Inicia sesión con Google para guardar logos en tu cuenta.';
        logoGalleryEmpty.style.display = 'block';
      } else if(!logoGalleryCache.length){
        logoGalleryEmpty.textContent = hasLogo
          ? 'Aún no has guardado logos. Ponle nombre y pulsa Guardar.'
          : 'Aún no has guardado logos. Sube una imagen arriba para guardarla aquí.';
        logoGalleryEmpty.style.display = 'block';
      } else {
        logoGalleryEmpty.style.display = 'none';
      }
    }
  }

  function renderLogoGallery(){
    if(!logoGalleryEl) return;
    logoGalleryEl.innerHTML = '';
    logoGalleryCache.forEach(logo => {
      const chip = document.createElement('div');
      chip.className = 'logo-chip' + (logo.id === activeLogoId ? ' active' : '');
      chip.title = logo.name || 'Logo';
      const src = logo.thumbDataUrl || logo.dataUrl || '';
      chip.innerHTML =
        `<img src="${escapeHtml(src)}" alt="${escapeHtml(logo.name || 'Logo')}">` +
        `<span class="logo-chip-name">${escapeHtml(logo.name || 'Logo')}</span>` +
        `<button type="button" class="logo-chip-del" aria-label="Borrar logo">×</button>`;
      chip.addEventListener('click', (e) => {
        if(e.target.closest('.logo-chip-del')) return;
        useLogoFromGallery(logo.id).catch(err => alert(err.message || 'No se pudo usar el logo.'));
      });
      chip.querySelector('.logo-chip-del').addEventListener('click', async (e) => {
        e.stopPropagation();
        if(!confirm(`¿Borrar el logo "${logo.name || 'Logo'}" de tu cuenta?`)) return;
        try{
          await window.GeneraQRFirebase.deleteLogoAsset(logo.id);
          logoDataCache.delete(logo.id);
          if(activeLogoId === logo.id) activeLogoId = null;
          await refreshLogoGallery(true);
        } catch(err){
          alert(err.message || 'No se pudo borrar el logo.');
        }
      });
      logoGalleryEl.appendChild(chip);
    });
    updateLogoGalleryVisibility();
  }

  async function refreshLogoGallery(force){
    if(!loggedIn()){
      logoGalleryCache = [];
      renderLogoGallery();
      return;
    }
    if(logoGalleryLoading && force) logoGalleryLoading.hidden = false;
    try{
      logoGalleryCache = await window.GeneraQRFirebase.listLogoAssets({ force: !!force });
      logoGalleryCache.forEach(l => {
        if(l.dataUrl) logoDataCache.set(l.id, l.dataUrl);
      });
      renderLogoGallery();
    } catch(err){
      console.warn('Galería de logos:', err);
      if(err && err.code === 'failed-precondition'){
        alert('Falta un índice en Firestore para logoAssets (ownerId + updatedAt). Abre el enlace del error en la consola.');
      }
    } finally {
      if(logoGalleryLoading) logoGalleryLoading.hidden = true;
    }
  }

  /** Carga un logo de la galería y lo aplica al QR. */
  async function useLogoFromGallery(id){
    let dataUrl = logoDataCache.get(id);
    if(!dataUrl){
      const asset = await window.GeneraQRFirebase.getLogoAsset(id);
      if(!asset || !asset.dataUrl) throw new Error('Ese logo ya no está disponible.');
      dataUrl = asset.dataUrl;
      logoDataCache.set(id, dataUrl);
    }
    const img = await window.GeneraQRImageStore.loadImage(dataUrl);
    applyLogoImage(img, { logoId: id, setOriginal: true });
  }

  /** Punto único para activar un logo (subida nueva o galería). */
  function applyLogoImage(img, opts){
    const options = opts || {};
    logoImage = img;
    if(options.setOriginal){
      // Logo traído de la galería: pasa a ser la base para recortar
      originalImage = img;
      rawOriginalImage = img;
      bgRemoveActive = false;
      bgRemoveToggle.classList.remove('active');
      bgRemoveField.style.display = 'none';
    }
    activeLogoId = options.logoId || null;

    logoPreviewImg.src = img.src;
    logoPreview.classList.add('show');
    cropSection.classList.remove('show');
    uploadBox.style.display = 'none';
    logoSizeField.style.display = 'block';
    logoPaddingField.style.display = 'block';
    logoBgField.style.display = 'block';
    logoColorField.style.display = 'block';
    drawLogoOnColorCanvas(img);
    checkLogoSafety();
    renderLogoGallery();
    scheduleGenerate();
  }

  async function saveCurrentLogoToGallery(){
    if(!logoImage) return;
    if(!loggedIn()){
      alert('Inicia sesión con Google para guardar logos en tu cuenta.');
      return;
    }
    logoGallerySaveBtn.disabled = true;
    const prevHint = logoGalleryHint ? logoGalleryHint.textContent : '';
    try{
      if(logoGalleryHint) logoGalleryHint.textContent = 'Comprimiendo imagen…';
      const compressed = window.GeneraQRImageStore.compressLogo(logoImage);
      const name = (logoGalleryNameInput && logoGalleryNameInput.value.trim()) || 'Logo';
      const saved = await window.GeneraQRFirebase.saveLogoAsset({
        name: name,
        dataUrl: compressed.dataUrl,
        thumbDataUrl: compressed.thumbDataUrl,
        format: compressed.format,
        width: compressed.width,
        height: compressed.height,
        bytes: compressed.bytes
      });
      logoDataCache.set(saved.id, compressed.dataUrl);
      activeLogoId = saved.id;
      if(logoGalleryNameInput) logoGalleryNameInput.value = '';
      if(logoGalleryHint){
        logoGalleryHint.textContent = `Guardado en ${compressed.format.toUpperCase()} · ${window.GeneraQRImageStore.formatBytes(compressed.bytes)} (${compressed.width}×${compressed.height}).`;
      }
      await refreshLogoGallery(true);
    } catch(err){
      console.error(err);
      if(logoGalleryHint) logoGalleryHint.textContent = prevHint;
      alert(err.message || 'No se pudo guardar el logo.');
    } finally {
      logoGallerySaveBtn.disabled = false;
    }
  }

  function wireLogoGallery(){
    if(logoGallerySaveBtn) logoGallerySaveBtn.addEventListener('click', saveCurrentLogoToGallery);
    if(logoGalleryRefreshBtn){
      logoGalleryRefreshBtn.addEventListener('click', () => refreshLogoGallery(true));
    }
    updateLogoGalleryVisibility();
    if(loggedIn()) refreshLogoGallery(false).catch(err => console.warn(err));
  }

/* ---------- creative templates ---------- */
  /* Ordenadas de mayor a menor uso habitual. Cada una con paleta, tipografía,
     decoración y disposición ('classic' = título arriba / QR abajo,
     'badge' = QR arriba en placa / título abajo) propias, para que ninguna
     plantilla se sienta igual a otra. */
  const templates = [
    {
      id:'wifi', ambit:'WiFi', name:'Acceso WiFi',
      bg:'#131226', bgGradient:['#0F0E24','#1B1B3A','#2A1F4D'],
      titleColor:'#EAF6FF', subtitleColor:'#7CF2D6', accent:'#7CF2D6',
      accentOptions:['#7CF2D6','#A78BFA','#FDE68A'],
      titleFont:'"JetBrains Mono", monospace', subtitleFont:'"JetBrains Mono", monospace',
      titleSize:52, subtitleSize:19,
      defaultTitle:'WiFi gratis', defaultSubtitle:'Escanea y conéctate en segundos',
      decoration:'signal', layout:'badge'
    },
    {
      id:'social', ambit:'Redes sociales', name:'Sígueme',
      bg:'#DD2A7B', bgGradient:['#F58529','#DD2A7B','#8134AF','#515BD4'],
      titleColor:'#FFFFFF', subtitleColor:'#FFF3D6', accent:'#FFFFFF',
      accentOptions:['#FFFFFF','#FFE066','#00F0FF'],
      titleFont:'"Poppins", sans-serif', subtitleFont:'"Poppins", sans-serif',
      titleSize:58, subtitleSize:21,
      defaultTitle:'Sígueme', defaultSubtitle:'@tuusuario en todas las redes',
      decoration:'orbit', layout:'badge'
    },
    {
      id:'negocio', ambit:'Negocios', name:'Tarjeta profesional',
      bg:'#0B1F2A', bgGradient:null,
      titleColor:'#F4E9D8', subtitleColor:'#C9A227', accent:'#C9A227',
      accentOptions:['#C9A227','#7FB3B0','#E5E5EA'],
      titleFont:'"Playfair Display", serif', subtitleFont:'"Inter", sans-serif',
      titleSize:60, subtitleSize:22,
      defaultTitle:'Conectemos', defaultSubtitle:'Escanea para ver mi perfil profesional',
      decoration:'lines', layout:'classic'
    },
    {
      id:'restaurante', ambit:'Restaurante', name:'Carta digital',
      bg:'#C1502E', bgGradient:null,
      titleColor:'#FFF8ED', subtitleColor:'#FFD9B3', accent:'#FFD9B3',
      accentOptions:['#FFD9B3','#FFFFFF','#2E7D5B'],
      titleFont:'"Oswald", sans-serif', subtitleFont:'"Inter", sans-serif',
      titleSize:64, subtitleSize:21,
      defaultTitle:'Nuestro menú', defaultSubtitle:'Escanea para ver la carta completa',
      decoration:'dots', layout:'classic'
    },
    {
      id:'evento', ambit:'Evento', name:'Entrada al evento',
      bg:'#1D3557', bgGradient:['#1D3557','#3D6FA8'],
      titleColor:'#FFFFFF', subtitleColor:'#FFD166', accent:'#FFD166',
      accentOptions:['#FFD166','#EF476F','#06D6A0'],
      titleFont:'"Bebas Neue", sans-serif', subtitleFont:'"Inter", sans-serif',
      titleSize:78, subtitleSize:21,
      defaultTitle:'ESTÁS INVITADO', defaultSubtitle:'Escanea para ver fecha, hora y ubicación',
      decoration:'ticket', layout:'badge'
    },
    {
      id:'descuento', ambit:'Promoción', name:'Cupón de descuento',
      bg:'#101314', bgGradient:null,
      titleColor:'#EFFFF6', subtitleColor:'#9CFFCB', accent:'#39FF9E',
      accentOptions:['#39FF9E','#FFE066','#FF6B6B'],
      titleFont:'"Space Grotesk", sans-serif', subtitleFont:'"Inter", sans-serif',
      titleSize:58, subtitleSize:20,
      defaultTitle:'20% OFF', defaultSubtitle:'Escanea y aplica tu descuento en caja',
      decoration:'starburst', layout:'classic'
    },
    {
      id:'app', ambit:'App', name:'Descarga la app',
      bg:'#3A0CA3', bgGradient:['#3A0CA3','#7209B7','#4361EE'],
      titleColor:'#FFFFFF', subtitleColor:'#D6D0FF', accent:'#FFFFFF',
      accentOptions:['#FFFFFF','#7DF9FF','#FFD166'],
      titleFont:'"Montserrat", sans-serif', subtitleFont:'"Inter", sans-serif',
      titleSize:54, subtitleSize:20,
      defaultTitle:'Descarga la app', defaultSubtitle:'Disponible para iOS y Android',
      decoration:'appgrid', layout:'badge'
    },
    {
      id:'producto', ambit:'Tienda', name:'Ficha de producto',
      bg:'#F2F0EB', bgGradient:null,
      titleColor:'#1D1D1F', subtitleColor:'#6E6E73', accent:'#1D1D1F',
      accentOptions:['#1D1D1F','#B5482A','#3B5F4C'],
      titleFont:'"Inter", sans-serif', subtitleFont:'"Inter", sans-serif',
      titleSize:50, subtitleSize:19,
      defaultTitle:'Ver producto', defaultSubtitle:'Escanea para conocer precio y detalles',
      decoration:'tag', layout:'classic'
    },
    {
      id:'inmobiliaria', ambit:'Inmobiliaria', name:'En venta',
      bg:'#F5F1EA', bgGradient:null,
      titleColor:'#1D1D1F', subtitleColor:'#6E6E73', accent:'#1D1D1F',
      accentOptions:['#1D1D1F','#8E6E53','#3B5F4C'],
      titleFont:'"Merriweather", serif', subtitleFont:'"Inter", sans-serif',
      titleSize:52, subtitleSize:19,
      defaultTitle:'En venta', defaultSubtitle:'Escanea para ver el tour virtual',
      decoration:'corner', layout:'classic'
    },
    {
      id:'boda', ambit:'Boda', name:'Invitación romántica',
      bg:'#F7E9E4', bgGradient:null,
      titleColor:'#7A4B3A', subtitleColor:'#B98A73', accent:'#B98A73',
      accentOptions:['#B98A73','#C9A227','#8E7CC3'],
      titleFont:'"Great Vibes", cursive', subtitleFont:'"Cormorant Garamond", serif',
      titleSize:96, subtitleSize:24,
      defaultTitle:'Nos casamos', defaultSubtitle:'Escanea para confirmar tu asistencia',
      decoration:'frame', layout:'classic'
    },
    {
      id:'cumpleanos', ambit:'Fiesta', name:'Cumpleaños',
      bg:'#FF6FA5', bgGradient:['#FFD166','#FF6FA5','#8A5CF6'],
      titleColor:'#FFFFFF', subtitleColor:'#FFF3D6', accent:'#FFFFFF',
      accentOptions:['#FFFFFF','#FFD166','#7DF9FF'],
      titleFont:'"Dancing Script", cursive', subtitleFont:'"Inter", sans-serif',
      titleSize:80, subtitleSize:20,
      defaultTitle:'¡Es fiesta!', defaultSubtitle:'Escanea para confirmar tu asistencia',
      decoration:'confetti', layout:'badge'
    },
    {
      id:'portafolio', ambit:'Portafolio', name:'Portafolio / CV',
      bg:'#0E0E10', bgGradient:null,
      titleColor:'#F5F5F5', subtitleColor:'#8A8A93', accent:'#5CC8FF',
      accentOptions:['#5CC8FF','#FFFFFF','#FF8A5C'],
      titleFont:'"Cormorant Garamond", serif', subtitleFont:'"Inter", sans-serif',
      titleSize:58, subtitleSize:19,
      defaultTitle:'Mi portafolio', defaultSubtitle:'Escanea para ver mis proyectos y CV',
      decoration:'blueprint', layout:'classic'
    }
  ];

  const FONT_OPTIONS = [
    {label:'Playfair Display · serif elegante', value:'"Playfair Display", serif'},
    {label:'Cormorant Garamond · serif clásica', value:'"Cormorant Garamond", serif'},
    {label:'Merriweather · editorial', value:'"Merriweather", serif'},
    {label:'Great Vibes · caligráfica', value:'"Great Vibes", cursive'},
    {label:'Dancing Script · manuscrita', value:'"Dancing Script", cursive'},
    {label:'Oswald · condensada bold', value:'"Oswald", sans-serif'},
    {label:'Bebas Neue · display impactante', value:'"Bebas Neue", sans-serif'},
    {label:'Poppins · redondeada moderna', value:'"Poppins", sans-serif'},
    {label:'Montserrat · geométrica', value:'"Montserrat", sans-serif'},
    {label:'Space Grotesk · técnica moderna', value:'"Space Grotesk", sans-serif'},
    {label:'Inter · neutra', value:'"Inter", sans-serif'},
    {label:'JetBrains Mono · monoespaciada', value:'"JetBrains Mono", monospace'}
  ];
  const FONT_PRELOAD = [
    '800 60px "Playfair Display"', '600 40px "Cormorant Garamond"', '900 40px "Merriweather"',
    '400 60px "Great Vibes"', '700 50px "Dancing Script"', '600 40px "Oswald"',
    '400 60px "Bebas Neue"', '700 40px "Poppins"', '800 40px "Montserrat"',
    '700 40px "Space Grotesk"', '700 16px "Inter"', '600 30px "JetBrains Mono"'
  ];

  const QR_ICON_SVG = (color) => `<svg viewBox="0 0 24 24" width="30" height="30" fill="${color}">
    <rect x="1" y="1" width="7" height="7" rx="1.4"/><rect x="16" y="1" width="7" height="7" rx="1.4"/>
    <rect x="1" y="16" width="7" height="7" rx="1.4"/><rect x="10.5" y="1" width="3.5" height="3.5" rx="1"/>
    <rect x="1" y="10.5" width="3.5" height="3.5" rx="1"/><rect x="19.5" y="10.5" width="3.5" height="3.5" rx="1"/>
    <rect x="10.5" y="19.5" width="3.5" height="3.5" rx="1"/><rect x="16" y="16" width="7" height="7" rx="1.4"/>
  </svg>`;

  function buildGallery(){
    tplGrid.innerHTML = '';
    templates.forEach(tpl => {
      const bgStyle = tpl.bgGradient ? `linear-gradient(135deg, ${tpl.bgGradient.join(',')})` : tpl.bg;
      const card = document.createElement('div');
      card.className = 'tpl-card';
      card.style.background = bgStyle;
      card.style.color = tpl.titleColor;
      card.innerHTML = `
        <span class="tpl-tag">${tpl.ambit}</span>
        <div class="tpl-preview-text" style="font-family:${tpl.titleFont};color:${tpl.titleColor};">${tpl.defaultTitle}</div>
        <div class="tpl-preview-sub" style="color:${tpl.subtitleColor};">${tpl.defaultSubtitle}</div>
        <div class="tpl-preview-qr-wrap"><div class="tpl-preview-qr">${QR_ICON_SVG(tpl.accent === '#FFFFFF' ? '#333' : tpl.accent)}</div></div>
        <button type="button" class="tpl-edit-btn">Personalizar plantilla</button>
      `;
      card.querySelector('.tpl-edit-btn').addEventListener('click', () => openTemplateEditor(tpl.id));
      tplGrid.appendChild(card);
    });
  }

  function populateFontSelects(){
    [tplTitleFontSelect, tplSubtitleFontSelect].forEach(select => {
      select.innerHTML = FONT_OPTIONS.map(f => `<option value='${f.value}'>${f.label}</option>`).join('');
    });
  }
  populateFontSelects();

  const TPL_W = 900, TPL_H = 1200;
  const tplCtx = tplCanvas.getContext('2d');
  let currentTemplate = null;
  let tplState = {};
  let tplRenderToken = 0;
  let tplDebounce = null;

  function stateFromTemplate(tpl){
    return {
      title: tpl.defaultTitle,
      subtitle: tpl.defaultSubtitle,
      qrText: (composeQrData() || '').trim() || 'generaqr.xyz',
      titleFont: tpl.titleFont,
      subtitleFont: tpl.subtitleFont,
      titleColor: tpl.titleColor,
      subtitleColor: tpl.subtitleColor,
      bgColor: tpl.bg,
      bgGradient: tpl.bgGradient,
      accent: tpl.accent,
      useMainStyle: false
    };
  }

  function syncControlsFromState(){
    tplTitleInput.value = tplState.title;
    tplSubtitleInput.value = tplState.subtitle;
    tplQrInput.value = tplState.qrText;
    tplTitleFontSelect.value = tplState.titleFont;
    tplSubtitleFontSelect.value = tplState.subtitleFont;
    tplBgColor.value = tplState.bgColor;
    tplBgHex.value = tplState.bgColor.toUpperCase();
    tplTitleColor.value = tplState.titleColor;
    tplTitleColorHex.value = tplState.titleColor.toUpperCase();
    tplSubtitleColor.value = tplState.subtitleColor;
    tplSubtitleColorHex.value = tplState.subtitleColor.toUpperCase();
    tplAccentColor.value = tplState.accent;
    tplAccentHex.value = tplState.accent.toUpperCase();
    tplUseMainStyle.checked = tplState.useMainStyle;
    buildAccentQuickSwatches(currentTemplate);
  }

  function loadTemplateFonts(){
    return Promise.all(FONT_PRELOAD.map(f => document.fonts.load(f).catch(() => {})));
  }

  function drawDecoration(ctx, tpl, accent){
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = accent;
    ctx.fillStyle = accent;
    switch(tpl.decoration){
      case 'lines':
        ctx.lineWidth = 2;
        for(let i=0;i<3;i++){
          ctx.beginPath();
          ctx.moveTo(80, 80 + i*10);
          ctx.lineTo(220, 80 + i*10);
          ctx.stroke();
        }
        break;
      case 'frame':
        ctx.lineWidth = 1.5;
        ctx.strokeRect(48, 48, TPL_W-96, TPL_H-96);
        break;
      case 'dots':
        for(let i=0;i<7;i++){
          ctx.beginPath();
          ctx.arc(70 + i*16, 70, 4, 0, Math.PI*2);
          ctx.fill();
        }
        break;
      case 'blob':
        ctx.globalAlpha = 0.22;
        ctx.beginPath(); ctx.arc(TPL_W-100, 130, 220, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(90, TPL_H-150, 180, 0, Math.PI*2); ctx.fill();
        break;
      case 'grid':
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        for(let x=60;x<TPL_W-60;x+=36){
          ctx.beginPath(); ctx.moveTo(x,58); ctx.lineTo(x,170); ctx.stroke();
        }
        break;
      case 'corner':
        ctx.lineWidth = 2;
        ctx.strokeRect(56,56,110,110);
        ctx.strokeRect(TPL_W-166,TPL_H-166,110,110);
        break;
      case 'signal':
        // arcos concéntricos de señal, estilo radar de wifi
        ctx.lineWidth = 3;
        ctx.globalAlpha = 0.5;
        for(let i=0;i<4;i++){
          ctx.beginPath();
          ctx.arc(TPL_W/2, 466, 60 + i*46, Math.PI*1.18, Math.PI*1.82);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.4;
        for(let i=0;i<10;i++){
          ctx.beginPath();
          ctx.arc(70 + i*80, TPL_H-70, 2.6, 0, Math.PI*2);
          ctx.fill();
        }
        break;
      case 'orbit':
        // puntos orbitando en anillos, look de red social moderna
        ctx.globalAlpha = 0.5;
        [{r:150,n:8,s:5},{r:230,n:11,s:3.4}].forEach(ring => {
          for(let i=0;i<ring.n;i++){
            const a = (i/ring.n)*Math.PI*2;
            ctx.beginPath();
            ctx.arc(TPL_W/2 + Math.cos(a)*ring.r, 460 + Math.sin(a)*ring.r, ring.s, 0, Math.PI*2);
            ctx.fill();
          }
        });
        break;
      case 'ticket':
        // línea perforada de boleto + muescas laterales
        ctx.globalAlpha = 0.55;
        ctx.setLineDash([10,10]);
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(60, 940); ctx.lineTo(TPL_W-60, 940); ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(60, 940, 16, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(TPL_W-60, 940, 16, 0, Math.PI*2); ctx.fill();
        break;
      case 'starburst':
        // destello tipo etiqueta de oferta detrás del título
        ctx.globalAlpha = 0.35;
        ctx.translate(TPL_W/2, 300);
        for(let i=0;i<16;i++){
          ctx.rotate(Math.PI/8);
          ctx.fillRect(-4, -260, 8, 130);
        }
        break;
      case 'appgrid':
        // cuadrícula de iconos de apps, esquinas redondeadas
        ctx.globalAlpha = 0.4;
        for(let row=0; row<3; row++){
          for(let col=0; col<3; col++){
            roundRect(ctx, TPL_W-260 + col*58, 70 + row*58, 42, 42, 11);
          }
        }
        ctx.fill();
        break;
      case 'tag':
        // etiqueta de precio punteada con "agujero"
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 2;
        ctx.setLineDash([6,7]);
        roundRect(ctx, TPL_W-230, 64, 150, 74, 14);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.arc(TPL_W-198, 101, 7, 0, Math.PI*2); ctx.stroke();
        break;
      case 'confetti':
        // confeti de formas mixtas para fiesta/cumpleaños
        ctx.globalAlpha = 0.6;
        const shapes = [[70,90],[150,60],[TPL_W-90,100],[TPL_W-170,150],[120,1080],[TPL_W-100,1050],[TPL_W-200,1100],[80,1140]];
        shapes.forEach((p,i) => {
          if(i % 3 === 0){ ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, Math.PI*2); ctx.fill(); }
          else if(i % 3 === 1){ ctx.save(); ctx.translate(p[0],p[1]); ctx.rotate(i); ctx.fillRect(-8,-8,16,16); ctx.restore(); }
          else { ctx.save(); ctx.translate(p[0],p[1]); ctx.rotate(i); ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(9,8); ctx.lineTo(-9,8); ctx.closePath(); ctx.fill(); ctx.restore(); }
        });
        break;
      case 'blueprint':
        // cuadrícula fina tipo plano técnico, look editorial/portafolio
        ctx.globalAlpha = 0.14;
        ctx.lineWidth = 1;
        for(let x=0; x<=TPL_W; x+=45){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,TPL_H); ctx.stroke(); }
        for(let y=0; y<=TPL_H; y+=45){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(TPL_W,y); ctx.stroke(); }
        break;
    }
    ctx.restore();
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight){
    const words = String(text).split(' ');
    let line = '', lines = [];
    words.forEach(w => {
      const test = line ? line + ' ' + w : w;
      if(ctx.measureText(test).width > maxWidth && line){
        lines.push(line); line = w;
      } else { line = test; }
    });
    if(line) lines.push(line);
    lines.forEach((l,i) => ctx.fillText(l, x, y + i*lineHeight));
    return lines.length;
  }

  function buildTemplateQrOptions(){
    if(tplState.useMainStyle){
      return {
        dotsOptions: Object.assign({ type: selectedDotsType }, getColorOption('dots')),
        cornersSquareOptions: Object.assign({ type: selectedCSquareType }, getColorOption('csquare')),
        cornersDotOptions: Object.assign({ type: selectedCDotType }, getColorOption('cdot'))
      };
    }
    return {
      dotsOptions: { type: 'rounded', color: tplState.accent },
      cornersSquareOptions: { type: 'extra-rounded', color: tplState.accent },
      cornersDotOptions: { type: 'dot', color: tplState.accent }
    };
  }

  function renderTemplateQR(cb){
    const hiddenDiv = document.createElement('div');
    hiddenDiv.style.position = 'fixed'; hiddenDiv.style.left = '-9999px';
    document.body.appendChild(hiddenDiv);
    const qrObj = new QRCodeStyling(Object.assign({
      width: 480, height: 480, type: 'canvas',
      data: tplState.qrText || 'generaqr.xyz',
      margin: 10,
      qrOptions: { errorCorrectionLevel: 'H' },
      backgroundOptions: { color: '#ffffff' }
    }, buildTemplateQrOptions()));
    qrObj.append(hiddenDiv);
    waitForCanvas(hiddenDiv, (c) => {
      cb(c);
      document.body.removeChild(hiddenDiv);
    });
  }

  function tplLayoutMetrics(tpl){
    if(tpl.layout === 'badge'){
      const qrSize = 300, pad = 22, qx = (TPL_W - qrSize)/2, qy = 116;
      return {
        qrSize, pad, qx, qy,
        captionY: qy + qrSize + pad + 36,
        titleY: qy + qrSize + pad + 96,
        subtitleY: qy + qrSize + pad + 96 + Math.max(tpl.titleSize*1.05, 52) + 18,
        titleMaxWidth: TPL_W - 140,
        subtitleMaxWidth: TPL_W - 190
      };
    }
    const qrSize = 420, pad = 28, qx = (TPL_W - qrSize)/2, qy = 420;
    return {
      qrSize, pad, qx, qy,
      captionY: qy + qrSize + pad + 42,
      titleY: 190,
      subtitleY: 268,
      titleMaxWidth: TPL_W - 160,
      subtitleMaxWidth: TPL_W - 220
    };
  }

  function renderTemplate(){
    if(!currentTemplate) return;
    const token = ++tplRenderToken;
    const tpl = currentTemplate;
    const m = tplLayoutMetrics(tpl);

    loadTemplateFonts().then(() => {
      if(token !== tplRenderToken) return;

      tplCtx.clearRect(0,0,TPL_W,TPL_H);
      if(tplState.bgGradient){
        const g = tplCtx.createLinearGradient(0,0,TPL_W,TPL_H);
        tplState.bgGradient.forEach((c,i) => g.addColorStop(i/(tplState.bgGradient.length-1), c));
        tplCtx.fillStyle = g;
      } else {
        tplCtx.fillStyle = tplState.bgColor;
      }
      tplCtx.fillRect(0,0,TPL_W,TPL_H);

      drawDecoration(tplCtx, tpl, tplState.accent);

      tplCtx.textAlign = 'center';
      tplCtx.fillStyle = tplState.titleColor;
      tplCtx.font = `800 ${tpl.titleSize}px ${tplState.titleFont}`;
      wrapText(tplCtx, tplState.title || tpl.defaultTitle, TPL_W/2, m.titleY, m.titleMaxWidth, tpl.titleSize*1.05);

      tplCtx.fillStyle = tplState.subtitleColor;
      tplCtx.font = `500 ${tpl.subtitleSize}px ${tplState.subtitleFont}`;
      tplCtx.globalAlpha = 0.92;
      wrapText(tplCtx, tplState.subtitle || tpl.defaultSubtitle, TPL_W/2, m.subtitleY, m.subtitleMaxWidth, tpl.subtitleSize*1.4);
      tplCtx.globalAlpha = 1;

      renderTemplateQR((qrCanvas) => {
        if(token !== tplRenderToken || !qrCanvas) return;
        const { qrSize, qx, qy, pad } = m;
        tplCtx.save();
        tplCtx.shadowColor = 'rgba(0,0,0,0.18)';
        tplCtx.shadowBlur = 30;
        tplCtx.shadowOffsetY = 12;
        roundRect(tplCtx, qx-pad, qy-pad, qrSize+pad*2, qrSize+pad*2, 28);
        tplCtx.fillStyle = '#ffffff';
        tplCtx.fill();
        tplCtx.restore();
        tplCtx.drawImage(qrCanvas, qx, qy, qrSize, qrSize);

        // Bug fix: cuando "usar el mismo diseño del Diseñador" está activo y hay
        // un logo subido, el logo se dibuja también aquí sobre el QR de la plantilla
        // (antes no se dibujaba en absoluto y parecía que la imagen "desaparecía").
        if(tplState.useMainStyle && logoImage){
          const pct = parseInt(logoSize.value, 10) / 100;
          const logoMax = qrSize * pct;
          let logoW, logoH;
          if(logoImage.width >= logoImage.height){
            logoW = logoMax; logoH = logoMax * (logoImage.height / logoImage.width);
          } else {
            logoH = logoMax; logoW = logoMax * (logoImage.width / logoImage.height);
          }
          const padPct = parseInt(logoPadding.value, 10) / 100;
          const badgeSize = computeBadgeSize(qrSize, logoMax, padPct);
          const cx = qx + qrSize/2, cy = qy + qrSize/2;
          const bx = cx - badgeSize/2, by = cy - badgeSize/2;
          if(logoBgShape !== 'none'){
            tplCtx.fillStyle = '#ffffff';
            if(logoBgShape === 'circle'){
              tplCtx.beginPath(); tplCtx.arc(cx, cy, badgeSize/2, 0, Math.PI*2); tplCtx.fill();
            } else if(logoBgShape === 'square'){
              tplCtx.fillRect(bx, by, badgeSize, badgeSize);
            } else {
              roundRect(tplCtx, bx, by, badgeSize, badgeSize, badgeSize*0.22);
              tplCtx.fill();
            }
          }
          tplCtx.drawImage(logoImage, cx - logoW/2, cy - logoH/2, logoW, logoH);
        }

        tplCtx.fillStyle = tplState.subtitleColor;
        tplCtx.font = `600 16px "Inter"`;
        tplCtx.textAlign = 'center';
        tplCtx.globalAlpha = 0.85;
        tplCtx.fillText('ESCANEA CON LA CÁMARA', TPL_W/2, m.captionY);
        tplCtx.globalAlpha = 1;

        tplDownloadBtn.disabled = false;
      });
    });
  }
  function scheduleTplRender(){ clearTimeout(tplDebounce); tplDebounce = setTimeout(renderTemplate, 120); }

  function buildAccentQuickSwatches(tpl){
    tplAccentGroup.innerHTML = '';
    tpl.accentOptions.forEach(color => {
      const el = document.createElement('div');
      el.className = 'swatch accent-swatch' + (color.toLowerCase() === tplState.accent.toLowerCase() ? ' active' : '');
      el.innerHTML = `<span class="accent-dot" style="background:${color}"></span>`;
      el.addEventListener('click', () => {
        tplAccentGroup.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
        el.classList.add('active');
        tplState.accent = color;
        tplAccentColor.value = color;
        tplAccentHex.value = color.toUpperCase();
        renderTemplate();
      });
      tplAccentGroup.appendChild(el);
    });
  }

  function openTemplateEditor(id){
    currentTemplate = templates.find(t => t.id === id);
    tplState = stateFromTemplate(currentTemplate);
    tplEditorTitle.textContent = currentTemplate.name;
    tplDownloadBtn.disabled = true;
    syncControlsFromState();
    tplGallery.classList.remove('active');
    tplEditor.classList.add('active');
    renderTemplate();
  }

  tplBackBtn.addEventListener('click', () => {
    tplEditor.classList.remove('active');
    tplGallery.classList.add('active');
  });
  tplResetBtn.addEventListener('click', () => {
    if(!currentTemplate) return;
    tplState = stateFromTemplate(currentTemplate);
    syncControlsFromState();
    renderTemplate();
  });
  tplTitleInput.addEventListener('input', () => { tplState.title = tplTitleInput.value; scheduleTplRender(); });
  tplSubtitleInput.addEventListener('input', () => { tplState.subtitle = tplSubtitleInput.value; scheduleTplRender(); });
  tplQrInput.addEventListener('input', () => {
    tplState.qrText = tplQrInput.value.trim() || 'generaqr.xyz';
    scheduleTplRender();
  });
  tplTitleFontSelect.addEventListener('change', () => { tplState.titleFont = tplTitleFontSelect.value; renderTemplate(); });
  tplSubtitleFontSelect.addEventListener('change', () => { tplState.subtitleFont = tplSubtitleFontSelect.value; renderTemplate(); });
  tplBgColor.addEventListener('input', () => {
    tplState.bgColor = tplBgColor.value;
    tplState.bgGradient = null;
    tplBgHex.value = tplBgColor.value.toUpperCase();
    scheduleTplRender();
  });
  tplTitleColor.addEventListener('input', () => {
    tplState.titleColor = tplTitleColor.value;
    tplTitleColorHex.value = tplTitleColor.value.toUpperCase();
    scheduleTplRender();
  });
  tplSubtitleColor.addEventListener('input', () => {
    tplState.subtitleColor = tplSubtitleColor.value;
    tplSubtitleColorHex.value = tplSubtitleColor.value.toUpperCase();
    scheduleTplRender();
  });
  tplAccentColor.addEventListener('input', () => {
    tplState.accent = tplAccentColor.value;
    tplAccentHex.value = tplAccentColor.value.toUpperCase();
    tplAccentGroup.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    scheduleTplRender();
  });
  tplUseMainStyle.addEventListener('change', () => {
    tplState.useMainStyle = tplUseMainStyle.checked;
    renderTemplate();
  });
  tplDownloadBtn.addEventListener('click', async () => {
    if(!currentTemplate) return;
    const name = `generaqr-${currentTemplate.id}.png`;
    tplDownloadBtn.disabled = true;
    try{
      if(window.GeneraQRSave){
        await window.GeneraQRSave.saveCanvas(tplCanvas, name, { title: name });
      } else {
        const link = document.createElement('a');
        link.download = name;
        link.href = tplCanvas.toDataURL('image/png');
        link.click();
      }
    } catch(err){
      console.error(err);
      alert('No se pudo guardar el diseño. Inténtalo de nuevo.');
    } finally {
      tplDownloadBtn.disabled = false;
    }
  });

  buildGallery();

  /* ---------- init ---------- */
  syncFilenameExt();
  updateDownloadHelp();
  wireLogoGallery();
  checkContrast();
  generate(false);
