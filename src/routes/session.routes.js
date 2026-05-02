const express = require("express");
const router = express.Router();
const { clearSession } = require("../controllers/sessionController");

router.delete("/", clearSession);

module.exports = router;
