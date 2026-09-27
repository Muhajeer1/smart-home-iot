const app = require("../server");

// Vercel keeps the public request URL when rewriting to this function.
// Match Vite's /backend proxy without changing the existing Express routes.
module.exports = (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  req.url = req.url.replace(/^\/backend(?=\/|\?|$)/, "") || "/";
  if (req.url.startsWith("?")) req.url = `/${req.url}`;
  return app(req, res);
};
