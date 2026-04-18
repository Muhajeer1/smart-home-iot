const express = require("express");
const router = express.Router();
const roomController = require("../controllers/roomController.js");

router.get("/rooms/:homeId", roomController.getRoomsByHome);
router.post("/rooms", roomController.createRoom);
router.put("/rooms/:id", roomController.updateRoom);

module.exports = router;
