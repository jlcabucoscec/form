/**
 * ChromaCraft Pro - Main Application Controller
 */

(function () {
  // Application State
  const state = {
    image: null,
    imageWidth: 0,
    imageHeight: 0,
    fileName: 'cutout',
    engine: new ChromaEngine(),
    
    // Engine mode: 'studio' (Chroma key) | 'logo' (Boundary contiguous logo removal)
    engineMode: 'studio',
    contiguous: true,
    defringe: 0.80,
    customSeeds: [],
    isPunchToolActive: false,

    // Chroma key settings
    keyColor: { r: 0, g: 177, b: 64 },
    tolerance: 0.38,
    smoothness: 0.15,
    edgeChoke: 0,
    preserveShadows: 0.0,
    despill: 0.70,
    despillMode: 'warm',
    
    // Color Match / Grade
    brightness: 0.0,
    contrast: 0.0,
    saturation: 0.0,

    // View & Display
    viewMode: 'split', // 'split' | 'result' | 'mask' | 'original'
    bgType: 'checker-dark',
    customBgImage: null,
    
    // Viewport transform
    zoom: 1.0,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    splitPos: 0.5, // 0.0 to 1.0
    isDraggingSplit: false,
    isEyedropperActive: false,

    // Render loop
    isRendering: false,
    needsRender: false
  };

  // DOM Elements
  const el = {
    // Mode Switcher
    btnModeStudio: document.getElementById('btnModeStudio'),
    btnModeLogo: document.getElementById('btnModeLogo'),
    logoModeBanner: document.getElementById('logoModeBanner'),

    // Logo & Matte Refinement Controls
    groupContiguous: document.getElementById('groupContiguous'),
    chkContiguous: document.getElementById('chkContiguous'),
    groupDefringe: document.getElementById('groupDefringe'),
    sliderDefringe: document.getElementById('sliderDefringe'),
    valDefringe: document.getElementById('valDefringe'),
    groupPocketPunch: document.getElementById('groupPocketPunch'),
    btnPunchTool: document.getElementById('btnPunchTool'),
    punchBtnText: document.getElementById('punchBtnText'),
    valPocketsCount: document.getElementById('valPocketsCount'),
    btnClearPockets: document.getElementById('btnClearPockets'),
    sectionSpill: document.getElementById('sectionSpill'),
    groupShadow: document.getElementById('groupShadow'),

    // Dropzone & Inputs
    dropzoneOverlay: document.getElementById('dropzoneOverlay'),
    dropCard: document.getElementById('dropCard'),
    btnBrowseDrop: document.getElementById('btnBrowseDrop'),
    imageFileInput: document.getElementById('imageFileInput'),
    btnUploadNew: document.getElementById('btnUploadNew'),

    // Preset Samples
    sampleIntramuralsBtn: document.getElementById('sampleIntramuralsBtn'),
    sampleShieldBtn: document.getElementById('sampleShieldBtn'),
    sampleBlueDragonBtn: document.getElementById('sampleBlueDragonBtn'),
    sampleSealBtn: document.getElementById('sampleSealBtn'),
    samplePortraitBtn: document.getElementById('samplePortraitBtn'),

    // Viewport & Artboard
    canvasViewportWrapper: document.getElementById('canvasViewportWrapper'),
    canvasArtboard: document.getElementById('canvasArtboard'),
    customBackdropLayer: document.getElementById('customBackdropLayer'),
    mainCanvas: document.getElementById('mainCanvas'),
    originalCanvas: document.getElementById('originalCanvas'),
    splitSliderContainer: document.getElementById('splitSliderContainer'),
    splitOriginalWrap: document.getElementById('splitOriginalWrap'),
    splitHandle: document.getElementById('splitHandle'),
    splitLabelBefore: document.getElementById('splitLabelBefore'),
    splitLabelAfter: document.getElementById('splitLabelAfter'),

    // View Tabs
    tabSplit: document.getElementById('tabSplit'),
    tabResult: document.getElementById('tabResult'),
    tabMask: document.getElementById('tabMask'),
    tabOriginal: document.getElementById('tabOriginal'),

    // Zoom Controls
    btnZoomIn: document.getElementById('btnZoomIn'),
    btnZoomOut: document.getElementById('btnZoomOut'),
    btnZoomFit: document.getElementById('btnZoomFit'),
    btnResetView: document.getElementById('btnResetView'),
    zoomLevelText: document.getElementById('zoomLevelText'),

    // Eyedropper & Loupe
    btnEyedropper: document.getElementById('btnEyedropper'),
    eyedropperBtnText: document.getElementById('eyedropperBtnText'),
    btnAutoDetect: document.getElementById('btnAutoDetect'),
    eyedropperLoupe: document.getElementById('eyedropperLoupe'),
    loupeCanvas: document.getElementById('loupeCanvas'),
    loupeSwatch: document.getElementById('loupeSwatch'),

    // Color UI
    colorPreviewBox: document.getElementById('colorPreviewBox'),
    nativeColorInput: document.getElementById('nativeColorInput'),
    colorHexText: document.getElementById('colorHexText'),
    colorRgbText: document.getElementById('colorRgbText'),
    presetChips: document.querySelectorAll('.preset-chip'),

    // Sliders
    sliderTolerance: document.getElementById('sliderTolerance'),
    valTolerance: document.getElementById('valTolerance'),
    sliderSmoothness: document.getElementById('sliderSmoothness'),
    valSmoothness: document.getElementById('valSmoothness'),
    sliderChoke: document.getElementById('sliderChoke'),
    valChoke: document.getElementById('valChoke'),
    sliderShadow: document.getElementById('sliderShadow'),
    valShadow: document.getElementById('valShadow'),

    // Despill
    sliderDespill: document.getElementById('sliderDespill'),
    valDespill: document.getElementById('valDespill'),
    despillPills: document.querySelectorAll('.pill-opt'),

    // Backdrop
    bgCards: document.querySelectorAll('.bg-card-opt'),
    bgImageFileInput: document.getElementById('bgImageFileInput'),
    bgCardCustom: document.getElementById('bgCardCustom'),

    // Adjustments
    sliderBrightness: document.getElementById('sliderBrightness'),
    valBrightness: document.getElementById('valBrightness'),
    sliderContrast: document.getElementById('sliderContrast'),
    valContrast: document.getElementById('valContrast'),
    sliderSaturation: document.getElementById('sliderSaturation'),
    valSaturation: document.getElementById('valSaturation'),
    btnResetAdjustments: document.getElementById('btnResetAdjustments'),

    // Exports
    lblDimensions: document.getElementById('lblDimensions'),
    lblRenderTime: document.getElementById('lblRenderTime'),
    btnDownloadTransparent: document.getElementById('btnDownloadTransparent'),
    btnDownloadTransparentBottom: document.getElementById('btnDownloadTransparentBottom'),
    btnDownloadComposite: document.getElementById('btnDownloadComposite'),
    btnCopyClipboard: document.getElementById('btnCopyClipboard'),
    toastMsg: document.getElementById('toastMsg'),
    toastText: document.getElementById('toastText')
  };

  const mainCtx = el.mainCanvas.getContext('2d');
  const origCtx = el.originalCanvas.getContext('2d');
  const loupeCtx = el.loupeCanvas.getContext('2d');

  /**
   * Set Removal Engine Mode ('studio' vs 'logo')
   */
  function setEngineMode(mode, options = {}) {
    state.engineMode = mode;

    if (mode === 'logo') {
      el.btnModeStudio.classList.remove('active');
      el.btnModeLogo.classList.add('active');
      el.logoModeBanner.style.display = 'block';
      el.groupContiguous.style.display = 'block';
      el.groupDefringe.style.display = 'block';
      el.groupPocketPunch.style.display = 'block';
      if (el.sectionSpill) el.sectionSpill.style.display = 'none';
      if (el.groupShadow) el.groupShadow.style.display = 'none';

      // Default logo tuned settings
      if (!options.preserveSettings) {
        state.tolerance = options.tolerance !== undefined ? options.tolerance : 0.22;
        state.smoothness = options.smoothness !== undefined ? options.smoothness : 0.10;
        state.defringe = options.defringe !== undefined ? options.defringe : 0.80;
        state.edgeChoke = options.edgeChoke !== undefined ? options.edgeChoke : 0;
        el.sliderTolerance.value = Math.round(state.tolerance * 100);
        el.valTolerance.textContent = `${Math.round(state.tolerance * 100)}%`;
        el.sliderSmoothness.value = Math.round(state.smoothness * 100);
        el.valSmoothness.textContent = `${Math.round(state.smoothness * 100)}%`;
        el.sliderDefringe.value = Math.round(state.defringe * 100);
        el.valDefringe.textContent = `${Math.round(state.defringe * 100)}%`;
        el.sliderChoke.value = state.edgeChoke;
        el.valChoke.textContent = `${state.edgeChoke}px`;
      }
    } else {
      el.btnModeStudio.classList.add('active');
      el.btnModeLogo.classList.remove('active');
      el.logoModeBanner.style.display = 'none';
      el.groupContiguous.style.display = 'none';
      el.groupDefringe.style.display = 'none';
      el.groupPocketPunch.style.display = 'none';
      if (el.sectionSpill) el.sectionSpill.style.display = 'block';
      if (el.groupShadow) el.groupShadow.style.display = 'block';

      if (!options.preserveSettings) {
        state.tolerance = 0.38;
        state.smoothness = 0.15;
        state.edgeChoke = 0;
        el.sliderTolerance.value = 38;
        el.valTolerance.textContent = '38%';
        el.sliderSmoothness.value = 15;
        el.valSmoothness.textContent = '15%';
        el.sliderChoke.value = 0;
        el.valChoke.textContent = '0px';
      }
    }

    if (state.image) {
      if (options.autoDetectColor) {
        const rawData = origCtx.getImageData(0, 0, state.imageWidth, state.imageHeight);
        const detected = state.engine.autoDetectKeyColor(rawData, mode);
        if (detected) setKeyColor(detected.r, detected.g, detected.b);
      }
      requestRender();
    }
  }

  /**
   * Initialize Event Listeners
   */
  function init() {
    setupUploadHandlers();
    setupControls();
    setupViewportNavigation();
    setupSplitSlider();
    setupEyedropper();
    setupExportHandlers();

    // Auto-load Intramurals logo by default to immediately demonstrate logo interior protection
    loadImage('samples/logo-intramurals.jpg', 'logo-intramurals.jpg', () => {
      setEngineMode('logo', { tolerance: 0.22, smoothness: 0.10, defringe: 0.85 });
      setKeyColor(255, 255, 255);
    });
  }

  /**
   * Load Image from URL or File
   */
  function loadImage(src, name = 'cutout', onLoaded = null) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      state.image = img;
      state.imageWidth = img.naturalWidth || img.width;
      state.imageHeight = img.naturalHeight || img.height;
      state.fileName = name.replace(/\.[^/.]+$/, '');
      state.customSeeds = [];
      if (el.valPocketsCount) el.valPocketsCount.textContent = '0 punched';
      if (el.btnClearPockets) el.btnClearPockets.style.display = 'none';

      // Update canvas sizes
      el.mainCanvas.width = state.imageWidth;
      el.mainCanvas.height = state.imageHeight;
      el.originalCanvas.width = state.imageWidth;
      el.originalCanvas.height = state.imageHeight;

      // Draw original onto originalCanvas
      origCtx.clearRect(0, 0, state.imageWidth, state.imageHeight);
      origCtx.drawImage(img, 0, 0);

      // Read raw pixels into ChromaEngine
      const rawData = origCtx.getImageData(0, 0, state.imageWidth, state.imageHeight);
      state.engine.setImageData(rawData);

      // Check corner color to intelligently detect if it's a graphic/logo
      const logoColor = state.engine.autoDetectLogoColor(rawData);
      const isWhiteBg = (logoColor.r >= 235 && logoColor.g >= 235 && logoColor.b >= 235);
      const isNamedLogo = /logo|crest|shield|seal|badge|emblem/i.test(name);

      if (onLoaded) {
        onLoaded();
      } else {
        if (isWhiteBg || isNamedLogo) {
          setEngineMode('logo', { tolerance: 0.22, smoothness: 0.10, defringe: 0.85 });
          setKeyColor(logoColor.r, logoColor.g, logoColor.b);
        } else {
          // Standard auto-detection
          const detectedColor = state.engine.autoDetectKeyColor(rawData, state.engineMode);
          if (detectedColor) {
            setKeyColor(detectedColor.r, detectedColor.g, detectedColor.b);
          }
        }
      }

      // Hide dropzone
      el.dropzoneOverlay.classList.add('hidden');

      // Update info labels
      el.lblDimensions.textContent = `Dimensions: ${state.imageWidth} × ${state.imageHeight} px`;

      // Fit to viewport
      fitImageToScreen();

      // Trigger initial render
      requestRender();
    };
    img.src = src;
  }

  function loadSampleImage(path, filename) {
    loadImage(path, filename);
  }

  /**
   * Render Pipeline using ChromaEngine
   */
  function requestRender() {
    if (!state.image) return;
    if (state.isRendering) {
      state.needsRender = true;
      return;
    }

    state.isRendering = true;
    const startTime = performance.now();

    // Determine engine render mode
    let engineMode = 'result';
    if (state.viewMode === 'mask') {
      engineMode = 'mask';
    } else if (state.viewMode === 'original') {
      engineMode = 'original';
    }

    // Process using ChromaEngine
    const processedData = state.engine.process({
      engineMode: state.engineMode,
      keyColor: state.keyColor,
      tolerance: state.tolerance,
      smoothness: state.smoothness,
      defringe: state.defringe,
      contiguous: state.contiguous,
      customSeeds: state.customSeeds,
      despill: state.despill,
      despillMode: state.despillMode,
      preserveShadows: state.preserveShadows,
      edgeChoke: state.edgeChoke,
      brightness: state.brightness,
      contrast: state.contrast,
      saturation: state.saturation,
      mode: engineMode
    });

    if (processedData) {
      mainCtx.putImageData(processedData, 0, 0);
    }

    const elapsed = Math.round(performance.now() - startTime);
    el.lblRenderTime.textContent = `Render: ${elapsed}ms`;

    updateViewModeDisplay();

    state.isRendering = false;
    if (state.needsRender) {
      state.needsRender = false;
      requestAnimationFrame(requestRender);
    }
  }


  /**
   * Set Key Color and update UI
   */
  function setKeyColor(r, g, b) {
    state.keyColor = { r, g, b };
    const hex = ChromaEngine.rgbToHex(r, g, b);
    el.colorPreviewBox.style.backgroundColor = hex;
    el.nativeColorInput.value = hex;
    el.colorHexText.textContent = hex.toUpperCase();
    el.colorRgbText.textContent = `RGB (${r}, ${g}, ${b})`;

    // Check if matches preset chip
    el.presetChips.forEach(chip => {
      if (chip.dataset.color.toLowerCase() === hex.toLowerCase()) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });
  }

  /**
   * Setup Upload & Drag-and-Drop
   */
  function setupUploadHandlers() {
    // Browse button triggers file input
    el.btnBrowseDrop.addEventListener('click', () => el.imageFileInput.click());
    el.btnUploadNew.addEventListener('click', () => el.imageFileInput.click());

    el.imageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleSelectedFile(file);
    });

    // Preset sample buttons
    if (el.sampleIntramuralsBtn) {
      el.sampleIntramuralsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadImage('samples/logo-intramurals.jpg', 'logo-intramurals.jpg', () => {
          setEngineMode('logo', { tolerance: 0.22, smoothness: 0.10, defringe: 0.85 });
          setKeyColor(255, 255, 255);
        });
      });
    }

    if (el.sampleShieldBtn) {
      el.sampleShieldBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadImage('samples/logo-shield.png', 'logo-criminal-justice-shield.png', () => {
          setEngineMode('logo', { tolerance: 0.25, smoothness: 0.10, defringe: 0.85 });
          setKeyColor(255, 255, 255);
        });
      });
    }

    if (el.sampleBlueDragonBtn) {
      el.sampleBlueDragonBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadImage('samples/logo-bluedragon.png', 'logo-bluedragon.png', () => {
          setEngineMode('logo', { tolerance: 0.18, smoothness: 0.08, defringe: 0.80 });
          setKeyColor(14, 30, 56);
        });
      });
    }

    if (el.sampleSealBtn) {
      el.sampleSealBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadImage('samples/logo-seal.jpg', 'logo-seal.jpg', () => {
          setEngineMode('logo', { tolerance: 0.22, smoothness: 0.10, defringe: 0.85 });
          setKeyColor(255, 255, 255);
        });
      });
    }

    if (el.samplePortraitBtn) {
      el.samplePortraitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        loadImage('samples/portrait.jpg', 'studio-portrait.jpg', () => {
          setEngineMode('studio');
          setKeyColor(0, 177, 64);
        });
      });
    }

    // Drag and Drop
    const dropArea = el.dropCard;
    const stage = document.getElementById('canvasStage');

    ['dragenter', 'dragover'].forEach(eventName => {
      stage.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(eventName => {
      stage.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropArea.classList.remove('drag-over');
      });
    });

    stage.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0 && files[0].type.startsWith('image/')) {
        handleSelectedFile(files[0]);
      }
    });
  }

  function handleSelectedFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      loadImage(e.target.result, file.name);
    };
    reader.readAsDataURL(file);
  }

  /**
   * Setup UI Sliders and Buttons
   */
  function setupControls() {
    // Mode Switcher buttons
    if (el.btnModeStudio) {
      el.btnModeStudio.addEventListener('click', () => {
        setEngineMode('studio', { autoDetectColor: true });
        showToast('Switched to Studio Photo Mode');
      });
    }

    if (el.btnModeLogo) {
      el.btnModeLogo.addEventListener('click', () => {
        setEngineMode('logo', { autoDetectColor: true });
        showToast('Switched to Logo & Graphics Mode');
      });
    }

    // Contiguous interior protection switch
    if (el.chkContiguous) {
      el.chkContiguous.addEventListener('change', (e) => {
        state.contiguous = e.target.checked;
        showToast(state.contiguous ? 'Interior content protected (Contiguous)' : 'Global color removal (All pixels)');
        requestRender();
      });
    }

    // Defringe / Edge Halo removal
    if (el.sliderDefringe) {
      el.sliderDefringe.addEventListener('input', (e) => {
        state.defringe = parseFloat(e.target.value) / 100;
        el.valDefringe.textContent = `${e.target.value}%`;
        requestRender();
      });
    }

    // Pocket punch tool
    if (el.btnPunchTool) {
      el.btnPunchTool.addEventListener('click', () => {
        togglePunchTool();
      });
    }

    if (el.btnClearPockets) {
      el.btnClearPockets.addEventListener('click', () => {
        state.customSeeds = [];
        if (el.valPocketsCount) el.valPocketsCount.textContent = '0 punched';
        el.btnClearPockets.style.display = 'none';
        showToast('Punched holes cleared');
        requestRender();
      });
    }

    // Key color picker
    el.nativeColorInput.addEventListener('input', (e) => {
      const rgb = ChromaEngine.hexToRgb(e.target.value);
      setKeyColor(rgb.r, rgb.g, rgb.b);
      requestRender();
    });

    // Preset color chips
    el.presetChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const hex = chip.dataset.color;
        const rgb = ChromaEngine.hexToRgb(hex);
        setKeyColor(rgb.r, rgb.g, rgb.b);
        requestRender();
      });
    });

    // Auto-detect button
    el.btnAutoDetect.addEventListener('click', () => {
      if (!state.image) return;
      const rawData = origCtx.getImageData(0, 0, state.imageWidth, state.imageHeight);
      const detected = state.engine.autoDetectKeyColor(rawData, state.engineMode);
      if (detected) {
        setKeyColor(detected.r, detected.g, detected.b);
        showToast('Auto-detected background color!');
        requestRender();
      }
    });

    // Tolerance
    el.sliderTolerance.addEventListener('input', (e) => {
      state.tolerance = parseFloat(e.target.value) / 100;
      el.valTolerance.textContent = `${e.target.value}%`;
      requestRender();
    });

    // Smoothness / Softness
    el.sliderSmoothness.addEventListener('input', (e) => {
      state.smoothness = parseFloat(e.target.value) / 100;
      el.valSmoothness.textContent = `${e.target.value}%`;
      requestRender();
    });

    // Edge Choke
    el.sliderChoke.addEventListener('input', (e) => {
      state.edgeChoke = parseInt(e.target.value, 10);
      el.valChoke.textContent = `${e.target.value}px`;
      requestRender();
    });

    // Cast Shadows
    el.sliderShadow.addEventListener('input', (e) => {
      state.preserveShadows = parseFloat(e.target.value) / 100;
      el.valShadow.textContent = `${e.target.value}%`;
      requestRender();
    });

    // Spill suppression
    el.sliderDespill.addEventListener('input', (e) => {
      state.despill = parseFloat(e.target.value) / 100;
      el.valDespill.textContent = `${e.target.value}%`;
      requestRender();
    });

    // Despill mode pills
    el.despillPills.forEach(pill => {
      pill.addEventListener('click', () => {
        el.despillPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.despillMode = pill.dataset.despillMode;
        requestRender();
      });
    });

    // Foreground adjustments
    el.sliderBrightness.addEventListener('input', (e) => {
      state.brightness = parseFloat(e.target.value) / 100;
      el.valBrightness.textContent = `${e.target.value}%`;
      requestRender();
    });

    el.sliderContrast.addEventListener('input', (e) => {
      state.contrast = parseFloat(e.target.value) / 100;
      el.valContrast.textContent = `${e.target.value}%`;
      requestRender();
    });

    el.sliderSaturation.addEventListener('input', (e) => {
      state.saturation = parseFloat(e.target.value) / 100;
      el.valSaturation.textContent = `${e.target.value}%`;
      requestRender();
    });

    el.btnResetAdjustments.addEventListener('click', (e) => {
      e.preventDefault();
      state.brightness = 0;
      state.contrast = 0;
      state.saturation = 0;
      el.sliderBrightness.value = 0;
      el.sliderContrast.value = 0;
      el.sliderSaturation.value = 0;
      el.valBrightness.textContent = '0%';
      el.valContrast.textContent = '0%';
      el.valSaturation.textContent = '0%';
      requestRender();
    });

    // View tabs
    [el.tabSplit, el.tabResult, el.tabMask, el.tabOriginal].forEach(tab => {
      tab.addEventListener('click', () => {
        [el.tabSplit, el.tabResult, el.tabMask, el.tabOriginal].forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.viewMode = tab.dataset.mode;
        requestRender();
      });
    });

    // Backdrop selector
    el.bgCards.forEach(card => {
      card.addEventListener('click', () => {
        const bg = card.dataset.bg;
        if (bg === 'custom-image') {
          el.bgImageFileInput.click();
          return;
        }

        el.bgCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        applyBackdrop(bg);
      });
    });

    // Custom background file input
    el.bgImageFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
          const bgImg = new Image();
          bgImg.onload = () => {
            state.customBgImage = bgImg;
            el.bgCards.forEach(c => c.classList.remove('active'));
            el.bgCardCustom.classList.add('active');
            el.bgCardCustom.style.background = `url('${evt.target.result}') center/cover`;
            applyBackdrop('custom-image');
          };
          bgImg.src = evt.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  /**
   * Apply Background to Canvas Artboard
   */
  function applyBackdrop(type) {
    state.bgType = type;
    const artboard = el.canvasArtboard;
    const layer = el.customBackdropLayer;

    // Clear class styles
    artboard.className = 'canvas-artboard';
    layer.style.background = 'none';

    switch (type) {
      case 'checker-dark':
        artboard.classList.add('transparency-grid-dark');
        break;
      case 'checker-light':
        artboard.classList.add('transparency-grid-light');
        break;
      case 'solid-black':
        artboard.style.backgroundColor = '#000000';
        break;
      case 'solid-white':
        artboard.style.backgroundColor = '#ffffff';
        break;
      case 'gradient-sunset':
        layer.style.background = 'linear-gradient(135deg, #ff7e5f, #feb47b)';
        break;
      case 'gradient-cyber':
        layer.style.background = 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)';
        break;
      case 'scenic-penthouse':
        layer.style.background = "url('samples/penthouse.jpg') center/cover";
        break;
      case 'custom-image':
        if (state.customBgImage) {
          layer.style.backgroundImage = `url(${state.customBgImage.src})`;
          layer.style.backgroundSize = 'cover';
          layer.style.backgroundPosition = 'center';
        }
        break;
    }
  }

  /**
   * Update View Mode Display (Split slider, mask, original, clean)
   */
  function updateViewModeDisplay() {
    if (state.viewMode === 'split') {
      el.splitSliderContainer.style.display = 'block';
      updateSplitSliderPosition();
    } else {
      el.splitSliderContainer.style.display = 'none';
    }
  }

  /**
   * Setup Viewport Pan & Zoom
   */
  function setupViewportNavigation() {
    const wrapper = el.canvasViewportWrapper;

    // Mouse wheel zoom
    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
      setZoom(state.zoom * zoomFactor);
    }, { passive: false });

    // Pan with left-click drag
    wrapper.addEventListener('mousedown', (e) => {
      // Don't pan if clicking split handle or eyedropper is active
      if (state.isEyedropperActive || e.target === el.splitHandle || el.splitHandle.contains(e.target)) {
        return;
      }

      state.isPanning = true;
      state.panStartX = e.clientX - state.panX;
      state.panStartY = e.clientY - state.panY;
      wrapper.classList.add('grabbing');
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isPanning) return;
      state.panX = e.clientX - state.panStartX;
      state.panY = e.clientY - state.panStartY;
      updateTransform();
    });

    window.addEventListener('mouseup', () => {
      state.isPanning = false;
      wrapper.classList.remove('grabbing');
    });

    // Zoom Buttons
    el.btnZoomIn.addEventListener('click', () => setZoom(state.zoom * 1.25));
    el.btnZoomOut.addEventListener('click', () => setZoom(state.zoom / 1.25));
    el.btnZoomFit.addEventListener('click', () => fitImageToScreen());
    el.btnResetView.addEventListener('click', () => {
      state.zoom = 1.0;
      state.panX = 0;
      state.panY = 0;
      updateTransform();
    });
  }

  function setZoom(val) {
    state.zoom = Math.max(0.1, Math.min(6.0, val));
    updateTransform();
  }

  function updateTransform() {
    el.canvasArtboard.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
    el.zoomLevelText.textContent = `${Math.round(state.zoom * 100)}%`;
  }

  function fitImageToScreen() {
    if (!state.imageWidth || !state.imageHeight) return;
    const stageWidth = el.canvasViewportWrapper.clientWidth - 40;
    const stageHeight = el.canvasViewportWrapper.clientHeight - 40;

    const scaleX = stageWidth / state.imageWidth;
    const scaleY = stageHeight / state.imageHeight;
    state.zoom = Math.min(scaleX, scaleY, 1.0);
    state.panX = 0;
    state.panY = 0;
    updateTransform();
  }

  /**
   * Setup Split Slider Divider
   */
  function setupSplitSlider() {
    const handle = el.splitHandle;

    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      state.isDraggingSplit = true;
    });

    window.addEventListener('mousemove', (e) => {
      if (!state.isDraggingSplit || !state.imageWidth) return;

      const rect = el.canvasArtboard.getBoundingClientRect();
      const relativeX = (e.clientX - rect.left) / rect.width;
      state.splitPos = Math.max(0.01, Math.min(0.99, relativeX));
      updateSplitSliderPosition();
    });

    window.addEventListener('mouseup', () => {
      state.isDraggingSplit = false;
    });

    updateSplitSliderPosition();
  }

  function updateSplitSliderPosition() {
    const pct = (state.splitPos * 100).toFixed(2);
    el.splitOriginalWrap.style.width = `${pct}%`;
    el.splitHandle.style.left = `${pct}%`;
  }

  /**
   * Eyedropper Tool & Magnifier Loupe
   */
  function setupEyedropper() {
    el.btnEyedropper.addEventListener('click', () => {
      toggleEyedropper();
    });

    const wrapper = el.canvasViewportWrapper;

    wrapper.addEventListener('mousemove', (e) => {
      if (!state.isEyedropperActive || !state.image) {
        el.eyedropperLoupe.style.display = 'none';
        return;
      }

      const rect = el.mainCanvas.getBoundingClientRect();
      // Calculate original image coordinates
      const imgX = (e.clientX - rect.left) * (state.imageWidth / rect.width);
      const imgY = (e.clientY - rect.top) * (state.imageHeight / rect.height);

      if (imgX < 0 || imgX >= state.imageWidth || imgY < 0 || imgY >= state.imageHeight) {
        el.eyedropperLoupe.style.display = 'none';
        return;
      }

      // Update Loupe position & render zoomed pixels
      el.eyedropperLoupe.style.display = 'block';
      el.eyedropperLoupe.style.left = `${e.clientX}px`;
      el.eyedropperLoupe.style.top = `${e.clientY}px`;

      renderLoupe(Math.floor(imgX), Math.floor(imgY));
    });

    wrapper.addEventListener('click', (e) => {
      if (!state.image) return;

      const rect = el.mainCanvas.getBoundingClientRect();
      const imgX = (e.clientX - rect.left) * (state.imageWidth / rect.width);
      const imgY = (e.clientY - rect.top) * (state.imageHeight / rect.height);

      if (imgX >= 0 && imgX < state.imageWidth && imgY >= 0 && imgY < state.imageHeight) {
        if (state.isEyedropperActive) {
          const sampled = state.engine.sampleColorAt(imgX, imgY);
          if (sampled) {
            setKeyColor(sampled.r, sampled.g, sampled.b);
            toggleEyedropper(false);
            showToast(`Sampled color: ${sampled.hex.toUpperCase()}`);
            requestRender();
          }
        } else if (state.isPunchToolActive) {
          state.customSeeds.push({ x: Math.round(imgX), y: Math.round(imgY) });
          if (el.valPocketsCount) el.valPocketsCount.textContent = `${state.customSeeds.length} punched`;
          if (el.btnClearPockets) el.btnClearPockets.style.display = 'inline-flex';
          showToast(`Punched enclosed hole at (${Math.round(imgX)}, ${Math.round(imgY)})`);
          requestRender();
        }
      }
    });

    // Escape cancels eyedropper and punch tool
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (state.isEyedropperActive) toggleEyedropper(false);
        if (state.isPunchToolActive) togglePunchTool(false);
      }
    });
  }

  function toggleEyedropper(force) {
    state.isEyedropperActive = typeof force === 'boolean' ? force : !state.isEyedropperActive;
    if (state.isEyedropperActive) {
      if (state.isPunchToolActive) togglePunchTool(false);
      el.btnEyedropper.classList.add('active');
      el.canvasViewportWrapper.classList.add('eyedropper-active');
      el.eyedropperBtnText.textContent = 'Click on Canvas';
    } else {
      el.btnEyedropper.classList.remove('active');
      el.canvasViewportWrapper.classList.remove('eyedropper-active');
      el.eyedropperLoupe.style.display = 'none';
      el.eyedropperBtnText.textContent = 'Pick from Image';
    }
  }

  function togglePunchTool(force) {
    state.isPunchToolActive = typeof force === 'boolean' ? force : !state.isPunchToolActive;
    if (state.isPunchToolActive) {
      if (state.isEyedropperActive) toggleEyedropper(false);
      el.btnPunchTool.classList.add('active');
      el.canvasViewportWrapper.classList.add('punch-active');
      el.punchBtnText.textContent = 'Click Hole to Punch';
      showToast('Click any enclosed background pocket inside the logo');
    } else {
      el.btnPunchTool.classList.remove('active');
      el.canvasViewportWrapper.classList.remove('punch-active');
      el.punchBtnText.textContent = 'Punch Enclosed Hole';
    }
  }

  function renderLoupe(cx, cy) {
    loupeCtx.imageSmoothingEnabled = false;
    loupeCtx.clearRect(0, 0, 100, 100);

    const zoomSize = 11; // 11x11 pixel window
    const half = Math.floor(zoomSize / 2);
    
    // Draw zoomed patch from originalCanvas
    loupeCtx.drawImage(
      el.originalCanvas,
      cx - half, cy - half, zoomSize, zoomSize,
      0, 0, 100, 100
    );

    const sampled = state.engine.sampleColorAt(cx, cy);
    if (sampled) {
      el.loupeSwatch.textContent = sampled.hex.toUpperCase();
      el.loupeSwatch.style.backgroundColor = sampled.hex;
      // High contrast text
      const luma = (0.299 * sampled.r + 0.587 * sampled.g + 0.114 * sampled.b);
      el.loupeSwatch.style.color = luma > 128 ? '#000000' : '#ffffff';
    }
  }

  /**
   * Setup Export Actions (PNG, Composite, Clipboard)
   */
  function setupExportHandlers() {
    // Export Transparent PNG
    const exportTransparent = () => {
      if (!state.image) return;
      // Full resolution export directly from mainCanvas
      el.mainCanvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${state.fileName}-transparent.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        showToast('Full-res Transparent PNG exported!');
      }, 'image/png');
    };

    el.btnDownloadTransparent.addEventListener('click', exportTransparent);
    el.btnDownloadTransparentBottom.addEventListener('click', exportTransparent);

    // Export Composite with Background
    el.btnDownloadComposite.addEventListener('click', () => {
      if (!state.image) return;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = state.imageWidth;
      exportCanvas.height = state.imageHeight;
      const ctx = exportCanvas.getContext('2d');

      // 1. Draw Background
      switch (state.bgType) {
        case 'solid-black':
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, state.imageWidth, state.imageHeight);
          break;
        case 'solid-white':
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, state.imageWidth, state.imageHeight);
          break;
        case 'gradient-sunset': {
          const grad = ctx.createLinearGradient(0, 0, state.imageWidth, state.imageHeight);
          grad.addColorStop(0, '#ff7e5f');
          grad.addColorStop(1, '#feb47b');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, state.imageWidth, state.imageHeight);
          break;
        }
        case 'gradient-cyber': {
          const grad = ctx.createLinearGradient(0, 0, state.imageWidth, state.imageHeight);
          grad.addColorStop(0, '#0f0c29');
          grad.addColorStop(0.5, '#302b63');
          grad.addColorStop(1, '#24243e');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, state.imageWidth, state.imageHeight);
          break;
        }
        case 'scenic-penthouse': {
          const pentImg = new Image();
          pentImg.onload = () => {
            drawCoverImage(ctx, pentImg, state.imageWidth, state.imageHeight);
            ctx.drawImage(el.mainCanvas, 0, 0);
            saveCanvasBlob(exportCanvas, `${state.fileName}-composite.jpg`, 'image/jpeg', 0.95);
          };
          pentImg.src = 'samples/penthouse.jpg';
          return;
        }
        case 'custom-image': {
          if (state.customBgImage) {
            drawCoverImage(ctx, state.customBgImage, state.imageWidth, state.imageHeight);
          }
          break;
        }
        default:
          // If transparent/checkerboard, default to transparent PNG export
          break;
      }

      // 2. Draw Keyed Subject on top
      ctx.drawImage(el.mainCanvas, 0, 0);

      saveCanvasBlob(exportCanvas, `${state.fileName}-composite.png`, 'image/png');
    });

    // Copy to Clipboard
    el.btnCopyClipboard.addEventListener('click', async () => {
      if (!state.image) return;
      try {
        el.mainCanvas.toBlob(async (blob) => {
          if (!blob) return;
          if (navigator.clipboard && window.ClipboardItem) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            showToast('Transparent PNG copied to clipboard!');
          } else {
            showToast('Clipboard API not supported in this browser.');
          }
        }, 'image/png');
      } catch (err) {
        console.error('Clipboard copy failed:', err);
        showToast('Clipboard copy failed.');
      }
    });
  }

  function drawCoverImage(ctx, img, targetW, targetH) {
    const imgRatio = img.width / img.height;
    const targetRatio = targetW / targetH;
    let renderW, renderH, offsetX, offsetY;

    if (imgRatio > targetRatio) {
      renderH = targetH;
      renderW = targetH * imgRatio;
      offsetX = (targetW - renderW) / 2;
      offsetY = 0;
    } else {
      renderW = targetW;
      renderH = targetW / imgRatio;
      offsetX = 0;
      offsetY = (targetH - renderH) / 2;
    }

    ctx.drawImage(img, offsetX, offsetY, renderW, renderH);
  }

  function saveCanvasBlob(canvas, filename, mimeType = 'image/png', quality = 0.92) {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = filename;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
      showToast(`Exported ${filename}!`);
    }, mimeType, quality);
  }

  /**
   * Toast Message Notification
   */
  let toastTimer = null;
  function showToast(message) {
    el.toastText.textContent = message;
    el.toastMsg.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toastMsg.classList.remove('show');
    }, 2800);
  }

  // Start app on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
