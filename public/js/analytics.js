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
    "Hide Summary",
    "Show Summary",
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

  loadDevicesPerHome();
  loadLatestReadings();
  loadAbnormalReadings();
  loadAlertSummary();
  loadAverageReadings();
  loadRoomsPerHome();
});

function analyticsScopeQuery() {
  const userId = localStorage.getItem("user_id") || "";
  const roleId = localStorage.getItem("role_id") || "";

  return `userId=${encodeURIComponent(userId)}&roleId=${encodeURIComponent(roleId)}`;
}

async function loadDevicesPerHome() {
  try {
    const response = await fetch(`/analytics/devices-per-home?${analyticsScopeQuery()}`);
    const data = await response.json();

    const list = document.getElementById("devicesPerHomeList");
    list.innerHTML = "";

    appendBarChart(list, data, {
      nameKey: "home_name",
      valueKey: "device_count",
    });
  } catch (err) {
    console.error("Devices per home error:", err);
  }
}

async function loadLatestReadings() {
  try {
    const response = await fetch(`/analytics/latest-readings?${analyticsScopeQuery()}`);
    const data = await response.json();

    const list = document.getElementById("latestReadingsList");
    list.innerHTML = "";

    data.forEach((row) => {
      list.appendChild(
        createReportRow(
          formatLabel(row.sensor_type),
          [
            { label: "Device", value: formatLabel(row.device_type) },
            { label: "Home", value: row.home_name },
            { label: "Room", value: row.room_name },
            { label: "Time", value: new Date(row.reading_time).toLocaleString() },
          ],
          row.reading_value,
        ),
      );
    });
  } catch (err) {
    console.error("Latest readings error:", err);
  }
}

async function loadAbnormalReadings() {
  try {
    const response = await fetch(`/analytics/abnormal-readings?${analyticsScopeQuery()}`);
    const data = await response.json();

    const list = document.getElementById("abnormalReadingsList");
    list.innerHTML = "";

    data.forEach((row) => {
      const lastAbnormalTime = row.last_abnormal_time
        ? new Date(row.last_abnormal_time).toLocaleString()
        : "N/A";

      list.appendChild(
        createReportRow(
          formatLabel(row.sensor_type),
          [
            { label: "Device", value: formatLabel(row.device_type) },
            { label: "Home", value: row.home_name },
            { label: "Room", value: row.room_name },
            { label: "Last", value: lastAbnormalTime },
            { label: "Range", value: `${row.normal_min} - ${row.normal_max}` },
            { label: "Min / Max", value: `${row.min_abnormal_value} / ${row.max_abnormal_value}` },
          ],
          `${row.abnormal_count} abnormal`,
        ),
      );
    });

  } catch (err) {
    console.error("Abnormal readings error:", err);
  }
}

async function loadAlertSummary() {
  try {
    const response = await fetch(`/analytics/alert-summary?${analyticsScopeQuery()}`);
    const data = await response.json();

    const list = document.getElementById("alertSummaryList");
    list.innerHTML = "";

    appendBarChart(list, data, {
      nameFormatter: (row) => formatLabel(row.alert_type),
      valueKey: "alert_count",
    });
  } catch (err) {
    console.error("Alert summary error:", err);
  }
}

async function loadAverageReadings() {
  try {
    const response = await fetch(
      `/analytics/average-reading-by-sensor-type?${analyticsScopeQuery()}`,
    );
    const data = await response.json();

    const list = document.getElementById("averageReadingsList");
    list.innerHTML = "";

    appendBarChart(list, data, {
      nameFormatter: (row) => formatLabel(row.sensor_type),
      valueKey: "average_reading_value",
      valueFormatter: (value) => value.toFixed(2),
    });
  } catch (err) {
    console.error("Average readings error:", err);
  }
}

async function loadRoomsPerHome() {
  try {
    const response = await fetch(`/analytics/rooms-per-home?${analyticsScopeQuery()}`);
    const data = await response.json();

    const list = document.getElementById("roomsPerHomeList");
    list.innerHTML = "";

    appendBarChart(list, data, {
      nameKey: "home_name",
      valueKey: "room_count",
    });
  } catch (err) {
    console.error("Rooms per home error:", err);
  }
}
