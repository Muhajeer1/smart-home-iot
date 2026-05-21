const db = require("../db");
const { createEvent } = require("../services/eventService");
const { normalizeText, requireFields, sendDbError } = require("../utils/http");

exports.getHomesByUser = async (req, res) => {
  try {
    const userId = req.params.userId;

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
    const owner_user_id = req.body.owner_user_id;
    const userId = req.body.userId;
    const roleId = String(req.body.roleId || "");
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

exports.deleteHome = async (req, res) => {
  try {
    const homeId = req.params.id;
    const userId = req.query.userId;
    const roleId = String(req.query.roleId || "");
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
