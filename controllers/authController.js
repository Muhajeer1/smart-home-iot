const db = require("../db");
const bcrypt = require("bcrypt");
const { normalizeText, requireFields, sendDbError } = require("../utils/http");
const {
  createToken,
  setSessionCookie,
  clearSessionCookie,
} = require("../utils/sessionToken");
const { normalizeUserRole } = require("../utils/roles");

exports.login = async (req, res) => {
  const email = normalizeText(req.body.email);
  const password = req.body.password;

  if (
    !requireFields(res, [
      { label: "Email", value: email },
      { label: "Password", value: password },
    ])
  ) {
    return;
  }

  try {
    const result = await db.query(
      `
      SELECT u.*, r.role_name
      FROM "User" u
      JOIN Role r ON u.role_id = r.role_id
      WHERE u.email = $1
      `,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Wrong credentials" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ error: "Wrong credentials" });
    }

    const safeUser = normalizeUserRole({
      user_id: user.user_id,
      full_name: user.full_name,
      email: user.email,
      role_id: user.role_id,
      role_name: user.role_name,
    });
    const token = createToken(safeUser.user_id);

    setSessionCookie(res, token);

    res.json({
      message: "Login success",
      user: safeUser,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Server error" });
  }
};

exports.me = async (req, res) => {
  res.json({ user: req.user });
};

exports.logout = async (req, res) => {
  clearSessionCookie(res);
  res.json({ message: "Logged out" });
};

exports.register = async (req, res) => {
  try {
    const full_name = normalizeText(req.body.full_name);
    const email = normalizeText(req.body.email);
    const password = req.body.password;
    const role_id = 2;

    if (
      !requireFields(res, [
        { label: "Name", value: full_name },
        { label: "Email", value: email },
        { label: "Password", value: password },
      ])
    ) {
      return;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `
      INSERT INTO "User"
      (full_name, email, password_hash, role_id)
      VALUES ($1, $2, $3, $4)
      RETURNING user_id, full_name, email, role_id, created_at
      `,
      [full_name, email, password_hash, role_id],
    );

    res.status(201).json({
      message: "Registration successful",
      user: result.rows[0],
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err.message);
    sendDbError(res, err);
  }
};
