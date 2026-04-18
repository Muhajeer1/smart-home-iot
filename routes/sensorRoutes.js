const express = require("express");
const router = express.Router();
const sensorController = require("../controllers/sensorController.js");

router.get("/sensors/:deviceId", sensorController.getSensorsByDevice);
router.post("/sensors", sensorController.createSensor);
router.delete("/sensors/:id", sensorController.deleteSensor);

module.exports = router;
