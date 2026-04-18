let allDevices = [];

document.addEventListener("DOMContentLoaded", () => {
  const deviceForm = document.getElementById("deviceForm");
  const deviceMessage = document.getElementById("deviceMessage");
  const selectedRoom = document.getElementById("selectedRoom");
  const deviceFilter = document.getElementById("deviceFilter");

  const room_id = localStorage.getItem("room_id");
  const room_name = localStorage.getItem("room_name");
  const roleId = localStorage.getItem("role_id");
  window.canChangeDeviceState = roleId === "1" || roleId === "3";

  if (!room_id) {
    setMessage(deviceMessage, "No room selected.", "error");
    return;
  }

  selectedRoom.textContent = `Selected Room: ${room_name}`;

  loadDevices();

  deviceFilter.addEventListener("input", () => {
    renderDevices(allDevices, deviceFilter.value);
  });

  deviceForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      room_id,
      device_type: deviceForm.device_type.value,
      brand_model: deviceForm.brand_model.value,
      serial_no: deviceForm.serial_no.value,
      status: deviceForm.status.value,
    };

    try {
      const response = await fetch("/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(deviceMessage, result.message || "Device created successfully!", "good");
        deviceForm.reset();
        loadDevices();
      } else {
        setMessage(deviceMessage, result.error || "Failed to create device.", "error");
      }
    } catch (err) {
      console.error(err);
      setMessage(deviceMessage, "Server error.", "error");
    }
  });
});

async function loadDevices() {
  const room_id = localStorage.getItem("room_id");
  const deviceFilter = document.getElementById("deviceFilter");

  try {
    const response = await fetch(`/devices/${room_id}`);
    allDevices = await response.json();
    renderDevices(allDevices, deviceFilter.value);
  } catch (err) {
    console.error("Error loading devices:", err);
  }
}

function renderDevices(devices, filterText = "") {
  const deviceList = document.getElementById("deviceList");
  deviceList.innerHTML = "";

  const filteredDevices = devices.filter((device) => {
    const deviceType = device.device_type.toLowerCase();
    const displayType = formatLabel(device.device_type).toLowerCase();
    const searchText = filterText.toLowerCase();
    return deviceType.includes(searchText) || displayType.includes(searchText);
  });

  filteredDevices.forEach((device) => {
    const li = document.createElement("li");
    li.className = "list-row";

    const details = createDetailList([
      { label: "Device", value: formatLabel(device.device_type), primary: true },
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

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", async () => {
      try {
        const response = await fetch(`/devices/${device.device_id}`, {
          method: "DELETE",
        });

        const result = await response.json();

        if (response.ok) {
          loadDevices();
        } else {
          alert(result.error || "Failed to delete device");
        }
      } catch (err) {
        console.error(err);
        alert("Server error");
      }
    });

    const openBn = document.createElement("button");
    openBn.textContent = "Open";
    openBn.addEventListener("click", async () => {
      localStorage.setItem("device_id", device.device_id);
      localStorage.setItem("device_type", device.device_type);
      window.location.href = "/sensors.html";
    });

    const stateBtn = document.createElement("button");
    stateBtn.textContent = "Change State";
    stateBtn.addEventListener("click", async () => {
      const allowedStates = ["active", "inactive", "offline", "maintenance"];
      const currentState = device.status || "active";
      const newStatus = prompt(
        `Enter new state: ${allowedStates.join(", ")}`,
        currentState,
      );

      if (newStatus === null) return;

      const normalizedStatus = newStatus.trim().toLowerCase().replace(/[\s-]+/g, "_");

      if (!allowedStates.includes(normalizedStatus)) {
        alert("Please enter active, inactive, offline, or maintenance.");
        return;
      }

      try {
        const response = await fetch(`/devices/${device.device_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            device_type: device.device_type,
            brand_model: device.brand_model,
            status: normalizedStatus,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          loadDevices();
        } else {
          alert(result.error || "Failed to update device");
        }
      } catch (err) {
        console.error(err);
        alert("Server error");
      }
    });

    actions.appendChild(openBn);
    if (window.canChangeDeviceState) {
      actions.appendChild(stateBtn);
    }
    actions.appendChild(deleteBtn);

    li.appendChild(details);
    li.appendChild(actions);

    deviceList.appendChild(li);
  });
}
