const express = require("express");
const router = express.Router();
const { uploadUpiPdf } = require("../controllers/uploadController");

router.post("/upload-upi-pdf", uploadUpiPdf);

module.exports = router;
