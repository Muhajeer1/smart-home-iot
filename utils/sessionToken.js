const jwt = require("jsonwebtoken");

const TOKEN_COOKIE_NAME = "token";
const ONE_DAY_SECONDS = 24 * 60 * 60;
const ONE_DAY_MS = ONE_DAY_SECONDS * 1000;
const TOKEN_ISSUER = "smart-home-iot";
const TOKEN_AUDIENCE = "smart-home-web";

function getSecret() {
  const secret = String(process.env.JWT_SECRET || "").trim();

  if (!secret) {
    throw new Error("JWT_SECRET is required. Add it to your .env file or deployment environment variables.");
  }

  return secret;
}

const JWT_SECRET = getSecret();

function createToken(userId) {
  return jwt.sign({}, JWT_SECRET, {
    subject: String(userId),
    algorithm: "HS256",
    expiresIn: ONE_DAY_SECONDS,
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
  } catch (error) {
    return null;
  }
}

function parseCookies(req) {
  const cookieHeader = req.headers.cookie || "";

  return cookieHeader.split(";").reduce((cookies, item) => {
    const [rawKey, ...rawValue] = item.trim().split("=");
    if (!rawKey) return cookies;
    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    priority: "high",
  };
}

function setSessionCookie(res, token) {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    ...getCookieOptions(),
    maxAge: ONE_DAY_MS,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(TOKEN_COOKIE_NAME, getCookieOptions());
}

module.exports = {
  TOKEN_COOKIE_NAME,
  createToken,
  verifyToken,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
};
