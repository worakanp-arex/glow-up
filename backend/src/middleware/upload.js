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

// Multer's fileFilter only trusts the client-supplied Content-Type, which is
// trivially spoofable. This checks the bytes actually written to disk.
// file-type can't disambiguate legacy OLE/CFB container formats (.doc/.xls/.ppt
// all share one container signature), so a sniffed "application/x-cfb" is
// accepted wherever "application/msword" is declared as allowed for the kind.
const CFB_COMPATIBLE_DECLARED_TYPES = new Set(["application/msword"]);

function uploadedFiles(req) {
  if (req.files) return Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  return req.file ? [req.file] : [];
}

// Multer writes each file to disk as soon as it arrives, before the route has
// decided whether to accept the request. Put this in front of the uploader and
// every file is removed again if the request ends up refused (bad input, a
// duplicate, a rate limit, a failed check...), so rejected requests can't fill
// the disk with files nothing refers to.
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

// Deletes a stored file given the URL the app saved for it (/uploads/<kind>/<name>).
// Anything that isn't exactly that shape is ignored, so a bad value in the
// database can never point this at some other file on the server.
export function removeStoredFile(fileUrl) {
  const match = /^\/uploads\/([\w-]+)\/([\w.-]+)$/.exec(fileUrl || "");
  if (!match || match[2].includes("..") || !Object.values(SUBFOLDERS).includes(match[1])) return Promise.resolve();
  return fs.promises.unlink(path.join(UPLOAD_ROOT, match[1], match[2])).catch(() => {});
}

// Photos carry hidden data: where and when they were taken (GPS), the phone
// model, sometimes the owner's name. Profile pictures are served to anyone who
// has the link, so they must not leak where a patient lives. Re-encoding the
// picture drops all of that; `rotate()` first applies the camera's orientation
// so the picture still looks the same way up.
const REENCODED_IMAGE_FORMATS = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
// Refuse decompression bombs: a tiny file that expands to a gigantic bitmap.
const MAX_IMAGE_PIXELS = 40_000_000;

async function stripImageMetadata(file) {
  const format = REENCODED_IMAGE_FORMATS[file.mimetype];
  if (!format) return; // PDFs and Word files are stored as they are
  // Read the bytes first: handing sharp the path keeps the file open on Windows,
  // which makes writing the cleaned picture back over it fail.
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
      // The bytes must really be the type the upload claimed: the claimed type
      // picks the stored file's extension, so a mismatch would label e.g. a
      // script or document as an image.
      const matches =
        sniffed &&
        (sniffed.mime === file.mimetype ||
          (sniffed.mime === "application/x-cfb" &&
            CFB_COMPATIBLE_DECLARED_TYPES.has(file.mimetype) &&
            declared.includes(file.mimetype)));
      if (!matches) {
        // Remove all of them, not just this one, then refuse.
        await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
        return res.status(400).json({ message: `Invalid file content for ${kind}` });
      }
    }
    try {
      await Promise.all(files.map(stripImageMetadata));
    } catch {
      // The signature looked right but the picture can't be decoded (corrupt, or absurdly large).
      await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
      return res.status(400).json({ message: `Invalid file content for ${kind}` });
    }
    next();
  };
}
