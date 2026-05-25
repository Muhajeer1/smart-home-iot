const express = require("express");
const router = express.Router();
const sensorController = require("../controllers/sensorController.js");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/sensors/:deviceId", requireAuth, sensorController.getSensorsByDevice);

module.exports = router;
