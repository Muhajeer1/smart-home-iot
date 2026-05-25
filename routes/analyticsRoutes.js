const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");
const analyticsRoles = ["admin", "user", "technician"];

router.get(
  "/analytics/dashboard-summary",
  requireAuth,
  analyticsController.getDashboardSummary,
);
router.get(
  "/analytics/homes",
  requireAuth,
  requireRole(analyticsRoles),
  analyticsController.getAnalyticsHomes,
);
router.get(
  "/analytics/devices-per-home",
  requireAuth,
  requireRole(analyticsRoles),
  analyticsController.getDevicesPerHome,
);
router.get("/analytics/latest-readings", requireAuth, requireRole(analyticsRoles), analyticsController.getLatestReadings);
router.get(
  "/analytics/abnormal-readings",
  requireAuth,
  requireRole(analyticsRoles),
  analyticsController.getAbnormalReadings,
);
router.get(
  "/analytics/alert-summary",
  requireAuth,
  requireRole(analyticsRoles),
  analyticsController.getAlertSummaryByType,
);
router.get(
  "/analytics/average-reading-by-sensor-type",
  requireAuth,
  requireRole(analyticsRoles),
  analyticsController.getAverageReadingBySensorType,
);
router.get("/analytics/rooms-per-home", requireAuth, requireRole(analyticsRoles), analyticsController.getRoomsPerHome);

module.exports = router;
