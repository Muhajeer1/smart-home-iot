const express = require("express");
const router = express.Router();
const sensorController = require("../controllers/sensorController.js");

router.get("/sensors/:deviceId", sensorController.getSensorsByDevice);

module.exports = router;
