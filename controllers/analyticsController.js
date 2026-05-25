const db = require("../db");
const { sendDbError } = require("../utils/http");
const { hasRole } = require("../utils/roles");

function buildOwnerScope(req, homeAlias, params) {
  const homeId = req.query.homeId;
  const userId = req.user.user_id;
  const conditions = [];

  if (homeId) {
    params.push(homeId);
    conditions.push(`${homeAlias}.home_id = $${params.length}`);
  }

  if (!hasRole(req.user, ["admin", "technician"])) {
    params.push(userId || null);
    conditions.push(`${homeAlias}.owner_user_id = $${params.length}`);
  }

  return conditions.join(" AND ");
}

exports.getAnalyticsHomes = async (req, res) => {
  try {
    const params = [];
    const ownerScope = buildOwnerScope(req, "h", params);
    const whereSql = ownerScope ? `WHERE ${ownerScope}` : "";

    const result = await db.query(
      `
      SELECT h.home_id, h.home_name, h.address_text, u.full_name AS owner_name
      FROM Home h
      JOIN "User" u ON h.owner_user_id = u.user_id
      ${whereSql}
      ORDER BY h.home_name ASC, h.home_id ASC
      `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("ANALYTICS HOMES ERROR:", error.message);
    sendDbError(res, error);
  }
}

exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const result = await db.query(
      `
      SELECT COUNT(DISTINCT h.home_id) AS home_count,
             COUNT(DISTINCT r.room_id) AS room_count,
             COUNT(DISTINCT d.device_id) AS device_count
      FROM Home h
      LEFT JOIN Room r ON h.home_id = r.home_id
      LEFT JOIN Device d ON r.room_id = d.room_id
      WHERE h.owner_user_id = $1
      `,
      [userId],
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("DASHBOARD SUMMARY ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getDevicesPerHome = async (req, res) => {
  try {
    const params = [];
    const ownerScope = buildOwnerScope(req, "h", params);
    const whereSql = ownerScope ? `WHERE ${ownerScope}` : "";

    const result = await db.query(
      `
      SELECT h.home_id, h.home_name, COUNT(d.device_id) AS device_count
      FROM Home h
      LEFT JOIN Room r ON h.home_id = r.home_id
      LEFT JOIN Device d ON r.room_id = d.room_id
      ${whereSql}
      GROUP BY h.home_id, h.home_name
      ORDER BY h.home_id DESC
      `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("DEVICES PER HOME ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getLatestReadings = async (req, res) => {
  try {
    const params = [];
    const ownerScope = buildOwnerScope(req, "h", params);
    const ownerSql = ownerScope ? `AND ${ownerScope}` : "";

    const result = await db.query(
      `
      SELECT s.sensor_id,
             s.sensor_type,
             d.device_type,
             r.room_name,
             h.home_name,
             sr.reading_value,
             sr.reading_time
      FROM Sensor s
      JOIN SensorReading sr ON s.sensor_id = sr.sensor_id
      JOIN Device d ON s.device_id = d.device_id
      JOIN Room r ON d.room_id = r.room_id
      JOIN Home h ON r.home_id = h.home_id
      WHERE sr.reading_time = (
        SELECT MAX(sr2.reading_time)
        FROM SensorReading sr2
        WHERE sr2.sensor_id = s.sensor_id
      )
      ${ownerSql}
      ORDER BY sr.reading_time DESC
      `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("LATEST READINGS ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getAbnormalReadings = async (req, res) => {
  try {
    const params = [];
    const ownerScope = buildOwnerScope(req, "h", params);
    const ownerSql = ownerScope ? `AND ${ownerScope}` : "";

    const result = await db.query(
      `
      SELECT s.sensor_id,
             s.sensor_type,
             s.normal_min,
             s.normal_max,
             d.device_type,
             r.room_name,
             h.home_name,
             COUNT(sr.reading_id) AS abnormal_count,
             MAX(sr.reading_time) AS last_abnormal_time,
             MIN(sr.reading_value) AS min_abnormal_value,
             MAX(sr.reading_value) AS max_abnormal_value
      FROM Sensor s
      JOIN SensorReading sr ON s.sensor_id = sr.sensor_id
      JOIN Device d ON s.device_id = d.device_id
      JOIN Room r ON d.room_id = r.room_id
      JOIN Home h ON r.home_id = h.home_id
      WHERE
        (
          (s.normal_min IS NOT NULL AND sr.reading_value < s.normal_min)
          OR
          (s.normal_max IS NOT NULL AND sr.reading_value > s.normal_max)
        )
        ${ownerSql}
      GROUP BY s.sensor_id, s.sensor_type, s.normal_min, s.normal_max,
               d.device_type, r.room_name, h.home_name
      ORDER BY abnormal_count DESC, last_abnormal_time DESC
      `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("ABNORMAL READINGS ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getAlertSummaryByType = async (req, res) => {
  try {
    const params = [];
    const ownerScope = buildOwnerScope(req, "h", params);
    const ownerSql = ownerScope ? `AND ${ownerScope}` : "";

    const result = await db.query(
      `
      SELECT a.alert_type,
             COUNT(a.alert_id) AS alert_count
      FROM Alert a
      JOIN Home h ON a.home_id = h.home_id
      WHERE a.created_at >= NOW() - INTERVAL '30 days'
      ${ownerSql}
      GROUP BY a.alert_type
      ORDER BY alert_count DESC, a.alert_type ASC
      `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("ALERT SUMMARY ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getAverageReadingBySensorType = async (req, res) => {
  try {
    const params = [];
    const ownerScope = buildOwnerScope(req, "h", params);
    const whereSql = ownerScope ? `WHERE ${ownerScope}` : "";

    const result = await db.query(
      `
      SELECT s.sensor_type,
             AVG(sr.reading_value) AS average_reading_value,
             COUNT(*) AS reading_count
      FROM Sensor s
      JOIN SensorReading sr ON s.sensor_id = sr.sensor_id
      JOIN Device d ON s.device_id = d.device_id
      JOIN Room r ON d.room_id = r.room_id
      JOIN Home h ON r.home_id = h.home_id
      ${whereSql}
      GROUP BY s.sensor_type
      ORDER BY s.sensor_type ASC
      `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("AVERAGE READING ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getRoomsPerHome = async (req, res) => {
  try {
    const params = [];
    const ownerScope = buildOwnerScope(req, "h", params);
    const whereSql = ownerScope ? `WHERE ${ownerScope}` : "";

    const result = await db.query(
      `
      SELECT h.home_id,
             h.home_name,
             COUNT(r.room_id) AS room_count
      FROM Home h
      LEFT JOIN Room r ON h.home_id = r.home_id
      ${whereSql}
      GROUP BY h.home_id, h.home_name
      ORDER BY h.home_id DESC
      `,
      params,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("ROOMS PER HOME ERROR:", error.message);
    sendDbError(res, error);
  }
};
