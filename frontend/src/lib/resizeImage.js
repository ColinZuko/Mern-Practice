const MAX_SIDE = 2000; // pixels; plenty for a full-width photo on any screen
const QUALITY = 0.82;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

// Prepares a photo for upload: scales it down to at most 2000px and converts it to
// WebP, which is much smaller than JPEG or PNG at the same quality. Browsers that
// can't save WebP get JPEG instead. Always resolves to a File; if anything goes
// wrong, or the result isn't smaller, the original file is returned.
export async function resizeImage(file) {
  let img;
  try {
    img = await loadImage(file);
  } catch {
    return file; // let the server decide what to do with it
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const context = canvas.getContext("2d");
  // White background so transparent PNGs don't turn black
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Some browsers (older Safari) silently produce PNG when asked for WebP, so check the type
  let blob = await canvasToBlob(canvas, "image/webp");
  let extension = ".webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg");
    extension = ".jpg";
  }
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + extension;
  return new File([blob], name, { type: blob.type, lastModified: Date.now() });
}
