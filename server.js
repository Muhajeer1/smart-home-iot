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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
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

app.listen(3000, () => {
  console.log("Server running");
});
