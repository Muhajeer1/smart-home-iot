const db = require("../db");
const { normalizeKey, sendDbError, validateEnum } = require("../utils/http");

const DEVICE_STATUSES = ["active", "inactive", "offline", "maintenance"];

exports.getAllDevices = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT * FROM Device
      ORDER BY device_id DESC
      `,
    );

    res.json(result.rows);
  } catch (err) {
    console.error("TECH GET DEVICES ERROR:", err.message);
    sendDbError(res, err);
  }
};

exports.getAllSensors = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT s.sensor_id, s.sensor_type, s.unit, s.normal_min, s.normal_max,
             d.device_type, d.serial_no,
             r.room_name,
             h.home_name
      FROM Sensor s
      JOIN Device d ON s.device_id = d.device_id
      JOIN Room r ON d.room_id = r.room_id
      JOIN Home h ON r.home_id = h.home_id
      ORDER BY s.sensor_id DESC
      `,
    );

    res.json(result.rows);
  } catch (err) {
    console.error("TECH GET SENSORS ERROR:", err.message);
    sendDbError(res, err);
  }
};

exports.updateDeviceStatus = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const status = normalizeKey(req.body.status);

    if (!validateEnum(res, status, DEVICE_STATUSES, "status")) {
      return;
    }

    const result = await db.query(
      `
      UPDATE Device
      SET status = $1
      WHERE device_id = $2
      RETURNING *
      `,
      [status, deviceId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Device not found" });
    }

    res.json({
      message: "Device status updated successfully",
      device: result.rows[0],
    });
  } catch (err) {
    console.error("TECH UPDATE DEVICE ERROR:", err.message);
    sendDbError(res, err);
  }
};
