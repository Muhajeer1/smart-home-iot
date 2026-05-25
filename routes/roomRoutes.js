const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController.js");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/rooms/:homeId", requireAuth, roomController.getRoomsByHome);
router.post("/rooms", requireAuth, roomController.createRoom);
router.put("/rooms/:id", requireAuth, roomController.updateRoom);

module.exports = router;
