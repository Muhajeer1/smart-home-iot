const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

router.get(
  "/analytics/devices-per-home",
  analyticsController.getDevicesPerHome,
);
router.get("/analytics/latest-readings", analyticsController.getLatestReadings);
router.get(
  "/analytics/abnormal-readings",
  analyticsController.getAbnormalReadings,
);
router.get(
  "/analytics/alert-summary",
  analyticsController.getAlertSummaryByType,
);
router.get(
  "/analytics/average-reading-by-sensor-type",
  analyticsController.getAverageReadingBySensorType,
);
router.get("/analytics/rooms-per-home", analyticsController.getRoomsPerHome);

module.exports = router;
