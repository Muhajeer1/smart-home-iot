document.addEventListener("DOMContentLoaded", () => {
  const fullName = localStorage.getItem("full_name");
  document.getElementById("analyticsUser").textContent =
    `Logged in as: ${fullName}`;

  document
    .getElementById("loadDevicesPerHome")
    .addEventListener("click", loadDevicesPerHome);

  document
    .getElementById("loadLatestReadings")
    .addEventListener("click", loadLatestReadings);

  document
    .getElementById("loadAbnormalReadings")
    .addEventListener("click", loadAbnormalReadings);

  setupToggleButton(
    "toggleLatestReadings",
    "latestReadingsList",
    "Hide Readings",
    "Show Readings",
  );

  setupToggleButton(
    "toggleAbnormalReadings",
    "abnormalReadingsList",
    "Hide Readings",
    "Show Readings",
  );

  document
    .getElementById("loadAlertSummary")
    .addEventListener("click", loadAlertSummary);

  document
    .getElementById("loadAverageReadings")
    .addEventListener("click", loadAverageReadings);

  document
    .getElementById("loadRoomsPerHome")
    .addEventListener("click", loadRoomsPerHome);
});

async function loadDevicesPerHome() {
  try {
    const response = await fetch("/analytics/devices-per-home");
    const data = await response.json();

    const list = document.getElementById("devicesPerHomeList");
    list.innerHTML = "";

    data.forEach((row) => {
      const li = document.createElement("li");
      li.className = "list-row";
      li.appendChild(
        createDetailList([
          { label: "Home", value: row.home_name, primary: true },
          { label: "Devices", value: row.device_count },
        ]),
      );
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Devices per home error:", err);
  }
}

async function loadLatestReadings() {
  try {
    const response = await fetch("/analytics/latest-readings");
    const data = await response.json();

    const list = document.getElementById("latestReadingsList");
    list.innerHTML = "";

    data.forEach((row) => {
      const li = document.createElement("li");
      li.className = "list-row";
      li.appendChild(
        createDetailList([
          { label: "Sensor", value: formatLabel(row.sensor_type), primary: true },
          { label: "Value", value: row.reading_value },
          { label: "Time", value: new Date(row.reading_time).toLocaleString() },
        ]),
      );
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Latest readings error:", err);
  }
}

async function loadAbnormalReadings() {
  try {
    const response = await fetch("/analytics/abnormal-readings");
    const data = await response.json();

    const list = document.getElementById("abnormalReadingsList");
    list.innerHTML = "";

    data.forEach((row) => {
      const li = document.createElement("li");
      li.className = "list-row";
      li.appendChild(
        createDetailList([
          { label: "Sensor", value: formatLabel(row.sensor_type), primary: true },
          { label: "Value", value: row.reading_value },
          { label: "Normal Range", value: `${row.normal_min} - ${row.normal_max}` },
        ]),
      );
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Abnormal readings error:", err);
  }
}

async function loadAlertSummary() {
  try {
    const response = await fetch("/analytics/alert-summary");
    const data = await response.json();

    const list = document.getElementById("alertSummaryList");
    list.innerHTML = "";

    data.forEach((row) => {
      const li = document.createElement("li");
      li.className = "list-row";
      li.appendChild(
        createDetailList([
          { label: "Alert Type", value: formatLabel(row.alert_type), primary: true },
          { label: "Last 30 Days", value: row.alert_count },
        ]),
      );
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Alert summary error:", err);
  }
}

async function loadAverageReadings() {
  try {
    const response = await fetch("/analytics/average-reading-by-sensor-type");
    const data = await response.json();

    const list = document.getElementById("averageReadingsList");
    list.innerHTML = "";

    data.forEach((row) => {
      const average = Number(row.average_reading_value).toFixed(2);
      const li = document.createElement("li");
      li.className = "list-row";
      li.appendChild(
        createDetailList([
          { label: "Sensor Type", value: formatLabel(row.sensor_type), primary: true },
          { label: "Average Value", value: average },
          { label: "Readings", value: row.reading_count },
        ]),
      );
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Average readings error:", err);
  }
}

async function loadRoomsPerHome() {
  try {
    const response = await fetch("/analytics/rooms-per-home");
    const data = await response.json();

    const list = document.getElementById("roomsPerHomeList");
    list.innerHTML = "";

    data.forEach((row) => {
      const li = document.createElement("li");
      li.className = "list-row";
      li.appendChild(
        createDetailList([
          { label: "Home", value: row.home_name, primary: true },
          { label: "Rooms", value: row.room_count },
        ]),
      );
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Rooms per home error:", err);
  }
}
