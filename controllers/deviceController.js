const db = require("../db");
const { createEvent } = require("../services/eventService");
const { createAlert } = require("../services/alertService");
const {
  normalizeText,
  normalizeKey,
  requireFields,
  sendDbError,
  validateEnum,
} = require("../utils/http");

const DEVICE_TYPES = [
  "thermostat",
  "camera",
  "smart_lock",
  "smoke_detector",
  "light",
  "smart_plug",
  "motion_detector",
];
const DEVICE_STATUSES = ["active", "inactive", "offline", "maintenance"];
const DEFAULT_SENSORS_BY_DEVICE = {
  thermostat: [
    { sensor_type: "temperature", unit: "C", normal_min: 18, normal_max: 26 },
    { sensor_type: "humidity", unit: "%", normal_min: 30, normal_max: 60 },
  ],
  camera: [
    { sensor_type: "motion", unit: "state", normal_min: 0, normal_max: 1 },
    { sensor_type: "light", unit: "lux", normal_min: 50, normal_max: 900 },
  ],
  smart_lock: [
    { sensor_type: "open_close", unit: "state", normal_min: 0, normal_max: 1 },
  ],
  smoke_detector: [
    { sensor_type: "smoke", unit: "ppm", normal_min: 0, normal_max: 10 },
    { sensor_type: "temperature", unit: "C", normal_min: 0, normal_max: 60 },
  ],
  light: [
    { sensor_type: "light", unit: "lux", normal_min: 100, normal_max: 800 },
    { sensor_type: "energy", unit: "kWh", normal_min: 0, normal_max: 2.5 },
  ],
  smart_plug: [
    { sensor_type: "energy", unit: "kWh", normal_min: 0, normal_max: 2.5 },
  ],
  motion_detector: [
    { sensor_type: "motion", unit: "state", normal_min: 0, normal_max: 1 },
    { sensor_type: "light", unit: "lux", normal_min: 50, normal_max: 900 },
  ],
};

async function createDefaultSensors(client, device) {
  const sensors = DEFAULT_SENSORS_BY_DEVICE[device.device_type] || [];
  const existingResult = await client.query(
    `
    SELECT sensor_type
    FROM Sensor
    WHERE device_id = $1
    `,
    [device.device_id],
  );
  const existingTypes = new Set(existingResult.rows.map((row) => row.sensor_type));
  let createdCount = 0;

  for (const sensor of sensors) {
    if (existingTypes.has(sensor.sensor_type)) {
      continue;
    }

    await client.query(
      `
      INSERT INTO Sensor (device_id, sensor_type, unit, normal_min, normal_max, is_active)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      `,
      [
        device.device_id,
        sensor.sensor_type,
        sensor.unit,
        sensor.normal_min,
        sensor.normal_max,
      ],
    );
    createdCount += 1;
  }

  return createdCount;
}

exports.getDevicesByRoom = async (req, res) => {
  try {
    const roomId = req.params.roomId;

    const result = await db.query(
      `
      SELECT * FROM Device
      WHERE room_id = $1
      ORDER BY device_id DESC
      `,
      [roomId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET DEVICES ERROR:", err.message);
    sendDbError(res, err);
  }
};

exports.createDefaultSensorsForDevice = async (req, res) => {
  const client = await db.connect();

  try {
    const deviceId = req.params.id;

    await client.query("BEGIN");

    const deviceResult = await client.query(
      `
      SELECT device_id, device_type
      FROM Device
      WHERE device_id = $1
      `,
      [deviceId],
    );

    if (deviceResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Device not found" });
    }

    const device = deviceResult.rows[0];
    const sensorCount = await createDefaultSensors(client, device);

    await client.query("COMMIT");

    res.status(201).json({
      message:
        sensorCount > 0
          ? `${sensorCount} default sensors created.`
          : "Default sensors already exist for this device.",
      sensor_count: sensorCount,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE DEFAULT SENSORS ERROR:", err.message);
    sendDbError(res, err);
  } finally {
    client.release();
  }
};

exports.createDevice = async (req, res) => {
  const client = await db.connect();

  try {
    const room_id = req.body.room_id;
    const device_type = normalizeKey(req.body.device_type);
    const brand_model = normalizeText(req.body.brand_model);
    const serial_no = normalizeText(req.body.serial_no);
    const status = normalizeKey(req.body.status);

    if (
      !requireFields(res, [
        { label: "Room", value: room_id },
        { label: "Device type", value: device_type },
        { label: "Brand / Model", value: brand_model },
        { label: "Serial number", value: serial_no },
        { label: "Status", value: status },
      ])
    ) {
      return;
    }

    if (
      !validateEnum(res, device_type, DEVICE_TYPES, "device type") ||
      !validateEnum(res, status, DEVICE_STATUSES, "status")
    ) {
      return;
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO Device (room_id, device_type, brand_model, serial_no, installed_at, status)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING *
      `,
      [room_id, device_type, brand_model, serial_no, status],
    );

    const device = result.rows[0];
    const sensorCount = await createDefaultSensors(client, device);

    const homeResult = await client.query(
      `
      SELECT home_id
      FROM Room
      WHERE room_id = $1
      `,
      [device.room_id],
    );

    const home_id = homeResult.rows[0]?.home_id || null;

    await client.query(
      `
      INSERT INTO Event (home_id, device_id, event_type, event_time, description)
      VALUES ($1, $2, $3, NOW(), $4)
      `,
      [
        home_id,
        device.device_id,
        "device_created",
        `Device "${device.device_type}" was created with ${sensorCount} default sensors`,
      ],
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: `Device created successfully with ${sensorCount} default sensors`,
      device,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("CREATE DEVICE ERROR:", err.message);
    sendDbError(res, err);
  } finally {
    client.release();
  }
};

exports.updateDevice = async (req, res) => {
  try {
    const deviceId = req.params.id;
    const device_type = normalizeKey(req.body.device_type);
    const brand_model = normalizeText(req.body.brand_model);
    const status = normalizeKey(req.body.status);

    if (
      !requireFields(res, [
        { label: "Device type", value: device_type },
        { label: "Brand / Model", value: brand_model },
        { label: "Status", value: status },
      ])
    ) {
      return;
    }

    if (
      !validateEnum(res, device_type, DEVICE_TYPES, "device type") ||
      !validateEnum(res, status, DEVICE_STATUSES, "status")
    ) {
      return;
    }

    const existingDevice = await db.query(
      `
      SELECT device_type
      FROM Device
      WHERE device_id = $1
      `,
      [deviceId],
    );

    if (existingDevice.rows.length === 0) {
      return res.status(404).json({ error: "Device not found" });
    }

    if (existingDevice.rows[0].device_type !== device_type) {
      return res.status(400).json({
        error: "Device type cannot be changed after default sensors are assigned.",
      });
    }

    const result = await db.query(
      `
      UPDATE Device
      SET device_type = $1,
          brand_model = $2,
          status = $3
      WHERE device_id = $4
      RETURNING *
      `,
      [device_type, brand_model, status, deviceId],
    );

    const device = result.rows[0];

    const homeResult = await db.query(
      `
      SELECT r.home_id
      FROM Room r
      JOIN Device d ON r.room_id = d.room_id
      WHERE d.device_id = $1
      `,
      [device.device_id],
    );

    const home_id = homeResult.rows[0]?.home_id || null;

    await createEvent(
      home_id,
      device.device_id,
      "device_status_changed",
      `Device "${device.device_type}" status changed to "${device.status}"`,
    );

    if (device.status === "offline") {
      await createAlert(home_id, null, "device_offline", "high");
    }

    if (device.status === "maintenance") {
      await createAlert(home_id, null, "maintenance_required", "medium");
    }

    res.json({
      message: "Device updated successfully",
      device,
    });
  } catch (err) {
    console.error("UPDATE DEVICE ERROR:", err.message);
    sendDbError(res, err);
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
  } catch (err) {
    console.error("DELETE DEVICE ERROR:", err.message);
    sendDbError(res, err);
  }
};
