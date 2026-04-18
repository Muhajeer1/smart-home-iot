const db = require("../db");
const { createEvent } = require("../services/eventService");
const {
  normalizeText,
  normalizeKey,
  requireFields,
  sendDbError,
  validateEnum,
  validateNumber,
} = require("../utils/http");

const SENSOR_TYPES = [
  "temperature",
  "humidity",
  "motion",
  "smoke",
  "light",
  "energy",
  "open_close",
];

exports.getSensorsByDevice = async (req, res) => {
  try {
    const deviceId = req.params.deviceId;

    const result = await db.query(
      `
    SELECT * FROM Sensor
    WHERE device_id = $1
    ORDER BY sensor_id DESC
        `,
      [deviceId],
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    sendDbError(res, error);
  }
};

exports.createSensor = async (req, res) => {
  try {
    const device_id = req.body.device_id;
    const sensor_type = normalizeKey(req.body.sensor_type);
    const unit = normalizeText(req.body.unit);
    const normal_min = req.body.normal_min;
    const normal_max = req.body.normal_max;
    const is_active = req.body.is_active;

    if (
      !requireFields(res, [
        { label: "Device", value: device_id },
        { label: "Sensor type", value: sensor_type },
        { label: "Unit", value: unit },
        { label: "Normal minimum", value: normal_min },
        { label: "Normal maximum", value: normal_max },
      ])
    ) {
      return;
    }

    if (
      !validateEnum(res, sensor_type, SENSOR_TYPES, "sensor type") ||
      !validateNumber(res, normal_min, "Normal minimum") ||
      !validateNumber(res, normal_max, "Normal maximum")
    ) {
      return;
    }

    if (Number(normal_min) > Number(normal_max)) {
      return res.status(400).json({
        error: "Normal minimum must be less than or equal to normal maximum.",
      });
    }

    const result = await db.query(
      `
      INSERT INTO Sensor (device_id, sensor_type, unit, normal_min, normal_max, is_active)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [device_id, sensor_type, unit, normal_min, normal_max, is_active],
    );

    const sensor = result.rows[0];

    const homeResult = await db.query(
      `
      SELECT r.home_id
      FROM Device d
      JOIN Room r ON d.room_id = r.room_id
      WHERE d.device_id = $1
      `,
      [sensor.device_id],
    );

    const home_id = homeResult.rows[0]?.home_id || null;

    await createEvent(
      home_id,
      sensor.device_id,
      "sensor_created",
      `Sensor "${sensor.sensor_type}" was created`,
    );

    res.status(201).json({
      message: "Sensor created successfully",
      sensor,
    });
  } catch (error) {
    console.error("SENSOR ERROR:", error.message);
    sendDbError(res, error);
  }
};

exports.deleteSensor = async (req, res) => {
  try {
    const sensorId = req.params.id;

    const result = await db.query(
      `
      DELETE FROM Sensor
      WHERE sensor_id = $1
      RETURNING *
      `,
      [sensorId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Sensor not found" });
    }

    res.json({
      message: "Sensor deleted successfully",
      sensor: result.rows[0],
    });
  } catch (error) {
    console.error("DELETE SENSOR ERROR:", error.message);
    sendDbError(res, error);
  }
};
