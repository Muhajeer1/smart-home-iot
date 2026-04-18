const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");

router.get("/devices/:roomId", deviceController.getDevicesByRoom);
router.post("/devices", deviceController.createDevice);
router.post("/devices/:id/default-sensors", deviceController.createDefaultSensorsForDevice);
router.put("/devices/:id", deviceController.updateDevice);
router.delete("/devices/:id", deviceController.deleteDevice);

module.exports = router;
