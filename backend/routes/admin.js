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

router.get("/urls", adminAuth, getAllUrls);
router.get("/urls/:code/stats", adminAuth, getUrlStats);
router.delete("/urls/:code", adminAuth, deleteUrl);
router.patch("/urls/:code", adminAuth, updateUrl);
router.get("/stats", adminAuth, getGlobalStats);

module.exports = router;
