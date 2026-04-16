const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const router = express.Router();
const { uploadUpiPdf } = require("../controllers/uploadController");

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
  uploadUpiPdf
);

module.exports = router;
