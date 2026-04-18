const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");

router.get("/homes/:userId", homeController.getHomesByUser);
router.post("/homes", homeController.createHome);
router.delete("/homes/:id", homeController.deleteHome);

module.exports = router;
