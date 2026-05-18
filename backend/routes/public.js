const express = require("express");
const {
  createShortUrl,
  createCustomShortUrl,
  redirectToUrl,
} = require("../controllers/publicController");

const router = express.Router();

router.post("/shorten", createShortUrl);
router.post("/shorten/custom", createCustomShortUrl);
router.get("/:code", redirectToUrl);

module.exports = router;
