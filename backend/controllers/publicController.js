const Url = require("../models/Url");

const reservedSlugs = new Set(["admin", "shorten", "api"]);

function validateHttpUrl(originalUrl) {
  try {
    const parsedUrl = new URL(originalUrl);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

async function generateUniqueShortCode() {
  const { nanoid } = await import("nanoid");

  while (true) {
    const shortCode = nanoid(7);
    const existingUrl = await Url.findOne({ shortCode });

    if (!existingUrl) {
      return shortCode;
    }
  }
}

async function createShortUrl(req, res, next) {
  try {
    const { originalUrl } = req.body;

    if (!validateHttpUrl(originalUrl)) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    const shortCode = await generateUniqueShortCode();
    await Url.create({ originalUrl, shortCode });

    return res.status(201).json({
      shortUrl: `${process.env.BASE_URL}/${shortCode}`,
      shortCode,
    });
  } catch (error) {
    return next(error);
  }
}

async function createCustomShortUrl(req, res, next) {
  try {
    const { originalUrl, customSlug } = req.body;

    if (!validateHttpUrl(originalUrl)) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    if (
      typeof customSlug !== "string" ||
      customSlug.length < 3 ||
      customSlug.length > 30 ||
      !/^[a-zA-Z0-9-]+$/.test(customSlug) ||
      reservedSlugs.has(customSlug.toLowerCase())
    ) {
      return res.status(400).json({ error: "Invalid custom slug" });
    }

    const existingUrl = await Url.findOne({ shortCode: customSlug });

    if (existingUrl) {
      return res.status(409).json({ error: "Custom slug already exists" });
    }

    await Url.create({ originalUrl, shortCode: customSlug, customSlug: true });

    return res.status(201).json({
      shortUrl: `${process.env.BASE_URL}/${customSlug}`,
      shortCode: customSlug,
    });
  } catch (error) {
    return next(error);
  }
}

async function redirectToUrl(req, res, next) {
  try {
    const { code } = req.params;
    const url = await Url.findOne({ shortCode: code });

    if (!url) {
      return res.status(404).send("<h1>Short URL not found</h1>");
    }

    url.clicks += 1;
    url.lastAccessed = Date.now();
    await url.save();

    return res.redirect(302, url.originalUrl);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createShortUrl,
  createCustomShortUrl,
  redirectToUrl,
  validateHttpUrl,
};
