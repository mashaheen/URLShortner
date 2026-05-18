const express = require("express");
const {
  getAllUrls,
  getUrlStats,
  deleteUrl,
  updateUrl,
  getGlobalStats,
} = require("../controllers/adminController");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();

router.use(adminAuth);

router.get("/admin/urls", getAllUrls);
router.get("/admin/urls/:code/stats", getUrlStats);
router.delete("/admin/urls/:code", deleteUrl);
router.patch("/admin/urls/:code", updateUrl);
router.get("/admin/stats", getGlobalStats);

module.exports = router;
