const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

router.get("/admin/users", adminController.getAllUsers);
router.get("/admin/homes", adminController.getAllHomes);
router.get("/admin/devices", adminController.getAllDevices);

router.delete("/admin/users/:id", adminController.deleteUser);
router.delete("/admin/homes/:id", adminController.deleteHome);
router.delete("/admin/devices/:id", adminController.deleteDevice);

module.exports = router;
