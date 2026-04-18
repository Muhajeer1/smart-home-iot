const express = require("express");
const router = express.Router();
const readingController = require("../controllers/readingController.js");

router.get("/readings/:sensorId", readingController.getReadingsBySensor);
router.post("/readings", readingController.createReading);
router.post("/readings/simulate", readingController.simulateReading);
router.post("/readings/simulate-bulk", readingController.simulateBulkReadings);

module.exports = router;
