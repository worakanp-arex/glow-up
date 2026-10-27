// Phone photos are often 3-10 MB, above the 2 MB avatar limit. Scale large
// pictures down in the browser before upload so people never hit that limit.
// Small files are returned untouched; if the browser cannot decode the image,
// the original file is returned and the server's own checks still apply.
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export async function shrinkImage(file, { maxSide = 1024, maxBytes = AVATAR_MAX_BYTES, quality = 0.85 } = {}) {
  if (!file || !file.type?.startsWith("image/")) return file;
  if (file.size <= maxBytes * 0.75) return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // transparent PNG areas become white in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  for (let q = quality; q >= 0.5; q -= 0.1) {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
    if (blob && blob.size <= maxBytes) {
      const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
    }
  }
  return file;
}
