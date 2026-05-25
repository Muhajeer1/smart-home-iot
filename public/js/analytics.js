document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireCurrentUser();
  if (!user) return;

  document.getElementById("analyticsUser").textContent =
    `Logged in as: ${user.full_name}`;

  document
    .getElementById("analyticsHomeFilter")
    .addEventListener("change", loadAllReports);

  document
    .getElementById("refreshAnalytics")
    .addEventListener("click", loadAllReports);

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

  await loadAnalyticsHomes();
  loadAllReports();
});

function getSelectedHomeQuery() {
  const homeId = document.getElementById("analyticsHomeFilter").value;
  return `?homeId=${encodeURIComponent(homeId)}`;
}

function loadAllReports() {
  loadDevicesPerHome();
  loadLatestReadings();
  loadAbnormalReadings();
  loadAlertSummary();
  loadAverageReadings();
  loadRoomsPerHome();
}

async function loadAnalyticsHomes() {
  const select = document.getElementById("analyticsHomeFilter");
  const message = document.getElementById("analyticsScopeMessage");

  try {
    const response = await fetch("/analytics/homes");
    const homes = await response.json();
    select.innerHTML = "";

    if (!response.ok || !Array.isArray(homes)) {
      setMessage(message, homes.error || "Failed to load homes for analytics.", "error");
      return;
    }

    homes.forEach((home) => {
      const option = document.createElement("option");
      option.value = home.home_id;
      option.textContent = home.owner_name
        ? `${home.home_name} (${home.owner_name})`
        : home.home_name;
      select.appendChild(option);
    });

    if (homes.length === 0) {
      setMessage(message, "No homes available for analytics yet.", "warning");
    }
  } catch (error) {
    console.error("LOAD ANALYTICS HOMES ERROR:", error);
    setMessage(message, "Server error while loading analytics homes.", "error");
  }
}

async function loadDevicesPerHome() {
  const list = document.getElementById("devicesPerHomeList");

  try {
    const response = await fetch(`/analytics/devices-per-home${getSelectedHomeQuery()}`);
    const data = await response.json();

    list.innerHTML = "";

    if (!response.ok || !Array.isArray(data)) {
      renderReportError(list, data.error || "Failed to load devices per home.");
      return;
    }

    appendBarChart(list, data, {
      nameKey: "home_name",
      valueKey: "device_count",
    });
  } catch (err) {
    console.error("Devices per home error:", err);
    renderReportError(list, "Server error while loading devices per home.");
  }
}

async function loadLatestReadings() {
  const list = document.getElementById("latestReadingsList");

  try {
    const response = await fetch(`/analytics/latest-readings${getSelectedHomeQuery()}`);
    const data = await response.json();

    list.innerHTML = "";

    if (!response.ok || !Array.isArray(data)) {
      renderReportError(list, data.error || "Failed to load latest readings.");
      return;
    }

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
    renderReportError(list, "Server error while loading latest readings.");
  }
}

async function loadAbnormalReadings() {
  const list = document.getElementById("abnormalReadingsList");

  try {
    const response = await fetch(`/analytics/abnormal-readings${getSelectedHomeQuery()}`);
    const data = await response.json();

    list.innerHTML = "";

    if (!response.ok || !Array.isArray(data)) {
      renderReportError(list, data.error || "Failed to load abnormal readings.");
      return;
    }

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
    renderReportError(list, "Server error while loading abnormal readings.");
  }
}

async function loadAlertSummary() {
  const list = document.getElementById("alertSummaryList");

  try {
    const response = await fetch(`/analytics/alert-summary${getSelectedHomeQuery()}`);
    const data = await response.json();

    list.innerHTML = "";

    if (!response.ok || !Array.isArray(data)) {
      renderReportError(list, data.error || "Failed to load alert summary.");
      return;
    }

    appendBarChart(list, data, {
      nameFormatter: (row) => formatLabel(row.alert_type),
      valueKey: "alert_count",
    });
  } catch (err) {
    console.error("Alert summary error:", err);
    renderReportError(list, "Server error while loading alert summary.");
  }
}

async function loadAverageReadings() {
  const list = document.getElementById("averageReadingsList");

  try {
    const response = await fetch(
      `/analytics/average-reading-by-sensor-type${getSelectedHomeQuery()}`,
    );
    const data = await response.json();

    list.innerHTML = "";

    if (!response.ok || !Array.isArray(data)) {
      renderReportError(list, data.error || "Failed to load average readings.");
      return;
    }

    appendBarChart(list, data, {
      nameFormatter: (row) => formatLabel(row.sensor_type),
      valueKey: "average_reading_value",
      valueFormatter: (value) => value.toFixed(2),
    });
  } catch (err) {
    console.error("Average readings error:", err);
    renderReportError(list, "Server error while loading average readings.");
  }
}

async function loadRoomsPerHome() {
  const list = document.getElementById("roomsPerHomeList");

  try {
    const response = await fetch(`/analytics/rooms-per-home${getSelectedHomeQuery()}`);
    const data = await response.json();

    list.innerHTML = "";

    if (!response.ok || !Array.isArray(data)) {
      renderReportError(list, data.error || "Failed to load rooms per home.");
      return;
    }

    appendBarChart(list, data, {
      nameKey: "home_name",
      valueKey: "room_count",
    });
  } catch (err) {
    console.error("Rooms per home error:", err);
    renderReportError(list, "Server error while loading rooms per home.");
  }
}

function renderReportError(list, message) {
  list.innerHTML = "";
  const item = document.createElement("li");
  item.className = "report-row";
  item.textContent = message;
  list.appendChild(item);
}
