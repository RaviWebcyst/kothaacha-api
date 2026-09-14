// middleware/upload.js
// Multer config for image uploads (property photos, blog cover images).
// Files are saved to server/uploads and served statically at /uploads
// (see server.js) — the DB only ever stores the resulting "/uploads/..."
// path, never raw file data or an externally-hosted link.

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40);
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base || 'image'}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (/^image\//.test(file.mimetype)) return cb(null, true);
  cb(new Error('Only image files are allowed'));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 }, // 8MB per file, up to 12 files
});
