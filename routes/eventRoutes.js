const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/events", requireAuth, eventController.getAllEvents);
router.get("/events/home/:homeId", requireAuth, eventController.getEventsByHome);

module.exports = router;
