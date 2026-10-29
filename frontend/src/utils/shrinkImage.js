// รูปจากโทรศัพท์มักใหญ่ 3-10 MB เกินขีดจำกัดรูปโปรไฟล์ 2 MB ย่อรูปใหญ่
// ในเบราว์เซอร์ก่อนอัปโหลด เพื่อไม่ให้ผู้ใช้ชนขีดจำกัดนั้น
// ไฟล์เล็กส่งคืนตามเดิม ถ้าเบราว์เซอร์ถอดรหัสรูปไม่ได้
// จะคืนไฟล์ต้นฉบับ และการตรวจของเซิร์ฟเวอร์ยังมีผลอยู่
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
  ctx.fillStyle = "#ffffff"; // พื้นที่โปร่งใสของ PNG กลายเป็นสีขาวใน JPEG
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
