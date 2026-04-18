const express = require("express");
const router = express.Router();
const alertController = require("../controllers/alertController");

router.get("/alerts", alertController.getAlerts);
router.patch("/alerts/:id/resolve", alertController.updateAlertResolution);
router.delete("/alerts/:id", alertController.deleteAlert);

module.exports = router;
