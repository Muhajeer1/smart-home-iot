const db = require("../db");
const { sendDbError } = require("../utils/http");

exports.getAllEvents = async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT e.event_id, e.home_id, e.device_id, e.event_type, e.event_time, e.description,
             h.home_name,
             d.device_type
      FROM Event e
      LEFT JOIN Home h ON e.home_id = h.home_id
      LEFT JOIN Device d ON e.device_id = d.device_id
      ORDER BY e.event_time DESC
      `,
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
