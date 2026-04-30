const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const { uploadUpiPdf } = require("../controllers/uploadController");
const { assertSupportedPdfSource } = require("../services/pdfSourceService");

const uploadDir = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    cb(null, `${Date.now()}_${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    if (file.mimetype === "application/pdf") {
      return cb(null, true);
    }
    return cb(new Error("Only PDF files are allowed"));
  },
});

function resolvePdfSource(req, res, next) {
  const headerSource = req.get("X-PDF-Source");
  const bodySource = req.body && typeof req.body.source === "string"
    ? req.body.source
    : null;
  const source = headerSource || bodySource;

  try {
    req.upiPdfSource = assertSupportedPdfSource(source);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
}

router.post(
  "/upload-upi-pdf",
  (req, _, next) => {
    console.log("[upload] Request received at /api/upload-upi-pdf");
    next();
  },
  upload.single("file"),
  (req, _, next) => {
    console.log("[upload] Multer accepted file:", req.file ? req.file.originalname : "none");
    next();
  },
  resolvePdfSource,
  uploadUpiPdf,
);

module.exports = router;
