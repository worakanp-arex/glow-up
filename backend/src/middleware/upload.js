import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "url";
import { fileTypeFromFile } from "file-type";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const UPLOAD_ROOT = path.join(__dirname, "../../uploads");

const SUBFOLDERS = {
  avatar: "avatars",
  resume: "resumes",
  certificate: "certificates",
  applicationAttachment: "application-attachments",
};

for (const folder of Object.values(SUBFOLDERS)) {
  fs.mkdirSync(path.join(UPLOAD_ROOT, folder), { recursive: true });
}

const FILE_FILTERS = {
  avatar: ["image/jpeg", "image/png", "image/webp"],
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

  return multer({
    storage,
    limits: { fileSize: SIZE_LIMITS[kind], files: 10 },
    fileFilter: (req, file, cb) => {
      if (!FILE_FILTERS[kind].includes(file.mimetype)) {
        return cb(new Error(`Invalid file type for ${kind}`));
      }
      cb(null, true);
    },
  });
}

export const uploadAvatar = makeUploader("avatar");
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

export function verifyUploadedFile(kind) {
  return async function (req, res, next) {
    const files = req.files
      ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat())
      : req.file
        ? [req.file]
        : [];
    if (files.length === 0) return next();

    for (const file of files) {
      const sniffed = await fileTypeFromFile(file.path);
      const declared = FILE_FILTERS[kind];
      const matches =
        sniffed &&
        (declared.includes(sniffed.mime) ||
          (sniffed.mime === "application/x-cfb" && declared.some((mime) => CFB_COMPATIBLE_DECLARED_TYPES.has(mime))));
      if (!matches) {
        await fs.promises.unlink(file.path).catch(() => {});
        return res.status(400).json({ message: `Invalid file content for ${kind}` });
      }
    }
    next();
  };
}
