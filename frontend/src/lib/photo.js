// Photo editing for recipe photos, all in the browser: straighten and crop around the dish,
// automatic enhancement, and a few Pickle & Pan filters.

export const CROPS = [
  { id: "3:2", label: "3:2", hint: "Best fit everywhere", ratio: 3 / 2 },
  { id: "16:9", label: "16:9", hint: "Recipe page", ratio: 16 / 9 },
  { id: "4:3", label: "4:3", hint: "Recipe cards", ratio: 4 / 3 },
  { id: "original", label: "Original", hint: "No crop", ratio: null },
];

// Each filter adjusts exposure, contrast, saturation and warmth (and optionally a soft vignette)
export const FILTERS = [
  { id: "none", label: "None", exposure: 0, contrast: 0, saturation: 0, warmth: 0, fade: 0, vignette: 0 },
  { id: "warm", label: "Warm kitchen", exposure: 0.03, contrast: 0.06, saturation: 0.1, warmth: 0.09, fade: 0, vignette: 0.12 },
  { id: "airy", label: "Bright & airy", exposure: 0.1, contrast: -0.06, saturation: -0.04, warmth: 0.02, fade: 0.05, vignette: 0 },
  { id: "rich", label: "Rich", exposure: -0.02, contrast: 0.16, saturation: 0.2, warmth: 0.04, fade: 0, vignette: 0.22 },
  { id: "rustic", label: "Rustic", exposure: 0, contrast: 0.08, saturation: -0.12, warmth: 0.12, fade: 0.06, vignette: 0.18 },
];

export const DEFAULT_SETTINGS = {
  crop: "3:2",
  quarterTurns: 0,
  straighten: 0, // degrees
  zoom: 1,
  focusX: 0.5,
  focusY: 0.5,
  enhance: 0.6, // 0-1
  filter: "warm",
  strength: 0.7, // filter strength 0-1
};

export function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    image.src = url;
  });
}

// A copy of the photo turned by a number of quarter turns, at most `maxSide` pixels
export function prepareSource(image, quarterTurns, maxSide) {
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  const turns = ((quarterTurns % 4) + 4) % 4;
  const canvas = document.createElement("canvas");
  canvas.width = turns % 2 ? h : w;
  canvas.height = turns % 2 ? w : h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // transparent PNGs shouldn't turn black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((turns * Math.PI) / 2);
  ctx.drawImage(image, -w / 2, -h / 2, w, h);
  return canvas;
}

// Where the dish probably is: the centre of the busiest, most colourful part of the photo
export function findFocus(source) {
  const size = 96;
  const scale = size / Math.max(source.width, source.height);
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const lum = new Float32Array(w * h);
  const sat = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    const max = Math.max(r, g, b);
    sat[i] = max ? (max - Math.min(r, g, b)) / max : 0;
  }
  let total = 0, sx = 0, sy = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const edge = Math.abs(lum[i + 1] - lum[i - 1]) + Math.abs(lum[i + w] - lum[i - w]);
      const weight = edge * (0.4 + sat[i]);
      total += weight;
      sx += weight * x;
      sy += weight * y;
    }
  }
  if (!total) return { x: 0.5, y: 0.5 };
  // Pull a little towards the middle, so a busy corner doesn't take over
  return { x: 0.5 + (sx / total / w - 0.5) * 0.8, y: 0.5 + (sy / total / h - 0.5) * 0.8 };
}

// Turns the dish's position (0-1 in the photo) into crop focus (0-1 of the movable range)
export function focusForCrop(source, settings, point) {
  const { w, h, scale, cropW, cropH } = geometry(source, { ...settings, focusX: 0.5, focusY: 0.5 });
  const slackX = w * scale - cropW;
  const slackY = h * scale - cropH;
  const clamp = (v) => Math.min(1, Math.max(0, v));
  return {
    focusX: slackX > 1 ? clamp((point.x * w * scale - cropW / 2) / slackX) : 0.5,
    focusY: slackY > 1 ? clamp((point.y * h * scale - cropH / 2) / slackY) : 0.5,
  };
}

function cropRatio(source, crop) {
  return CROPS.find((c) => c.id === crop)?.ratio || source.width / source.height;
}

// Size of the result and how the source is scaled so a straightened photo has no empty corners
function geometry(source, settings, maxSide = Infinity) {
  const ratio = cropRatio(source, settings.crop);
  const w = source.width;
  const h = source.height;
  // The biggest crop of this shape that fits the (unrotated) photo
  let cropW = Math.min(w, h * ratio);
  let cropH = cropW / ratio;
  const outScale = Math.min(1, maxSide / Math.max(cropW, cropH));
  const angle = (settings.straighten * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  // Bounding box of the crop when turned back by the straighten angle
  const boxW = cropW * cos + cropH * sin;
  const boxH = cropW * sin + cropH * cos;
  const scale = Math.max(boxW / w, boxH / h) * settings.zoom;
  return { w, h, ratio, cropW: boxW, cropH: boxH, scale, angle, outW: Math.round(cropW * outScale), outH: Math.round(cropH * outScale), outScale, rawW: cropW, rawH: cropH };
}

function drawGeometry(ctx, source, settings, g) {
  const { w, h, scale, angle, outW, outH, outScale, cropW, cropH } = g;
  ctx.save();
  ctx.translate(outW / 2, outH / 2);
  ctx.scale(outScale, outScale);
  ctx.rotate(angle);
  // Move within the room left over after cropping, following the focus point
  const dx = (0.5 - settings.focusX) * (w * scale - cropW);
  const dy = (0.5 - settings.focusY) * (h * scale - cropH);
  ctx.drawImage(source, -(w * scale) / 2 + dx, -(h * scale) / 2 + dy, w * scale, h * scale);
  ctx.restore();
}

// Light levels of the photo, for automatic enhancement
function analyse(data) {
  const histogram = new Uint32Array(256);
  let count = 0;
  let sumR = 0, sumG = 0, sumB = 0;
  // Every 4th pixel is plenty
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    histogram[Math.round(0.299 * r + 0.587 * g + 0.114 * b)]++;
    sumR += r; sumG += g; sumB += b;
    count++;
  }
  const percentile = (p) => {
    let seen = 0;
    for (let v = 0; v < 256; v++) {
      seen += histogram[v];
      if (seen >= count * p) return v;
    }
    return 255;
  };
  const avg = (sumR + sumG + sumB) / 3 / count;
  return {
    low: percentile(0.005),
    high: percentile(0.995),
    median: percentile(0.5),
    // Gentle grey-world colour balance, to take the edge off yellow kitchen lights
    balance: [avg / (sumR / count || 1), avg / (sumG / count || 1), avg / (sumB / count || 1)],
  };
}

function clamp255(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

// Enhancement and filter in one pass over the pixels
function adjustPixels(imageData, settings) {
  const { data, width, height } = imageData;
  const filter = FILTERS.find((f) => f.id === settings.filter) || FILTERS[0];
  const k = settings.strength;
  const e = settings.enhance;
  const stats = analyse(data);

  // Levels: stretch dark and light ends (blended by the enhance amount)
  const low = stats.low * e * 0.8;
  const high = 255 - (255 - stats.high) * e * 0.8;
  const range = Math.max(1, high - low);
  // Midtones towards a pleasant brightness
  const mid = Math.min(0.85, Math.max(0.15, (stats.median - low) / range));
  const gamma = 1 + (Math.log(0.52) / Math.log(mid) - 1) * e * 0.6;
  const balance = stats.balance.map((b) => 1 + (Math.min(1.15, Math.max(0.87, b)) - 1) * e * 0.5);

  const exposure = 1 + filter.exposure * k;
  const contrast = 1 + filter.contrast * k + 0.05 * e;
  const saturation = 1 + filter.saturation * k + 0.12 * e;
  const warmth = filter.warmth * k;
  const fade = filter.fade * k * 255;
  const vignette = filter.vignette * k;

  const lut = new Float32Array(256);
  for (let v = 0; v < 256; v++) {
    let x = Math.min(1, Math.max(0, (v - low) / range));
    x = Math.pow(x, gamma) * exposure;
    x = (x - 0.5) * contrast + 0.5;
    lut[v] = x * 255;
  }

  const cx = width / 2, cy = height / 2;
  const maxDist = Math.hypot(cx, cy);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let r = lut[clamp255(Math.round(data[i] * balance[0]))];
      let g = lut[clamp255(Math.round(data[i + 1] * balance[1]))];
      let b = lut[clamp255(Math.round(data[i + 2] * balance[2]))];
      const grey = 0.299 * r + 0.587 * g + 0.114 * b;
      r = grey + (r - grey) * saturation;
      g = grey + (g - grey) * saturation;
      b = grey + (b - grey) * saturation;
      r += warmth * 40;
      g += warmth * 12;
      b -= warmth * 34;
      if (fade) {
        r = fade + r * (1 - fade / 255);
        g = fade + g * (1 - fade / 255);
        b = fade + b * (1 - fade / 255);
      }
      if (vignette) {
        const d = Math.hypot(x - cx, y - cy) / maxDist;
        const v = 1 - vignette * Math.max(0, d - 0.45) * 1.6;
        r *= v; g *= v; b *= v;
      }
      data[i] = clamp255(r);
      data[i + 1] = clamp255(g);
      data[i + 2] = clamp255(b);
    }
  }
}

// Light sharpening (unsharp mask with a 3x3 blur)
function sharpen(imageData, amount) {
  if (amount <= 0) return;
  const { data, width, height } = imageData;
  const copy = new Uint8ClampedArray(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const j = i + c;
        const blur =
          (copy[j - 4] + copy[j + 4] + copy[j - width * 4] + copy[j + width * 4] + copy[j] * 4) / 8;
        data[j] = copy[j] + (copy[j] - blur) * amount;
      }
    }
  }
}

// Draws the edited photo on a new canvas, at most `maxSide` pixels on its long side
export function renderPhoto(source, settings, maxSide) {
  const g = geometry(source, settings, maxSide);
  const canvas = document.createElement("canvas");
  canvas.width = g.outW;
  canvas.height = g.outH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  drawGeometry(ctx, source, settings, g);
  if (settings.enhance > 0 || settings.filter !== "none") {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    adjustPixels(imageData, settings);
    // Sharpen less on small previews, where it would look harsher than on the real photo
    sharpen(imageData, settings.enhance * (canvas.width > 1200 ? 0.5 : 0.3));
    ctx.putImageData(imageData, 0, 0);
  }
  return canvas;
}

// How far one preview pixel moves the focus, for dragging the photo around
export function dragScale(source, settings, previewWidth) {
  const g = geometry(source, settings);
  const pixelsPerPreview = g.rawW / previewWidth;
  return {
    x: g.w * g.scale - g.cropW > 1 ? pixelsPerPreview / (g.w * g.scale - g.cropW) : 0,
    y: g.h * g.scale - g.cropH > 1 ? pixelsPerPreview / (g.h * g.scale - g.cropH) : 0,
  };
}

// Saves the canvas as WebP (JPEG where WebP isn't supported)
export async function canvasToFile(canvas, name) {
  const toBlob = (type) => new Promise((resolve) => canvas.toBlob(resolve, type, 0.85));
  let blob = await toBlob("image/webp");
  let extension = ".webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob("image/jpeg");
    extension = ".jpg";
  }
  return new File([blob], name.replace(/\.[^.]+$/, "") + extension, { type: blob.type, lastModified: Date.now() });
}
