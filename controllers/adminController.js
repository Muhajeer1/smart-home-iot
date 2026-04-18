const db = require("../db");
const { sendDbError } = require("../utils/http");

exports.getAllUsers = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT u.user_id, u.full_name, u.email, u.role_id, r.role_name, u.created_at
      FROM "User" u
      JOIN Role r ON u.role_id = r.role_id
      ORDER BY u.user_id DESC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET ALL USERS ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getAllHomes = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT h.home_id, h.home_name, h.address_text, h.created_at,
             u.user_id AS owner_user_id, u.full_name AS owner_name
      FROM Home h
      JOIN "User" u ON h.owner_user_id = u.user_id
      ORDER BY h.home_id DESC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET ALL HOMES ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getAllDevices = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT d.device_id, d.device_type, d.brand_model, d.serial_no, d.status,
             r.room_name, h.home_name
      FROM Device d
      JOIN Room r ON d.room_id = r.room_id
      JOIN Home h ON r.home_id = h.home_id
      ORDER BY d.device_id DESC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET ALL DEVICES ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const result = await db.query(
      `
      DELETE FROM "User"
      WHERE user_id = $1
      RETURNING *
      `,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User deleted successfully",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("DELETE USER ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.deleteHome = async (req, res) => {
  try {
    const homeId = req.params.id;

    const result = await db.query(
      `
      DELETE FROM Home
      WHERE home_id = $1
      RETURNING *
      `,
      [homeId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Home not found" });
    }

    res.json({
      message: "Home deleted successfully",
      home: result.rows[0],
    });
  } catch (error) {
    console.error("DELETE HOME ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.deleteDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;

    const result = await db.query(
      `
      DELETE FROM Device
      WHERE device_id = $1
      RETURNING *
      `,
      [deviceId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({
      message: "Device deleted successfully",
      device: result.rows[0],
    });
  } catch (error) {
    console.error("DELETE DEVICE ERROR:", error.message);
    sendDbError(res, error);
  }
};
