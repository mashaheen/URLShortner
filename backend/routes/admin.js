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

router.get("/urls", getAllUrls);
router.get("/urls/:code/stats", getUrlStats);
router.delete("/urls/:code", deleteUrl);
router.patch("/urls/:code", updateUrl);
router.get("/stats", getGlobalStats);

module.exports = router;
