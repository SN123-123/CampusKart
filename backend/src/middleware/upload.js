const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { httpError } = require('../utils/http');

const uploadDir = path.join(__dirname, '../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) =>
      cb(null, crypto.randomBytes(12).toString('hex') + ALLOWED[file.mimetype]),
  }),
  limits: { fileSize: 4 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) =>
    ALLOWED[file.mimetype]
      ? cb(null, true)
      : cb(httpError(400, 'Only JPG, PNG or WebP images are allowed')),
});

module.exports = { upload, uploadDir };
