const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");

const authRoutes = require("./routes/authRoutes");
const homeRoutes = require("./routes/homeRoutes");
const roomRoutes = require("./routes/roomRoutes");
const deviceRoutes = require("./routes/deviceRoutes");
const technicianRoutes = require("./routes/technicianRoutes");
const sensorRoutes = require("./routes/sensorRoutes");
const readingRoutes = require("./routes/readingRoutes");
const adminRoutes = require("./routes/adminRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const eventRoutes = require("./routes/eventRoutes");
const alertRoutes = require("./routes/alertRoutes");

const app = express();

const pageRoutes = {
  "/dashboard": "dashboard.html",
  "/admin": "admin.html",
  "/technician": "technician.html",
  "/homes": "homes.html",
  "/rooms": "rooms.html",
  "/devices": "devices.html",
  "/sensors": "sensors.html",
  "/readings": "readings.html",
  "/analytics": "analytics.html",
  "/activity": "events.html",
  "/alert-center": "alerts.html",
};

const legacyPageRedirects = {
  "/index.html": "/",
  "/dashboard.html": "/dashboard",
  "/admin.html": "/admin",
  "/technician.html": "/technician",
  "/homes.html": "/homes",
  "/rooms.html": "/rooms",
  "/devices.html": "/devices",
  "/sensors.html": "/sensors",
  "/readings.html": "/readings",
  "/analytics.html": "/analytics",
  "/events.html": "/activity",
  "/alerts.html": "/alert-center",
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

Object.entries(legacyPageRedirects).forEach(([legacyRoute, cleanRoute]) => {
  app.get(legacyRoute, (req, res) => {
    res.redirect(301, cleanRoute);
  });
});

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

Object.entries(pageRoutes).forEach(([route, fileName]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, "public", fileName));
  });
});

app.use(authRoutes);
app.use(homeRoutes);
app.use(roomRoutes);
app.use(deviceRoutes);
app.use(technicianRoutes);
app.use(sensorRoutes);
app.use(readingRoutes);
app.use(adminRoutes);
app.use(analyticsRoutes);
app.use(eventRoutes);
app.use(alertRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
