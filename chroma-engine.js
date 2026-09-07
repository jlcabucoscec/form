/**
 * ChromaCraft Chroma Key Processing Engine
 * High-performance, pixel-level green/blue screen removal
 */

class ChromaEngine {
  constructor() {
    this.cachedImageData = null;
    this.originalImageData = null;
    this.width = 0;
    this.height = 0;
  }

  /**
   * Set the source image data from an HTMLCanvasElement or ImageData
   */
  setImageData(imageData) {
    this.width = imageData.width;
    this.height = imageData.height;
    // Keep an immutable copy of the original raw pixels
    this.originalImageData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
  }

  /**
   * Helper: Parse hex color to RGB
   */
  static hexToRgb(hex) {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255
    };
  }

  /**
   * Helper: RGB to Hex
   */
  static rgbToHex(r, g, b) {
    const toHex = (c) => {
      const hex = Math.round(c).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  /**
   * Calculate perceptual Euclidean RGB distance between two colors
   */
  static calcColorDistance(r, g, b, kr, kg, kb) {
    const dr = (r - kr) / 255;
    const dg = (g - kg) / 255;
    const db = (b - kb) / 255;
    return Math.sqrt(0.299 * dr * dr + 0.587 * dg * dg + 0.114 * db * db);
  }

  /**
   * Auto-detect the dominant screen color by sampling edges & corners
   */
  autoDetectKeyColor(imageData, mode = 'studio') {
    if (mode === 'logo') {
      return this.autoDetectLogoColor(imageData);
    }

    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    
    // Sample points along perimeter (corners and edge points)
    const samplePoints = [
      { x: 5, y: 5 },
      { x: Math.floor(w / 2), y: 5 },
      { x: Math.max(0, w - 6), y: 5 },
      { x: 5, y: Math.floor(h / 2) },
      { x: Math.max(0, w - 6), y: Math.floor(h / 2) },
      { x: 5, y: Math.max(0, h - 6) },
      { x: Math.floor(w / 2), y: Math.max(0, h - 6) },
      { x: Math.max(0, w - 6), y: Math.max(0, h - 6) }
    ];

    let samples = [];
    for (const pt of samplePoints) {
      const idx = (pt.y * w + pt.x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      samples.push({ r, g, b });
    }

    // Sort samples by green dominance (g - max(r, b))
    samples.sort((a, b) => {
      const domA = a.g - Math.max(a.r, a.b);
      const domB = b.g - Math.max(b.r, b.b);
      return domB - domA;
    });

    // Pick top dominant point
    const best = samples[0];
    return { r: best.r, g: best.g, b: best.b };
  }

  /**
   * Auto-detect logo background by sampling corner patches and edges
   */
  autoDetectLogoColor(imageData) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    // Sample corner blocks (8x8 pixels in each corner)
    const patch = Math.max(2, Math.min(10, Math.floor(w / 8), Math.floor(h / 8)));
    let sumR = 0, sumG = 0, sumB = 0, count = 0;

    const corners = [
      { sx: 0, sy: 0 },
      { sx: Math.max(0, w - patch), sy: 0 },
      { sx: 0, sy: Math.max(0, h - patch) },
      { sx: Math.max(0, w - patch), sy: Math.max(0, h - patch) }
    ];

    for (const c of corners) {
      for (let y = c.sy; y < c.sy + patch; y++) {
        for (let x = c.sx; x < c.sx + patch; x++) {
          const idx = (y * w + x) * 4;
          // Only sample opaque pixels so transparent padding is ignored
          if (data[idx + 3] > 80) {
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            count++;
          }
        }
      }
    }

    if (count === 0) {
      return { r: 255, g: 255, b: 255 };
    }

    const avgR = Math.round(sumR / count);
    const avgG = Math.round(sumG / count);
    const avgB = Math.round(sumB / count);

    // If near white, snap to pure white (#FFFFFF)
    if (avgR >= 238 && avgG >= 238 && avgB >= 238) {
      return { r: 255, g: 255, b: 255 };
    }
    // If near black, snap to pure black (#000000)
    if (avgR <= 12 && avgG <= 12 && avgB <= 12) {
      return { r: 0, g: 0, b: 0 };
    }

    return { r: avgR, g: avgG, b: avgB };
  }

  /**
   * Smoothstep function for anti-aliased edge transitions
   */
  static smoothstep(edge0, edge1, x) {
    if (edge0 >= edge1) edge1 = edge0 + 0.0001;
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Main Chroma Key Process Method
   */
  process(options = {}) {
    if (!this.originalImageData) return null;

    if (options.engineMode === 'logo') {
      return this.processLogo(options);
    }

    const {
      keyColor = { r: 0, g: 255, b: 0 },
      tolerance = 0.38,
      smoothness = 0.15,
      despill = 0.70,
      despillMode = 'warm',
      preserveShadows = 0.0,
      edgeChoke = 0,
      brightness = 0.0,
      contrast = 0.0,
      saturation = 0.0,
      mode = 'result'
    } = options;

    const src = this.originalImageData.data;
    const w = this.width;
    const h = this.height;
    const totalPixels = w * h;

    const outImageData = new ImageData(w, h);
    const dst = outImageData.data;

    const kr = keyColor.r;
    const kg = keyColor.g;
    const kb = keyColor.b;
    const keySum = Math.max(1, kr + kg + kb);
    const normKr = kr / keySum;
    const normKg = kg / keySum;
    const normKb = kb / keySum;

    const isGreenKey = (kg >= kr && kg >= kb);
    const isBlueKey = (kb >= kr && kb >= kg);

    // Alpha mapping range
    const tolLow = Math.max(0.001, tolerance - smoothness * 0.5);
    const tolHigh = Math.min(1.5, tolerance + smoothness * 0.5 + 0.001);

    const alphaMap = new Float32Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = src[idx];
      const g = src[idx + 1];
      const b = src[idx + 2];
      const a = src[idx + 3];

      if (a === 0) {
        alphaMap[i] = 0;
        continue;
      }

      // 1. Normalized Chrominance Distance
      const sum = Math.max(1, r + g + b);
      const normR = r / sum;
      const normG = g / sum;
      const normB = b / sum;

      const dNormR = normR - normKr;
      const dNormG = normG - normKg;
      const dNormB = normB - normKb;
      const chrominanceDist = Math.sqrt(dNormR * dNormR * 2.0 + dNormG * dNormG * 4.0 + dNormB * dNormB * 2.0);

      // 2. Direct RGB Euclidean Distance
      const dr = (r - kr) / 255;
      const dg = (g - kg) / 255;
      const db = (b - kb) / 255;
      const rgbDist = Math.sqrt(dr * dr * 0.299 + dg * dg * 0.587 + db * db * 0.114);

      // 3. Dominance metric
      let dominance = 0;
      if (isGreenKey) {
        dominance = Math.max(0, (g - Math.max(r, b)) / 255);
      } else if (isBlueKey) {
        dominance = Math.max(0, (b - Math.max(r, g)) / 255);
      }

      // Distance metric: smaller means closer to green screen
      const combinedDist = chrominanceDist * 0.65 + rgbDist * 0.35 - dominance * 0.25;

      // Smoothstep mapping
      let alpha = ChromaEngine.smoothstep(tolLow, tolHigh, combinedDist);

      // Shadow preservation
      if (preserveShadows > 0 && alpha < 1.0) {
        const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const keyLuma = (0.299 * kr + 0.587 * kg + 0.114 * kb) / 255;
        if (luma < keyLuma * 0.85) {
          const shadowFactor = Math.max(0, (keyLuma - luma) / (keyLuma || 1));
          const shadowAlpha = shadowFactor * preserveShadows;
          alpha = Math.max(alpha, shadowAlpha * 0.7);
        }
      }

      alphaMap[i] = alpha;
    }

    // Edge Choke (Erosion/Dilation)
    let finalAlpha = alphaMap;
    if (edgeChoke !== 0) {
      finalAlpha = this.applyEdgeChoke(alphaMap, w, h, edgeChoke);
    }

    // Color grading precalculations
    const contrastFactor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
    const brightOffset = brightness * 128;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      let r = src[idx];
      let g = src[idx + 1];
      let b = src[idx + 2];
      const srcA = src[idx + 3];

      const currentAlpha = finalAlpha[i] * (srcA / 255);

      if (mode === 'original') {
        dst[idx] = r;
        dst[idx + 1] = g;
        dst[idx + 2] = b;
        dst[idx + 3] = srcA;
        continue;
      }

      if (mode === 'mask') {
        const maskVal = Math.round(currentAlpha * 255);
        dst[idx] = maskVal;
        dst[idx + 1] = maskVal;
        dst[idx + 2] = maskVal;
        dst[idx + 3] = 255;
        continue;
      }

      if (currentAlpha <= 0.001) {
        dst[idx] = 0;
        dst[idx + 1] = 0;
        dst[idx + 2] = 0;
        dst[idx + 3] = 0;
        continue;
      }

      // Spill Suppression (Despill)
      if (despill > 0) {
        if (isGreenKey) {
          let spillLimit;
          if (despillMode === 'warm') {
            spillLimit = (r * 0.7 + b * 0.3);
          } else if (despillMode === 'cool') {
            spillLimit = (r * 0.3 + b * 0.7);
          } else {
            spillLimit = (r + b) * 0.5;
          }

          if (g > spillLimit) {
            const excess = (g - spillLimit) * despill;
            g = Math.max(0, g - excess);

            if (despillMode === 'warm' && excess > 10) {
              r = Math.min(255, r + excess * 0.12);
            }
          }
        } else if (isBlueKey) {
          const spillLimit = (r + g) * 0.5;
          if (b > spillLimit) {
            const excess = (b - spillLimit) * despill;
            b = Math.max(0, b - excess);
          }
        }
      }

      // Color adjustments
      if (brightness !== 0.0 || contrast !== 0.0 || saturation !== 0.0) {
        r = contrastFactor * (r + brightOffset - 128) + 128;
        g = contrastFactor * (g + brightOffset - 128) + 128;
        b = contrastFactor * (b + brightOffset - 128) + 128;

        if (saturation !== 0.0) {
          const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
          const satMult = 1.0 + saturation;
          r = gray + (r - gray) * satMult;
          g = gray + (g - gray) * satMult;
          b = gray + (b - gray) * satMult;
        }

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
      }

      dst[idx] = Math.round(r);
      dst[idx + 1] = Math.round(g);
      dst[idx + 2] = Math.round(b);
      dst[idx + 3] = Math.round(currentAlpha * 255);
    }

    return outImageData;
  }

  /**
   * Apply edge choke (erosion/dilation) on alpha matte
   */
  applyEdgeChoke(alphaMap, w, h, chokeAmount) {
    const output = new Float32Array(alphaMap.length);
    const radius = Math.min(3, Math.abs(chokeAmount));
    const isErode = chokeAmount < 0;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const centerIdx = y * w + x;
        const centerAlpha = alphaMap[centerIdx];

        if (centerAlpha === 0 || centerAlpha === 1) {
          let isBoundary = false;
          if (x > 0 && alphaMap[centerIdx - 1] !== centerAlpha) isBoundary = true;
          else if (x < w - 1 && alphaMap[centerIdx + 1] !== centerAlpha) isBoundary = true;
          else if (y > 0 && alphaMap[centerIdx - w] !== centerAlpha) isBoundary = true;
          else if (y < h - 1 && alphaMap[centerIdx + w] !== centerAlpha) isBoundary = true;

          if (!isBoundary) {
            output[centerIdx] = centerAlpha;
            continue;
          }
        }

        let extreme = centerAlpha;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const neighborAlpha = alphaMap[ny * w + nx];
            if (isErode) {
              if (neighborAlpha < extreme) extreme = neighborAlpha;
            } else {
              if (neighborAlpha > extreme) extreme = neighborAlpha;
            }
          }
        }

        output[centerIdx] = extreme;
      }
    }

    return output;
  }

  /**
   * Specialized Logo & Graphic background removal process
   * Supports contiguous exterior flood-fill, content protection, defringing, and custom seeds
   */
  processLogo(options = {}) {
    if (!this.originalImageData) return null;

    const {
      keyColor = { r: 255, g: 255, b: 255 },
      tolerance = 0.22,
      smoothness = 0.10,
      defringe = 0.80,
      edgeChoke = 0,
      contiguous = true,
      customSeeds = [],
      brightness = 0.0,
      contrast = 0.0,
      saturation = 0.0,
      mode = 'result'
    } = options;

    const src = this.originalImageData.data;
    const w = this.width;
    const h = this.height;
    const totalPixels = w * h;

    const outImageData = new ImageData(w, h);
    const dst = outImageData.data;

    const kr = keyColor.r;
    const kg = keyColor.g;
    const kb = keyColor.b;

    // Tolerance thresholds: tolLow is 100% transparent background, tolHigh is boundary cutoff
    const tolLow = Math.max(0.001, tolerance - smoothness * 0.5);
    const tolHigh = Math.max(tolLow + 0.001, tolerance + smoothness * 0.5);

    const alphaMap = new Float32Array(totalPixels);

    if (contiguous) {
      // Initialize with 1.0: all interior content is 100% protected by default!
      alphaMap.fill(1.0);

      const queue = new Int32Array(totalPixels);
      let head = 0;
      let tail = 0;
      const visited = new Uint8Array(totalPixels);

      // Helper: check if a pixel is background (either transparent or matching keyColor)
      const isBg = (idx) => {
        if (src[idx * 4 + 3] <= 20) return true; // already transparent
        return ChromaEngine.calcColorDistance(src[idx * 4], src[idx * 4 + 1], src[idx * 4 + 2], kr, kg, kb) <= tolHigh;
      };

      // Seed points: all 4 outer borders of the image
      // Top and bottom borders
      for (let x = 0; x < w; x++) {
        const topIdx = x;
        if (isBg(topIdx)) {
          visited[topIdx] = 1;
          queue[tail++] = topIdx;
        }

        const btmIdx = (h - 1) * w + x;
        if (isBg(btmIdx)) {
          visited[btmIdx] = 1;
          queue[tail++] = btmIdx;
        }
      }

      // Left and right borders
      for (let y = 0; y < h; y++) {
        const leftIdx = y * w;
        if (visited[leftIdx] === 0 && isBg(leftIdx)) {
          visited[leftIdx] = 1;
          queue[tail++] = leftIdx;
        }

        const rightIdx = y * w + (w - 1);
        if (visited[rightIdx] === 0 && isBg(rightIdx)) {
          visited[rightIdx] = 1;
          queue[tail++] = rightIdx;
        }
      }

      // Add custom seeds (e.g. user clicked to punch an enclosed hole)
      if (customSeeds && customSeeds.length > 0) {
        for (const seed of customSeeds) {
          const sx = Math.floor(Math.max(0, Math.min(w - 1, seed.x)));
          const sy = Math.floor(Math.max(0, Math.min(h - 1, seed.y)));
          const sIdx = sy * w + sx;
          if (visited[sIdx] === 0) {
            visited[sIdx] = 1;
            queue[tail++] = sIdx;
          }
        }
      }

      // BFS flood fill
      while (head < tail) {
        const curr = queue[head++];
        const cx = curr % w;
        const cy = (curr / w) | 0;

        const pIdx = curr * 4;
        const srcA = src[pIdx + 3];
        const r = src[pIdx];
        const g = src[pIdx + 1];
        const b = src[pIdx + 2];
        const dist = ChromaEngine.calcColorDistance(r, g, b, kr, kg, kb);

        // Alpha calculation with smooth anti-aliased transition
        let a = 0.0;
        if (srcA <= 20) {
          a = 0.0;
        } else if (dist > tolLow) {
          a = ChromaEngine.smoothstep(tolLow, tolHigh, dist);
        }
        alphaMap[curr] = a;

        // If distance is at or exceeds tolHigh and pixel is opaque, this pixel marks the outer edge of the logo
        if (srcA > 20 && dist >= tolHigh) {
          continue;
        }

        // Propagate to 4 neighbors
        // Up
        if (cy > 0) {
          const nIdx = curr - w;
          if (visited[nIdx] === 0) {
            const nr = src[nIdx * 4], ng = src[nIdx * 4 + 1], nb = src[nIdx * 4 + 2], na = src[nIdx * 4 + 3];
            const nd = ChromaEngine.calcColorDistance(nr, ng, nb, kr, kg, kb);
            if (na <= 20 || nd <= tolHigh) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            } else if (nd < tolHigh + smoothness * 0.25) {
              alphaMap[nIdx] = Math.min(alphaMap[nIdx], ChromaEngine.smoothstep(tolLow, tolHigh + smoothness * 0.25, nd));
            }
          }
        }
        // Down
        if (cy < h - 1) {
          const nIdx = curr + w;
          if (visited[nIdx] === 0) {
            const nr = src[nIdx * 4], ng = src[nIdx * 4 + 1], nb = src[nIdx * 4 + 2], na = src[nIdx * 4 + 3];
            const nd = ChromaEngine.calcColorDistance(nr, ng, nb, kr, kg, kb);
            if (na <= 20 || nd <= tolHigh) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            } else if (nd < tolHigh + smoothness * 0.25) {
              alphaMap[nIdx] = Math.min(alphaMap[nIdx], ChromaEngine.smoothstep(tolLow, tolHigh + smoothness * 0.25, nd));
            }
          }
        }
        // Left
        if (cx > 0) {
          const nIdx = curr - 1;
          if (visited[nIdx] === 0) {
            const nr = src[nIdx * 4], ng = src[nIdx * 4 + 1], nb = src[nIdx * 4 + 2], na = src[nIdx * 4 + 3];
            const nd = ChromaEngine.calcColorDistance(nr, ng, nb, kr, kg, kb);
            if (na <= 20 || nd <= tolHigh) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            } else if (nd < tolHigh + smoothness * 0.25) {
              alphaMap[nIdx] = Math.min(alphaMap[nIdx], ChromaEngine.smoothstep(tolLow, tolHigh + smoothness * 0.25, nd));
            }
          }
        }
        // Right
        if (cx < w - 1) {
          const nIdx = curr + 1;
          if (visited[nIdx] === 0) {
            const nr = src[nIdx * 4], ng = src[nIdx * 4 + 1], nb = src[nIdx * 4 + 2], na = src[nIdx * 4 + 3];
            const nd = ChromaEngine.calcColorDistance(nr, ng, nb, kr, kg, kb);
            if (na <= 20 || nd <= tolHigh) {
              visited[nIdx] = 1;
              queue[tail++] = nIdx;
            } else if (nd < tolHigh + smoothness * 0.25) {
              alphaMap[nIdx] = Math.min(alphaMap[nIdx], ChromaEngine.smoothstep(tolLow, tolHigh + smoothness * 0.25, nd));
            }
          }
        }
      }
    } else {
      // Non-contiguous (Global color replace across entire frame)
      for (let i = 0; i < totalPixels; i++) {
        const idx = i * 4;
        const r = src[idx], g = src[idx + 1], b = src[idx + 2];
        const dist = ChromaEngine.calcColorDistance(r, g, b, kr, kg, kb);
        if (dist <= tolLow) {
          alphaMap[i] = 0.0;
        } else if (dist < tolHigh) {
          alphaMap[i] = ChromaEngine.smoothstep(tolLow, tolHigh, dist);
        } else {
          alphaMap[i] = 1.0;
        }
      }
    }

    // Edge Choke (Erosion/Dilation)
    let finalAlpha = alphaMap;
    if (edgeChoke !== 0) {
      finalAlpha = this.applyEdgeChoke(alphaMap, w, h, edgeChoke);
    }

    // Color grading precalculations
    const contrastFactor = (259 * (contrast * 128 + 255)) / (255 * (259 - contrast * 128));
    const brightOffset = brightness * 128;

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      let r = src[idx];
      let g = src[idx + 1];
      let b = src[idx + 2];
      const srcA = src[idx + 3];

      const currentAlpha = finalAlpha[i] * (srcA / 255);

      if (mode === 'original') {
        dst[idx] = r;
        dst[idx + 1] = g;
        dst[idx + 2] = b;
        dst[idx + 3] = srcA;
        continue;
      }

      if (mode === 'mask') {
        const maskVal = Math.round(currentAlpha * 255);
        dst[idx] = maskVal;
        dst[idx + 1] = maskVal;
        dst[idx + 2] = maskVal;
        dst[idx + 3] = 255;
        continue;
      }

      if (currentAlpha <= 0.001) {
        dst[idx] = 0;
        dst[idx + 1] = 0;
        dst[idx + 2] = 0;
        dst[idx + 3] = 0;
        continue;
      }

      // Edge Defringing / Decontamination
      // Strip background color bleed from anti-aliased edge pixels
      if (defringe > 0 && currentAlpha < 0.99) {
        const invA = 1.0 - currentAlpha;
        const safeA = Math.max(0.02, currentAlpha);
        let unmultipliedR = (r - invA * kr) / safeA;
        let unmultipliedG = (g - invA * kg) / safeA;
        let unmultipliedB = (b - invA * kb) / safeA;

        unmultipliedR = Math.max(0, Math.min(255, unmultipliedR));
        unmultipliedG = Math.max(0, Math.min(255, unmultipliedG));
        unmultipliedB = Math.max(0, Math.min(255, unmultipliedB));

        r = r * (1.0 - defringe) + unmultipliedR * defringe;
        g = g * (1.0 - defringe) + unmultipliedG * defringe;
        b = b * (1.0 - defringe) + unmultipliedB * defringe;
      }

      // Color adjustments
      if (brightness !== 0.0 || contrast !== 0.0 || saturation !== 0.0) {
        r = contrastFactor * (r + brightOffset - 128) + 128;
        g = contrastFactor * (g + brightOffset - 128) + 128;
        b = contrastFactor * (b + brightOffset - 128) + 128;

        if (saturation !== 0.0) {
          const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
          const satMult = 1.0 + saturation;
          r = gray + (r - gray) * satMult;
          g = gray + (g - gray) * satMult;
          b = gray + (b - gray) * satMult;
        }

        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
      }

      dst[idx] = Math.round(r);
      dst[idx + 1] = Math.round(g);
      dst[idx + 2] = Math.round(b);
      dst[idx + 3] = Math.round(currentAlpha * 255);
    }

    return outImageData;
  }

  /**
   * Sample pixel color at original coordinate
   */
  sampleColorAt(x, y) {
    if (!this.originalImageData) return null;
    const px = Math.floor(Math.max(0, Math.min(this.width - 1, x)));
    const py = Math.floor(Math.max(0, Math.min(this.height - 1, y)));
    const idx = (py * this.width + px) * 4;
    const src = this.originalImageData.data;

    return {
      r: src[idx],
      g: src[idx + 1],
      b: src[idx + 2],
      hex: ChromaEngine.rgbToHex(src[idx], src[idx + 1], src[idx + 2])
    };
  }
}

// Attach to window
window.ChromaEngine = ChromaEngine;
