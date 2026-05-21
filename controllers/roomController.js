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
    const userId = req.query.userId;
    const roleId = String(req.query.roleId || "");
    const params = [homeId];
    const ownerSql =
      roleId === "1" || roleId === "3" ? "" : "AND h.owner_user_id = $2";

    if (ownerSql) {
      params.push(userId || null);
    }

    const result = await db.query(
      `
      SELECT r.*
      FROM Room r
      JOIN Home h ON r.home_id = h.home_id
      WHERE r.home_id = $1
      ${ownerSql}
      ORDER BY r.room_id DESC
      `,
      params,
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
    const userId = req.body.userId;
    const roleId = String(req.body.roleId || "");
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

    if (roleId !== "1" && roleId !== "3") {
      const ownerResult = await db.query(
        `
        SELECT 1
        FROM Home
        WHERE home_id = $1
          AND owner_user_id = $2
        `,
        [home_id, userId || null],
      );

      if (ownerResult.rows.length === 0) {
        return res.status(403).json({ error: "You can only add rooms to your own homes." });
      }
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
    const userId = req.query.userId;
    const roleId = String(req.query.roleId || "");
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
      UPDATE Room r
      SET room_name = $1, floor_no = $2
      FROM Home h
      WHERE r.home_id = h.home_id
        AND r.room_id = $3
        ${
          roleId === "1" || roleId === "3"
            ? ""
            : "AND h.owner_user_id = $4"
        }
      RETURNING r.*
      `,
      roleId === "1" || roleId === "3"
        ? [room_name, floor_no, roomId]
        : [room_name, floor_no, roomId, userId || null],
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
