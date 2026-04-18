const db = require("../db");

async function createAlert(home_id, sensor_id, alert_type, severity) {
  try {
    const existing = await db.query(
      `
      SELECT alert_id
      FROM Alert
      WHERE home_id IS NOT DISTINCT FROM $1
        AND (sensor_id IS NOT DISTINCT FROM $2)
        AND alert_type = $3
        AND is_resolved = FALSE
      LIMIT 1
      `,
      [home_id, sensor_id || null, alert_type],
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const result = await db.query(
      `
      INSERT INTO Alert (home_id, sensor_id, alert_type, severity, created_at, is_resolved)
      VALUES ($1, $2, $3, $4, NOW(), FALSE)
      RETURNING *
      `,
      [home_id, sensor_id || null, alert_type, severity || null],
    );

    return result.rows[0];
  } catch (error) {
    console.error("CREATE ALERT ERROR:", error.message);
    return null;
  }
}

module.exports = { createAlert };
