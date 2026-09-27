const express = require("express");
const bodyParser = require("body-parser");
const { attachFrontend } = require("./utils/frontend");

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

const apiRoutes = express.Router();
apiRoutes.use(authRoutes);
apiRoutes.use(homeRoutes);
apiRoutes.use(roomRoutes);
apiRoutes.use(deviceRoutes);
apiRoutes.use(technicianRoutes);
apiRoutes.use(sensorRoutes);
apiRoutes.use(readingRoutes);
apiRoutes.use(adminRoutes);
apiRoutes.use(analyticsRoutes);
apiRoutes.use(eventRoutes);
apiRoutes.use(alertRoutes);

// The built React client uses the same /backend namespace as Vercel.
app.use("/backend", apiRoutes, (req, res) => {
  res.status(404).json({ error: "API endpoint not found." });
});
// Keep existing direct API paths for Vite, Vercel and API clients.
app.use(apiRoutes);
attachFrontend(app, { development: process.argv.includes("--frontend-dev") });

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
