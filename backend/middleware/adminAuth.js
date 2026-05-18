function adminAuth(req, res, next) {
  const adminKey = req.get("x-admin-key");

  if (adminKey && adminKey === process.env.ADMIN_API_KEY) {
    return next();
  }

  return res.status(401).json({ error: "Unauthorized" });
}

module.exports = adminAuth;
