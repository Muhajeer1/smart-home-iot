const { Pool } = require("pg");

const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "smart_home_iot",
  port: Number(process.env.DB_PORT || 5432),
});

db.connect((err) => {
  if (err) {
    console.log("DB error:", err.message);
  } else {
    console.log("Database connected");
  }
});

module.exports = db;
