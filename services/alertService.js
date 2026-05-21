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

async function createDeviceAlert(home_id, device_id, alert_type, severity) {
  try {
    const sensorResult = await db.query(
      `
      SELECT sensor_id
      FROM Sensor
      WHERE device_id = $1
      ORDER BY sensor_id ASC
      LIMIT 1
      `,
      [device_id],
    );

    const sensor_id = sensorResult.rows[0]?.sensor_id || null;
    return createAlert(home_id, sensor_id, alert_type, severity);
  } catch (error) {
    console.error("CREATE DEVICE ALERT ERROR:", error.message);
    return createAlert(home_id, null, alert_type, severity);
  }
}

module.exports = { createAlert, createDeviceAlert };
