let allSensors = [];

document.addEventListener("DOMContentLoaded", () => {
  const sensorMessage = document.getElementById("sensorMessage");
  const selectedDevice = document.getElementById("selectedDevice");
  const sensorFilter = document.getElementById("sensorFilter");
  const createDefaultSensorsBtn = document.getElementById("createDefaultSensorsBtn");

  const device_id = localStorage.getItem("device_id");
  const device_type = localStorage.getItem("device_type");

  if (!device_id) {
    setMessage(sensorMessage, "No device selected.", "error");
    return;
  }

  selectedDevice.textContent = `Selected Device: ${formatLabel(device_type)}`;

  loadSensors();

  sensorFilter.addEventListener("input", () => {
    renderSensors(allSensors, sensorFilter.value);
  });

  createDefaultSensorsBtn.addEventListener("click", createDefaultSensors);
});

async function loadSensors() {
  const device_id = localStorage.getItem("device_id");
  const sensorFilter = document.getElementById("sensorFilter");
  const sensorMessage = document.getElementById("sensorMessage");
  const createDefaultSensorsBtn = document.getElementById("createDefaultSensorsBtn");

  try {
    const response = await fetch(`/sensors/${device_id}`);
    allSensors = await response.json();
    renderSensors(allSensors, sensorFilter.value);

    if (allSensors.length === 0) {
      createDefaultSensorsBtn.hidden = false;
      setMessage(
        sensorMessage,
        "No sensors found. New devices get default sensors automatically.",
        "warning",
      );
    } else {
      createDefaultSensorsBtn.hidden = true;
      setMessage(sensorMessage, "", "");
    }
  } catch (err) {
    console.error("Error loading sensors:", err);
  }
}

async function createDefaultSensors() {
  const device_id = localStorage.getItem("device_id");
  const sensorMessage = document.getElementById("sensorMessage");
  const createDefaultSensorsBtn = document.getElementById("createDefaultSensorsBtn");

  try {
    createDefaultSensorsBtn.disabled = true;
    setMessage(sensorMessage, "Creating default sensors...", "warning");

    const response = await fetch(`/devices/${device_id}/default-sensors`, {
      method: "POST",
    });
    const result = await response.json();

    if (response.ok) {
      await loadSensors();
      setMessage(sensorMessage, result.message, "good");
      return;
    }

    setMessage(sensorMessage, result.error || "Failed to create default sensors.", "error");
  } catch (err) {
    console.error(err);
    setMessage(sensorMessage, "Server error.", "error");
  } finally {
    createDefaultSensorsBtn.disabled = false;
  }
}

function renderSensors(sensors, filterText = "") {
  const sensorList = document.getElementById("sensorList");
  sensorList.innerHTML = "";

  const filteredSensors = sensors.filter((sensor) => {
    const sensorType = sensor.sensor_type.toLowerCase();
    const displayType = formatLabel(sensor.sensor_type).toLowerCase();
    const searchText = filterText.toLowerCase();
    return sensorType.includes(searchText) || displayType.includes(searchText);
  });

  filteredSensors.forEach((sensor) => {
    const li = document.createElement("li");
    li.className = "list-row";

    const details = createDetailList([
      { label: "Sensor", value: formatLabel(sensor.sensor_type), primary: true },
      { label: "Unit", value: sensor.unit },
      {
        label: "Range",
        value: `${sensor.normal_min ?? "N/A"} - ${sensor.normal_max ?? "N/A"}`,
      },
      {
        label: "State",
        value: sensor.is_active ? "Active" : "Inactive",
        tone: getTone(sensor.is_active ? "active" : "inactive"),
      },
    ]);

    const actions = document.createElement("span");
    actions.className = "list-actions";

    const openBtn = document.createElement("button");
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", () => {
      localStorage.setItem("sensor_id", sensor.sensor_id);
      localStorage.setItem("sensor_type", sensor.sensor_type);
      window.location.href = "/readings.html";
    });

    actions.appendChild(openBtn);

    li.appendChild(details);
    li.appendChild(actions);

    sensorList.appendChild(li);
  });
}
