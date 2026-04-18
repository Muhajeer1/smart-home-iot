const express = require("express");
const router = express.Router();
const eventController = require("../controllers/eventController");

router.get("/events", eventController.getAllEvents);
router.get("/events/home/:homeId", eventController.getEventsByHome);

module.exports = router;
