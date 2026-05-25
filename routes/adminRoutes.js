const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/authMiddleware");

const adminOnly = [requireAuth, requireRole(["admin"])];

router.get("/admin/users", adminOnly, adminController.getAllUsers);
router.get("/admin/homes", adminOnly, adminController.getAllHomes);
router.get("/admin/devices", adminOnly, adminController.getAllDevices);

router.delete("/admin/users/:id", adminOnly, adminController.deleteUser);
router.delete("/admin/homes/:id", adminOnly, adminController.deleteHome);
router.delete("/admin/devices/:id", adminOnly, adminController.deleteDevice);

module.exports = router;
