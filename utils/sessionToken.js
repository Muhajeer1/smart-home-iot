const crypto = require("crypto");

const TOKEN_COOKIE_NAME = "token";
const ONE_DAY_SECONDS = 24 * 60 * 60;

function getSecret() {
  return process.env.JWT_SECRET || "local_development_secret_change_me";
}

function base64UrlEncode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function base64UrlDecode(value) {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function signPart(data) {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

function createToken(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + ONE_DAY_SECONDS,
  };

  const body = `${base64UrlEncode(header)}.${base64UrlEncode(tokenPayload)}`;
  return `${body}.${signPart(body)}`;
}

function verifyToken(token) {
  try {
    const parts = String(token || "").split(".");

    if (parts.length !== 3) {
      return null;
    }

    const [header, payload, signature] = parts;
    const body = `${header}.${payload}`;
    const expectedSignature = signPart(body);

    if (signature.length !== expectedSignature.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    const data = base64UrlDecode(payload);

    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return data;
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

function setSessionCookie(res, token) {
  res.cookie(TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ONE_DAY_SECONDS * 1000,
  });
}

function clearSessionCookie(res) {
  res.clearCookie(TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
}

module.exports = {
  TOKEN_COOKIE_NAME,
  createToken,
  verifyToken,
  parseCookies,
  setSessionCookie,
  clearSessionCookie,
};
