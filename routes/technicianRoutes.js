const express = require("express");
const router = express.Router();
const technicianController = require("../controllers/technicianController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const technicianOnly = [requireAuth, requireRole(["admin", "technician"])];

router.get("/technician/devices", technicianOnly, technicianController.getAllDevices);
router.get("/technician/sensors", technicianOnly, technicianController.getAllSensors);
router.put("/technician/devices/:id", technicianOnly, technicianController.updateDeviceStatus);

module.exports = router;
