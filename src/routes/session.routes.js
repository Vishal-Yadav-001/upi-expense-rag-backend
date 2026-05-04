const express = require("express");
const router = express.Router();
const { clearSession } = require("../controllers/sessionController");

router.delete("/clear", clearSession);

module.exports = router;
