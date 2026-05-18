const Url = require("../models/Url");
const { validateHttpUrl } = require("./publicController");

async function getAllUrls(req, res, next) {
  try {
    const allowedSorts = new Set(["clicks", "createdAt"]);
    const sortBy = allowedSorts.has(req.query.sort) ? req.query.sort : "createdAt";
    const urls = await Url.find().sort({ [sortBy]: -1 });

    return res.status(200).json(urls);
  } catch (error) {
    return next(error);
  }
}

async function getUrlStats(req, res, next) {
  try {
    const { code } = req.params;
    const url = await Url.findOne({ shortCode: code });

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    return res.status(200).json(url);
  } catch (error) {
    return next(error);
  }
}

async function deleteUrl(req, res, next) {
  try {
    const { code } = req.params;
    const deletedUrl = await Url.findOneAndDelete({ shortCode: code });

    if (!deletedUrl) {
      return res.status(404).json({ error: "URL not found" });
    }

    return res.status(200).json({ message: "Deleted successfully" });
  } catch (error) {
    return next(error);
  }
}

async function updateUrl(req, res, next) {
  try {
    const { code } = req.params;
    const { originalUrl } = req.body;

    if (!validateHttpUrl(originalUrl)) {
      return res.status(400).json({ error: "Invalid URL" });
    }

    const updatedUrl = await Url.findOneAndUpdate(
      { shortCode: code },
      { originalUrl },
      { new: true }
    );

    if (!updatedUrl) {
      return res.status(404).json({ error: "URL not found" });
    }

    return res.status(200).json(updatedUrl);
  } catch (error) {
    return next(error);
  }
}

async function getGlobalStats(req, res, next) {
  try {
    const [totalUrls, clickStats, topUrls, recentUrls] = await Promise.all([
      Url.countDocuments(),
      Url.aggregate([{ $group: { _id: null, totalClicks: { $sum: "$clicks" } } }]),
      Url.find().sort({ clicks: -1 }).limit(5),
      Url.find().sort({ createdAt: -1 }).limit(5),
    ]);

    return res.status(200).json({
      totalUrls,
      totalClicks: clickStats[0]?.totalClicks || 0,
      topUrls,
      recentUrls,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAllUrls,
  getUrlStats,
  deleteUrl,
  updateUrl,
  getGlobalStats,
};
