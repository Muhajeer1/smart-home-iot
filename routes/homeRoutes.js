const express = require("express");
const router = express.Router();
const homeController = require("../controllers/homeController");
const { requireAuth } = require("../middleware/authMiddleware");

router.get("/api/homes", requireAuth, homeController.getHomesByUser);
router.post("/homes", requireAuth, homeController.createHome);
router.delete("/homes/:id", requireAuth, homeController.deleteHome);

module.exports = router;
