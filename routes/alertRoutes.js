const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/alerts", requireAuth, alertController.getAlerts);
router.patch("/alerts/:id/resolve", requireAuth, alertController.updateAlertResolution);
router.delete("/alerts/:id", requireAuth, alertController.deleteAlert);

module.exports = router;
