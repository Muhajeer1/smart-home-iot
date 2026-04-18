const db = require("../db");

async function createEvent(home_id, device_id, event_type, description) {
  try {
    await db.query(
      `
      INSERT INTO Event (home_id, device_id, event_type, event_time, description)
      VALUES ($1, $2, $3, NOW(), $4)
      `,
      [home_id, device_id || null, event_type, description || null],
    );
  } catch (error) {
    console.error("CREATE EVENT ERROR:", error.message);
  }
}

module.exports = { createEvent };
