const express = require("express");
const router = express.Router();
const readingController = require("../controllers/readingController.js");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

router.get("/readings/:sensorId", requireAuth, readingController.getReadingsBySensor);
router.post("/readings/simulate", requireAuth, requireRole(["admin", "technician"]), readingController.simulateReading);
router.post("/readings/simulate-bulk", requireAuth, requireRole(["admin", "technician"]), readingController.simulateBulkReadings);

module.exports = router;
