const db = require("../db");
const { createDeviceAlert } = require("../services/alertService");
const { createEvent } = require("../services/eventService");
const { normalizeKey, sendDbError, validateEnum } = require("../utils/http");

const DEVICE_STATUSES = ["active", "inactive", "offline", "maintenance"];

function hasTechnicianAccess(req) {
  const roleId = String(req.query.roleId || req.body.roleId || "");
  return roleId === "1" || roleId === "3";
}

exports.getAllDevices = async (req, res) => {
  try {
    if (!hasTechnicianAccess(req)) {
      return res.status(403).json({ error: "Access denied." });
    }

    const result = await db.query(
      `
      SELECT d.device_id,
             d.room_id,
             d.device_type,
             d.brand_model,
             d.serial_no,
             d.installed_at,
             d.status,
             r.room_name,
             h.home_name
      FROM Device d
      JOIN Room r ON d.room_id = r.room_id
      JOIN Home h ON r.home_id = h.home_id
      ORDER BY h.home_name ASC, r.room_name ASC, d.device_id DESC
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
    if (!hasTechnicianAccess(req)) {
      return res.status(403).json({ error: "Access denied." });
    }

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
    if (!hasTechnicianAccess(req)) {
      return res.status(403).json({ error: "Access denied." });
    }

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
      await createDeviceAlert(home_id, device.device_id, "device_offline", "high");
    }

    if (device.status === "maintenance") {
      await createDeviceAlert(
        home_id,
        device.device_id,
        "maintenance_required",
        "medium",
      );
    }

    res.json({
      message: "Device status updated successfully",
      device,
    });
  } catch (err) {
    console.error("TECH UPDATE DEVICE ERROR:", err.message);
    sendDbError(res, err);
  }
};
