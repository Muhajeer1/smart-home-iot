const db = require("../db");
const { normalizeKey, sendDbError, validateEnum } = require("../utils/http");

const ALERT_FILTERS = ["active", "resolved", "all"];

exports.getAlerts = async (req, res) => {
  try {
    const userId = req.query.userId;
    const roleId = String(req.query.roleId || "");
    const filter = normalizeKey(req.query.status || "active");

    if (!validateEnum(res, filter, ALERT_FILTERS, "alert filter")) {
      return;
    }

    const params = [];
    const where = [];

    if (filter === "active") {
      where.push("a.is_resolved = FALSE");
    }

    if (filter === "resolved") {
      where.push("a.is_resolved = TRUE");
    }

    if (roleId !== "1" && roleId !== "3") {
      if (!userId) {
        return res.status(400).json({ error: "User is required." });
      }

      params.push(userId);
      where.push(`h.owner_user_id = $${params.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

    const result = await db.query(
      `
      SELECT a.alert_id, a.home_id, a.sensor_id, a.alert_type, a.severity,
             a.created_at, a.is_resolved,
             h.home_name,
             s.sensor_type,
             d.device_type,
             r.room_name
      FROM Alert a
      LEFT JOIN Home h ON a.home_id = h.home_id
      LEFT JOIN Sensor s ON a.sensor_id = s.sensor_id
      LEFT JOIN Device d ON s.device_id = d.device_id
      LEFT JOIN Room r ON d.room_id = r.room_id
      ${whereSql}
      ORDER BY a.is_resolved ASC, a.created_at DESC
      `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("GET ALERTS ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.updateAlertResolution = async (req, res) => {
  try {
    const alertId = req.params.id;
    const isResolved = req.body.is_resolved === true || req.body.is_resolved === "true";

    const result = await db.query(
      `
      UPDATE Alert
      SET is_resolved = $1
      WHERE alert_id = $2
      RETURNING *
      `,
      [isResolved, alertId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json({
      message: isResolved ? "Alert resolved" : "Alert reopened",
      alert: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE ALERT ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.deleteAlert = async (req, res) => {
  try {
    const alertId = req.params.id;

    const result = await db.query(
      `
      DELETE FROM Alert
      WHERE alert_id = $1
      RETURNING *
      `,
      [alertId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Alert not found" });
    }

    res.json({
      message: "Alert deleted",
      alert: result.rows[0],
    });
  } catch (error) {
    console.error("DELETE ALERT ERROR:", error.message);
    sendDbError(res, error);
  }
};
