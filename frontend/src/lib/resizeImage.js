const MAX_SIDE = 2000; // pixels; plenty for a full-width photo on any screen
const QUALITY = 0.85;
const SMALL_ENOUGH_BYTES = 800 * 1024;

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

// Shrinks big photos (like 12-megapixel phone pictures) before uploading, so pages load
// fast on phones. Small images are returned unchanged. Always resolves to a File.
export async function resizeImage(file) {
  let img;
  try {
    img = await loadImage(file);
  } catch {
    return file; // let the server decide what to do with it
  }

  const longest = Math.max(img.naturalWidth, img.naturalHeight);
  if (longest <= MAX_SIDE && file.size <= SMALL_ENOUGH_BYTES) return file;

  const scale = Math.min(1, MAX_SIDE / longest);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  const context = canvas.getContext("2d");
  // White background so transparent PNGs don't turn black as JPEG
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  // If the browser couldn't encode it, or it somehow got bigger, keep the original
  if (!blob || blob.size >= file.size) return file;

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}
