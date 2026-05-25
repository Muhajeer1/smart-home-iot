document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireCurrentUser();
  if (!user) return;

  if (!hasRole(user, ["technician"])) {
    alert("Access denied");
    window.location.href = "/";
    return;
  }

  document.getElementById("techUser").textContent = `Logged in as: ${user.full_name}`;

  loadDevicesForTechnician();
  initReadingSimulator(
    "techSimulatorList",
    "techSimulatorMessage",
    "techBulkReadingCount",
    "techBulkGenerateBtn",
  );
});

async function loadDevicesForTechnician() {
  try {
    const response = await fetch("/technician/devices");
    const devices = await response.json();
    const deviceList = document.getElementById("deviceList");

    deviceList.innerHTML = "";

    if (!response.ok || !Array.isArray(devices)) {
      document.getElementById("techDeviceCount").textContent = 0;
      document.getElementById("techOfflineCount").textContent = 0;
      document.getElementById("techMaintenanceCount").textContent = 0;
      alert(devices.error || "Failed to load technician devices");
      return;
    }

    document.getElementById("techDeviceCount").textContent = devices.length;
    document.getElementById("techOfflineCount").textContent = devices.filter(
      (device) => device.status === "offline",
    ).length;
    document.getElementById("techMaintenanceCount").textContent = devices.filter(
      (device) => device.status === "maintenance",
    ).length;

    devices.forEach((device) => {
      const li = document.createElement("li");
      li.className = "management-row operation-row";

      const details = createDetailList([
        { label: "Device", value: formatLabel(device.device_type), primary: true },
        { label: "Home", value: device.home_name },
        { label: "Room", value: device.room_name },
        { label: "Model", value: device.brand_model ?? "No model" },
        { label: "Serial", value: device.serial_no },
        {
          label: "Status",
          value: formatLabel(device.status),
          tone: getTone(device.status),
        },
      ]);

      const actions = document.createElement("span");
      actions.className = "list-actions";

      const activeBtn = document.createElement("button");
      activeBtn.textContent = "Set Active";
      activeBtn.className = "btn-secondary";
      activeBtn.addEventListener("click", () =>
        updateDeviceStatus(device.device_id, "active"),
      );

      const maintenanceBtn = document.createElement("button");
      maintenanceBtn.textContent = "Set Maintenance";
      maintenanceBtn.className = "btn-secondary";
      maintenanceBtn.addEventListener("click", () =>
        updateDeviceStatus(device.device_id, "maintenance"),
      );

      const offlineBtn = document.createElement("button");
      offlineBtn.textContent = "Set Offline";
      offlineBtn.className = "btn-danger";
      offlineBtn.addEventListener("click", () =>
        updateDeviceStatus(device.device_id, "offline"),
      );

      actions.appendChild(activeBtn);
      actions.appendChild(maintenanceBtn);
      actions.appendChild(offlineBtn);

      li.appendChild(details);
      li.appendChild(actions);

      deviceList.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading devices:", err);
  }
}

async function updateDeviceStatus(deviceId, newStatus) {
  try {
    const response = await fetch(`/technician/devices/${deviceId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    const result = await response.json();

    if (response.ok) {
      loadDevicesForTechnician();
    } else {
      alert(result.error || "Failed to update device");
    }
  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}
