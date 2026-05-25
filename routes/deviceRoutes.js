const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/devices/:roomId", requireAuth, deviceController.getDevicesByRoom);
router.post("/devices", requireAuth, deviceController.createDevice);
router.post("/devices/:id/default-sensors", requireAuth, deviceController.createDefaultSensorsForDevice);
router.put("/devices/:id", requireAuth, deviceController.updateDevice);
router.delete("/devices/:id", requireAuth, deviceController.deleteDevice);

module.exports = router;
