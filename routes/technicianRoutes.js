const express = require("express");
const router = express.Router();
const technicianController = require("../controllers/technicianController");

router.get("/technician/devices", technicianController.getAllDevices);
router.get("/technician/sensors", technicianController.getAllSensors);
router.put("/technician/devices/:id", technicianController.updateDeviceStatus);

module.exports = router;
