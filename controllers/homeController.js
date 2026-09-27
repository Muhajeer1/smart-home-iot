const db = require("../db");
const { createEvent } = require("../services/eventService");
const { normalizeText, requireFields, sendDbError } = require("../utils/http");

exports.getHomesByUser = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await db.query(
      `
      SELECT * FROM Home
      WHERE owner_user_id = $1
      ORDER BY home_id DESC
      `,
      [userId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    sendDbError(res, err);
  }
};

exports.createHome = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const roleId = String(req.user.role_id || "");
    const owner_user_id = roleId === "1" && req.body.owner_user_id ? req.body.owner_user_id : userId;
    const home_name = normalizeText(req.body.home_name);
    const address_text = normalizeText(req.body.address_text);

    if (
      !requireFields(res, [
        { label: "User", value: owner_user_id },
        { label: "Home name", value: home_name },
        { label: "Address", value: address_text },
      ])
    ) {
      return;
    }

    if (roleId !== "1" && String(owner_user_id) !== String(userId)) {
      return res.status(403).json({ error: "You can only create homes for your own account." });
    }

    const result = await db.query(
      `
      INSERT INTO Home (owner_user_id, home_name, address_text)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [owner_user_id, home_name, address_text],
    );

    const home = result.rows[0];

    await createEvent(
      home.home_id,
      null,
      "home_created",
      `Home "${home.home_name}" was created`,
    );

    res.status(201).json({
      message: "Home created successfully",
      home,
    });
  } catch (err) {
    console.error("CREATE HOME ERROR:", err.message);
    sendDbError(res, err);
  }
};

exports.updateHome = async (req, res) => {
  const homeId = req.params.id;
  if (!/^[1-9]\d*$/.test(homeId) || !Number.isSafeInteger(Number(homeId)) || Number(homeId) > 2147483647) {
    return res.status(400).json({ error: "Invalid home ID." });
  }

  const fields = [
    ["home_name", "Home name", 60],
    ["address_text", "Address", 200],
  ];
  const values = {};
  for (const [key, label, max] of fields) {
    const value = req.body?.[key];
    if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
      return res.status(400).json({ error: `${label} is required.` });
    }
    if (typeof value !== "string") {
      return res.status(400).json({ error: `${label} must be a string.` });
    }
    values[key] = value.trim();
    if (Array.from(values[key]).length > max) {
      return res.status(400).json({ error: `${label} must be at most ${max} characters.` });
    }
  }

  try {
    const result = await db.query(
      `UPDATE Home SET home_name = $1, address_text = $2
       WHERE home_id = $3 AND owner_user_id = $4 RETURNING *`,
      [values.home_name, values.address_text, homeId, req.user.user_id],
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: "Home not found." });
    }
    res.json({ message: "Home updated successfully", home: result.rows[0] });
  } catch (error) {
    console.error("UPDATE HOME ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.deleteHome = async (req, res) => {
  try {
    const homeId = req.params.id;
    const userId = req.user.user_id;
    const roleId = String(req.user.role_id || "");
    const params = [homeId];
    const ownerSql =
      roleId === "1" || roleId === "3" ? "" : "AND owner_user_id = $2";

    if (ownerSql) {
      params.push(userId || null);
    }

    const result = await db.query(
      `
      DELETE FROM Home
      WHERE home_id = $1
      ${ownerSql}
      RETURNING *
      `,
      params,
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Home not found" });
    }

    res.json({
      message: "Home deleted successfully",
      home: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    sendDbError(res, err);
  }
};
