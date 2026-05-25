const { TOKEN_COOKIE_NAME, parseCookies, verifyToken } = require("../utils/sessionToken");
const { hasRole, normalizeUserRole } = require("../utils/roles");

function requireAuth(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies[TOKEN_COOKIE_NAME];
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: "Please log in again." });
  }

  req.user = normalizeUserRole(user);
  next();
}

function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !hasRole(req.user, allowedRoles)) {
      return res.status(403).json({ error: "Access denied." });
    }

    next();
  };
}

module.exports = { requireAuth, requireRole };
