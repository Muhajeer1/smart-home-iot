const db = require("../db");
const { createEvent } = require("../services/eventService");
const {
  normalizeText,
  requireFields,
  sendDbError,
  validateNumber,
} = require("../utils/http");

exports.getRoomsByHome = async (req, res) => {
  try {
    const homeId = req.params.homeId;

    const result = await db.query(
      `
      SELECT * FROM Room
      WHERE home_id = $1
      ORDER BY room_id DESC
      `,
      [homeId],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    sendDbError(res, err);
  }
};

exports.createRoom = async (req, res) => {
  try {
    const home_id = req.body.home_id;
    const room_name = normalizeText(req.body.room_name);
    const floor_no = req.body.floor_no;

    if (
      !requireFields(res, [
        { label: "Home", value: home_id },
        { label: "Room name", value: room_name },
        { label: "Floor number", value: floor_no },
      ])
    ) {
      return;
    }

    if (!validateNumber(res, floor_no, "Floor number")) {
      return;
    }

    const result = await db.query(
      `
      INSERT INTO Room (home_id, room_name, floor_no)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [home_id, room_name, floor_no],
    );

    const room = result.rows[0];

    await createEvent(
      room.home_id,
      null,
      "room_created",
      `Room "${room.room_name}" was created`,
    );

    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (err) {
    console.error("CREATE ROOM ERROR:", err.message);
    sendDbError(res, err);
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const roomId = req.params.id;
    const room_name = normalizeText(req.body.room_name);
    const floor_no = req.body.floor_no;

    if (
      !requireFields(res, [
        { label: "Room name", value: room_name },
        { label: "Floor number", value: floor_no },
      ])
    ) {
      return;
    }

    if (!validateNumber(res, floor_no, "Floor number")) {
      return;
    }

    const result = await db.query(
      `
      UPDATE Room
      SET room_name = $1, floor_no = $2
      WHERE room_id = $3
      RETURNING *
      `,
      [room_name, floor_no, roomId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Room not found" });
    }

    res.json({
      message: "Room updated successfully",
      room: result.rows[0],
    });
  } catch (err) {
    console.error("UPDATE ROOM ERROR:", err.message);
    sendDbError(res, err);
  }
};
