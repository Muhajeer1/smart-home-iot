const db = require("../db");
const { sendDbError } = require("../utils/http");

exports.getDevicesPerHome = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT h.home_id, h.home_name, COUNT(d.device_id) AS device_count
      FROM Home h
      LEFT JOIN Room r ON h.home_id = r.home_id
      LEFT JOIN Device d ON r.room_id = d.room_id
      GROUP BY h.home_id, h.home_name
      ORDER BY h.home_id DESC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("DEVICES PER HOME ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getLatestReadings = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT s.sensor_id, s.sensor_type, sr.reading_value, sr.reading_time
      FROM Sensor s
      JOIN SensorReading sr ON s.sensor_id = sr.sensor_id
      WHERE sr.reading_time = (
        SELECT MAX(sr2.reading_time)
        FROM SensorReading sr2
        WHERE sr2.sensor_id = s.sensor_id
      )
      ORDER BY sr.reading_time DESC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("LATEST READINGS ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getAbnormalReadings = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT s.sensor_id, s.sensor_type, s.normal_min, s.normal_max,
             sr.reading_value, sr.reading_time
      FROM Sensor s
      JOIN SensorReading sr ON s.sensor_id = sr.sensor_id
      WHERE
        (s.normal_min IS NOT NULL AND sr.reading_value < s.normal_min)
        OR
        (s.normal_max IS NOT NULL AND sr.reading_value > s.normal_max)
      ORDER BY sr.reading_time DESC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("ABNORMAL READINGS ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getAlertSummaryByType = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT alert_type,
             COUNT(alert_id) AS alert_count
      FROM Alert
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY alert_type
      ORDER BY alert_count DESC, alert_type ASC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("ALERT SUMMARY ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getAverageReadingBySensorType = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT s.sensor_type,
             AVG(sr.reading_value) AS average_reading_value,
             COUNT(*) AS reading_count
      FROM Sensor s
      JOIN SensorReading sr ON s.sensor_id = sr.sensor_id
      GROUP BY s.sensor_type
      ORDER BY s.sensor_type ASC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("AVERAGE READING ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.getRoomsPerHome = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT h.home_id,
             h.home_name,
             COUNT(r.room_id) AS room_count
      FROM Home h
      LEFT JOIN Room r ON h.home_id = r.home_id
      GROUP BY h.home_id, h.home_name
      ORDER BY h.home_id DESC
      `,
    );

    res.json(result.rows);
  } catch (error) {
    console.error("ROOMS PER HOME ERROR:", error.message);
    sendDbError(res, error);
  }
};
