import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "url";
import { fileTypeFromFile } from "file-type";
import sharp from "sharp";
import { sanitizeMongoOperators } from "./sanitizeMongoOperators.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, "../../uploads");

const SUBFOLDERS = {
  avatar: "avatars",
  resume: "resumes",
  certificate: "certificates",
  applicationAttachment: "application-attachments",
  courseCover: "course-covers",
  jobImage: "job-images",
};

for (const folder of Object.values(SUBFOLDERS)) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true });
}

const FILE_FILTERS = {
  avatar: ["image/jpeg", "image/png", "image/webp"],
  courseCover: ["image/jpeg", "image/png", "image/webp"],
  jobImage: ["image/jpeg", "image/png", "image/webp"],
  resume: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  certificate: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  applicationAttachment: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
};

const SIZE_LIMITS = {
  avatar: 2 * 1024 * 1024,
  courseCover: 3 * 1024 * 1024,
  jobImage: 3 * 1024 * 1024,
  resume: 5 * 1024 * 1024,
  certificate: 5 * 1024 * 1024,
  applicationAttachment: 5 * 1024 * 1024,
};

function makeUploader(kind) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(UPLOAD_ROOT, SUBFOLDERS[kind])),
    filename: (req, file, cb) => {
      const extensions = {
        "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp",
        "application/pdf": ".pdf", "application/msword": ".doc",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
      };
      cb(null, `${randomUUID()}${extensions[file.mimetype] || ".bin"}`);
    },
  });

  const uploader = multer({
    storage,
    limits: { fileSize: SIZE_LIMITS[kind], files: 10 },
    fileFilter: (req, file, cb) => {
      if (!FILE_FILTERS[kind].includes(file.mimetype)) {
        return cb(new Error(`Invalid file type for ${kind}`));
      }
      cb(null, true);
    },
  });

  // Every route that takes uploads gets the cleanup of refused requests built
  // in; Express flattens the returned arrays of middleware.
  // The global sanitizer runs before multer has parsed a multipart body, so the
  // form fields of an upload are cleaned of operator keys right after parsing.
  return {
    single: (field) => [discardUploadsOnFailure, uploader.single(field), sanitizeMongoOperators],
    array: (field, maxCount) => [discardUploadsOnFailure, uploader.array(field, maxCount), sanitizeMongoOperators],
  };
}

export const uploadAvatar = makeUploader("avatar");
export const uploadCourseCover = makeUploader("courseCover");
export const uploadJobImage = makeUploader("jobImage");
export const uploadResume = makeUploader("resume");
export const uploadCertificate = makeUploader("certificate");
export const uploadApplicationAttachment = makeUploader("applicationAttachment");

export function publicUrl(kind, filename) {
  return `/uploads/${SUBFOLDERS[kind]}/${filename}`;
}

// fileFilter ของ Multer เชื่อเพียง Content-Type ที่ไคลเอนต์ส่งมา ซึ่งปลอมได้ง่ายมาก
// ที่นี่จึงตรวจไบต์ที่เขียนลงดิสก์จริง file-type แยกแยะรูปแบบคอนเทนเนอร์ OLE/CFB รุ่นเก่า
// (.doc/.xls/.ppt ใช้ลายเซ็นคอนเทนเนอร์เดียวกัน) ไม่ได้ ดังนั้น
// "application/x-cfb" ที่ตรวจพบจะยอมรับในทุกที่ที่ประกาศอนุญาต "application/msword"
// สำหรับประเภทนั้น
const CFB_COMPATIBLE_DECLARED_TYPES = new Set(["application/msword"]);

function uploadedFiles(req) {
  if (req.files) return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  return req.file ? [req.file] : [];
}

// Multer เขียนแต่ละไฟล์ลงดิสก์ทันทีที่มาถึง ก่อนที่ route จะตัดสินว่ารับคำขอหรือไม่
// ใส่ตัวนี้ไว้หน้าตัวอัปโหลด แล้วทุกไฟล์จะถูกลบอีกครั้งหากคำขอถูกปฏิเสธ
// (ข้อมูลไม่ถูกต้อง ซ้ำ เกิน rate limit ตรวจไม่ผ่าน...) คำขอที่ถูกปฏิเสธจึงไม่ทำให้ดิสก์เต็ม
// ด้วยไฟล์ที่ไม่มีอะไรอ้างอิง
export function discardUploadsOnFailure(req, res, next) {
  res.on("close", () => {
    if (res.statusCode < 400) return;
    for (const file of uploadedFiles(req)) fs.unlink(file.path, () => {});
  });
  next();
}

export function removeUploadedFiles(files) {
  for (const file of files) fs.unlink(file.path, () => {});
}

// ลบไฟล์ที่เก็บไว้ตาม URL ที่แอปบันทึกไว้ (/uploads/<kind>/<name>)
// สิ่งที่ไม่ตรงรูปแบบนั้นเป๊ะๆ จะถูกเมิน ดังนั้นค่าที่ผิดในฐานข้อมูล
// จะไม่มีทางทำให้ชี้ไปลบไฟล์อื่นบนเซิร์ฟเวอร์
export function removeStoredFile(fileUrl) {
  const match = /^\/uploads\/([\w-]+)\/([\w.-]+)$/.exec(fileUrl || "");
  if (!match || match[2].includes("..") || !Object.values(SUBFOLDERS).includes(match[1])) return Promise.resolve();
  return fs.promises.unlink(path.join(UPLOAD_ROOT, match[1], match[2])).catch(() => {});
}

// รูปภาพมีข้อมูลซ่อน: สถานที่และเวลาที่ถ่าย (GPS) รุ่นโทรศัพท์ และบางครั้งชื่อเจ้าของ
// รูปโปรไฟล์เปิดให้ทุกคนที่มีลิงก์ดูได้ จึงต้องไม่เผยว่าผู้ป่วยอาศัยอยู่ที่ไหน
// การเข้ารหัสรูปใหม่ตัดข้อมูลเหล่านั้นทั้งหมด `rotate()` ใช้ทิศทางจากกล้องก่อน
// เพื่อให้รูปยังหันถูกด้านเหมือนเดิม
const REENCODED_IMAGE_FORMATS = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
// ปฏิเสธ decompression bomb: ไฟล์เล็กๆ ที่ขยายเป็นบิตแมปขนาดมหึมา
const MAX_IMAGE_PIXELS = 40_000_000;

async function stripImageMetadata(file) {
  const format = REENCODED_IMAGE_FORMATS[file.mimetype];
  if (!format) return; // PDF และไฟล์ Word เก็บตามที่เป็นอยู่
  // อ่านไบต์ก่อน: การส่งพาธให้ sharp ทำให้ไฟล์ค้างเปิดอยู่บน Windows
  // ส่งผลให้เขียนรูปที่ล้างแล้วทับไฟล์เดิมไม่ได้
  const original = await fs.promises.readFile(file.path);
  const cleaned = await sharp(original, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate()
    .toFormat(format, format === "png" ? {} : { quality: 90 })
    .toBuffer();
  await fs.promises.writeFile(file.path, cleaned);
}

export function verifyUploadedFile(kind) {
  return async function (req, res, next) {
    const files = uploadedFiles(req);
    if (files.length === 0) return next();

    const declared = FILE_FILTERS[kind];
    for (const file of files) {
      const sniffed = await fileTypeFromFile(file.path);
      // ไบต์ต้องเป็นประเภทเดียวกับที่ประกาศตอนอัปโหลดจริงๆ: ประเภทที่ประกาศ
      // เป็นตัวกำหนดนามสกุลของไฟล์ที่เก็บ หากไม่ตรงจะทำให้เช่น
      // สคริปต์หรือเอกสารถูกติดป้ายว่าเป็นรูปภาพ
      const matches =
        sniffed &&
        (sniffed.mime === file.mimetype ||
          (sniffed.mime === "application/x-cfb" &&
            CFB_COMPATIBLE_DECLARED_TYPES.has(file.mimetype) &&
            declared.includes(file.mimetype)));
      if (!matches) {
        // ลบทั้งหมด ไม่ใช่แค่ไฟล์นี้ แล้วจึงปฏิเสธ
        await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
        return res.status(400).json({ message: `Invalid file content for ${kind}` });
      }
    }
    try {
      await Promise.all(files.map(stripImageMetadata));
    } catch {
      // ลายเซ็นดูถูกต้อง แต่ถอดรหัสรูปไม่ได้ (เสียหาย หรือใหญ่ผิดปกติ)
      await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
      return res.status(400).json({ message: `Invalid file content for ${kind}` });
    }
    next();
  };
}
