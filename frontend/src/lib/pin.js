// Draws Pinterest pins (1000x1500, the 2:3 shape Pinterest shows best) in the Pickle & Pan style.
import { cuisineLabel, formatMinutes } from "./recipes";

export const PIN_WIDTH = 1000;
export const PIN_HEIGHT = 1500;

const BERRY = "#4f1d3a";
const CREAM = "#f4ead8";
const PAPER = "#faf8f3";
const INK = "#2a2420";
const MUTED = "#7a6f66";
const SERIF = '"Fraunces Variable", Georgia, serif';
const SANS = '"Geist Variable", system-ui, sans-serif';

export const PIN_STYLES = [
  { id: "classic", name: "Classic", hint: "Photo on top, berry panel with the title" },
  { id: "card", name: "Card", hint: "Full photo with a cream card" },
  { id: "banner", name: "Banner", hint: "Big title above a framed photo" },
];

// Same mark as components/Logo.jsx, as an image the canvas can draw
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<circle cx="32" cy="32" r="32" fill="${BERRY}"/>
<line x1="38" y1="39" x2="51" y2="52" stroke="${CREAM}" stroke-width="6" stroke-linecap="round"/>
<circle cx="27" cy="28" r="16" fill="${CREAM}"/><circle cx="27" cy="28" r="12" fill="#e4d3b4"/>
<g transform="rotate(-35 27 28)"><rect x="17" y="23" width="20" height="10" rx="5" fill="#6b9a3c"/>
<circle cx="22" cy="26" r="1" fill="#4c7428"/><circle cx="27" cy="30" r="1" fill="#4c7428"/><circle cx="31" cy="26" r="1" fill="#4c7428"/></g>
</svg>`;

function loadImage(src, crossOrigin) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Couldn't load ${src}`));
    image.src = src;
  });
}

// The photo, logo and fonts a pin needs. The photo is loaded with CORS so the canvas can be saved.
export async function loadPinAssets(photoUrl) {
  const [photo, logo] = await Promise.all([
    // A separate address from the normal image, so a cached copy without CORS headers isn't reused
    photoUrl ? loadImage(`${photoUrl}${photoUrl.includes("?") ? "&" : "?"}pin=1`, true) : null,
    loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(LOGO_SVG)}`),
    document.fonts.load(`600 80px ${SERIF}`),
    document.fonts.load(`500 30px ${SANS}`),
    document.fonts.load(`600 30px ${SANS}`),
  ]);
  return { photo, logo };
}

// Default texts for a recipe
export function pinDefaults(post) {
  const r = post.recipe || {};
  const total = (Number(r.prepTime) || 0) + (Number(r.cookTime) || 0);
  const servings = String(r.servings || "").trim();
  const details = [
    formatMinutes(total),
    servings && (/^\d+$/.test(servings) ? `Serves ${servings}` : servings),
    r.difficulty && `${r.difficulty[0].toUpperCase()}${r.difficulty.slice(1)}`,
  ].filter(Boolean);
  const cuisine = post.cuisines?.[0];
  return {
    headline: post.title || "",
    tagline: cuisine ? `${cuisineLabel(cuisine)} recipe` : "Homemade recipe",
    details: details.join("  ·  "),
  };
}

function setSpacing(ctx, value) {
  if ("letterSpacing" in ctx) ctx.letterSpacing = value;
}

function wrapLines(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Picks the biggest font size (from `max` down to `min`) where the text fits in `maxLines`
function fitText(ctx, text, { maxWidth, maxLines, max, min, weight = 600, family = SERIF }) {
  for (let size = max; size >= min; size -= 2) {
    const font = `${weight} ${size}px ${family}`;
    ctx.font = font;
    const lines = wrapLines(ctx, text, maxWidth);
    if (lines.length <= maxLines) return { font, size, lines, lineHeight: size * 1.08 };
  }
  const font = `${weight} ${min}px ${family}`;
  ctx.font = font;
  const lines = wrapLines(ctx, text, maxWidth);
  const kept = lines.slice(0, maxLines);
  if (lines.length > maxLines) kept[maxLines - 1] = `${kept[maxLines - 1].replace(/\s*\S+$/, "")}…`;
  return { font, size: min, lines: kept, lineHeight: min * 1.08 };
}

function drawLines(ctx, fitted, centerX, top) {
  ctx.font = fitted.font;
  fitted.lines.forEach((line, i) => {
    ctx.fillText(line, centerX, top + fitted.size * 0.85 + i * fitted.lineHeight);
  });
  return top + fitted.lines.length * fitted.lineHeight;
}

// Draws the photo so it fills the box; focusX/focusY (0-1) choose which part stays visible
function drawPhoto(ctx, photo, box, { focusX, focusY, zoom }, radius = 0) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(box.x, box.y, box.w, box.h, radius);
  ctx.clip();
  if (photo) {
    const scale = Math.max(box.w / photo.width, box.h / photo.height) * zoom;
    const w = photo.width * scale;
    const h = photo.height * scale;
    ctx.drawImage(photo, box.x + (box.w - w) * focusX, box.y + (box.h - h) * focusY, w, h);
  } else {
    ctx.fillStyle = "#e4d3b4";
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  ctx.restore();
}

function drawTagline(ctx, text, centerX, y, color) {
  ctx.font = `600 26px ${SANS}`;
  setSpacing(ctx, "4px");
  ctx.fillStyle = color;
  ctx.fillText(text.toUpperCase(), centerX, y);
  setSpacing(ctx, "0px");
}

// Logo + "pickleandpan.com", centred on centerX
function drawBrand(ctx, logo, centerX, y, color, size = 56) {
  ctx.font = `600 30px ${SANS}`;
  const label = "pickleandpan.com";
  const gap = 16;
  const width = size + gap + ctx.measureText(label).width;
  const left = centerX - width / 2;
  // On the berry background the (berry) logo gets a cream ring so it doesn't disappear
  if (color === CREAM) {
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.arc(left + size / 2, y, size / 2 + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.drawImage(logo, left, y - size / 2, size, size);
  ctx.textAlign = "left";
  ctx.fillStyle = color;
  ctx.fillText(label, left + size + gap, y + 10);
  ctx.textAlign = "center";
}

function drawClassic(ctx, assets, text, photoOptions) {
  const W = PIN_WIDTH;
  const H = PIN_HEIGHT;
  const title = fitText(ctx, text.headline, { maxWidth: 840, maxLines: 3, max: 96, min: 58 });
  const titleHeight = title.lines.length * title.lineHeight;
  // The panel grows with the title, the photo takes the rest
  const panelHeight = 150 + titleHeight + (text.details ? 70 : 0) + 140;
  const panelTop = H - panelHeight;

  ctx.fillStyle = BERRY;
  ctx.fillRect(0, 0, W, H);
  drawPhoto(ctx, assets.photo, { x: 0, y: 0, w: W, h: panelTop }, photoOptions);

  // Tagline pill sitting on the edge between photo and panel
  if (text.tagline) {
    ctx.font = `600 26px ${SANS}`;
    setSpacing(ctx, "4px");
    const pillWidth = ctx.measureText(text.tagline.toUpperCase()).width + 72;
    setSpacing(ctx, "0px");
    ctx.fillStyle = CREAM;
    ctx.beginPath();
    ctx.roundRect(W / 2 - pillWidth / 2, panelTop - 34, pillWidth, 68, 34);
    ctx.fill();
    drawTagline(ctx, text.tagline, W / 2, panelTop + 10, BERRY);
  }

  ctx.fillStyle = CREAM;
  let y = drawLines(ctx, title, W / 2, panelTop + 80);
  if (text.details) {
    ctx.font = `500 32px ${SANS}`;
    ctx.fillStyle = "rgba(244, 234, 216, 0.75)";
    ctx.fillText(text.details, W / 2, y + 56);
  }
  drawBrand(ctx, assets.logo, W / 2, H - 80, CREAM);
}

function drawCard(ctx, assets, text, photoOptions) {
  const W = PIN_WIDTH;
  const H = PIN_HEIGHT;
  drawPhoto(ctx, assets.photo, { x: 0, y: 0, w: W, h: H }, photoOptions);

  const title = fitText(ctx, text.headline, { maxWidth: 740, maxLines: 3, max: 84, min: 54 });
  const cardHeight = 70 + (text.tagline ? 60 : 0) + title.lines.length * title.lineHeight + (text.details ? 64 : 0) + 150;
  const cardTop = H - 70 - cardHeight;

  // Soft shadow so the card lifts off busy photos
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = PAPER;
  ctx.beginPath();
  ctx.roundRect(60, cardTop, W - 120, cardHeight, 36);
  ctx.fill();
  ctx.restore();

  let y = cardTop + 70;
  if (text.tagline) {
    drawTagline(ctx, text.tagline, W / 2, y + 20, BERRY);
    y += 60;
  }
  ctx.fillStyle = INK;
  y = drawLines(ctx, title, W / 2, y);
  if (text.details) {
    ctx.font = `500 30px ${SANS}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(text.details, W / 2, y + 50);
    y += 64;
  }
  ctx.strokeStyle = "rgba(79, 29, 58, 0.15)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(220, y + 40);
  ctx.lineTo(W - 220, y + 40);
  ctx.stroke();
  drawBrand(ctx, assets.logo, W / 2, y + 100, BERRY, 48);
}

function drawBanner(ctx, assets, text, photoOptions) {
  const W = PIN_WIDTH;
  const H = PIN_HEIGHT;
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  let y = 90;
  if (text.tagline) {
    drawTagline(ctx, text.tagline, W / 2, y, BERRY);
    y += 30;
  }
  const title = fitText(ctx, text.headline, { maxWidth: 880, maxLines: 3, max: 104, min: 60 });
  ctx.fillStyle = INK;
  y = drawLines(ctx, title, W / 2, y);
  if (text.details) {
    ctx.font = `500 32px ${SANS}`;
    ctx.fillStyle = MUTED;
    ctx.fillText(text.details, W / 2, y + 52);
    y += 70;
  }

  const footerHeight = 130;
  drawPhoto(ctx, assets.photo, { x: 50, y: y + 40, w: W - 100, h: H - footerHeight - 40 - (y + 40) }, photoOptions, 32);

  ctx.fillStyle = BERRY;
  ctx.fillRect(0, H - footerHeight, W, footerHeight);
  ctx.font = `600 30px ${SANS}`;
  ctx.fillStyle = CREAM;
  drawBrand(ctx, assets.logo, W / 2, H - footerHeight / 2, CREAM, 60);
}

const DRAWERS = { classic: drawClassic, card: drawCard, banner: drawBanner };

export function drawPin(canvas, assets, { style, text, photo }) {
  canvas.width = PIN_WIDTH;
  canvas.height = PIN_HEIGHT;
  const ctx = canvas.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  (DRAWERS[style] || drawClassic)(ctx, assets, text, photo);
}

// Title, description and link to paste into Pinterest (or Instagram, Facebook...)
export function pinCaption(post, url) {
  const hashtags = ["recipe", "homemade", ...(post.cuisines || []).map((c) => cuisineLabel(c))]
    .map((tag) => `#${tag.replace(/[^a-z0-9]/gi, "").toLowerCase()}`)
    .filter((tag, i, all) => tag.length > 1 && all.indexOf(tag) === i);
  return {
    title: post.title.slice(0, 100),
    description: [
      post.description?.trim(),
      `Get the full recipe, with ingredients and step-by-step method, on Pickle & Pan: ${url}`,
      hashtags.join(" "),
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 500),
    link: url,
  };
}
