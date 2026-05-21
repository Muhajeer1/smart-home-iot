const db = require("../db");
const { sendDbError } = require("../utils/http");

exports.getAllEvents = async (req, res) => {
  try {
    const userId = req.query.userId;
    const roleId = String(req.query.roleId || "");
    const params = [];
    const where = [];

    if (roleId !== "1" && roleId !== "3") {
      params.push(userId || null);
      where.push(`h.owner_user_id = $${params.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const result = await db.query(
      `
      SELECT e.event_id, e.home_id, e.device_id, e.event_type, e.event_time, e.description,
             h.home_name,
             d.device_type
      FROM Event e
      LEFT JOIN Home h ON e.home_id = h.home_id
      LEFT JOIN Device d ON e.device_id = d.device_id
      ${whereSql}
      ORDER BY e.event_time DESC
      `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET ALL EVENTS ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getEventsByHome = async (req, res) => {
  try {
    const homeId = req.params.homeId;

    const result = await db.query(
      `
      SELECT e.event_id, e.home_id, e.device_id, e.event_type, e.event_time, e.description,
             h.home_name,
             d.device_type
      FROM Event e
      LEFT JOIN Home h ON e.home_id = h.home_id
      LEFT JOIN Device d ON e.device_id = d.device_id
      WHERE e.home_id = $1
      ORDER BY e.event_time DESC
      `,
      [homeId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET EVENTS BY HOME ERROR:", error.message);
    sendDbError(res, error);
  }
};
