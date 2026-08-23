import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

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
      const ext = path.extname(file.originalname);
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: SIZE_LIMITS[kind] },
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
