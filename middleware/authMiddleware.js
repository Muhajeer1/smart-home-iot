const db = require("../db");
const { TOKEN_COOKIE_NAME, parseCookies, verifyToken } = require("../utils/sessionToken");
const { hasRole, normalizeUserRole } = require("../utils/roles");

async function requireAuth(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies[TOKEN_COOKIE_NAME];
  const payload = verifyToken(token);
  const userId = Number(payload?.sub);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(401).json({ error: "Please log in again." });
  }

  try {
    const result = await db.query(
      `
      SELECT u.user_id, u.full_name, u.email, u.role_id, r.role_name
      FROM "User" u
      JOIN Role r ON r.role_id = u.role_id
      WHERE u.user_id = $1
      `,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Please log in again." });
    }

    req.user = normalizeUserRole(result.rows[0]);
    next();
  } catch (error) {
    console.error("AUTH SESSION ERROR:", error.message);
    res.status(500).json({ error: "Server error" });
  }
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
