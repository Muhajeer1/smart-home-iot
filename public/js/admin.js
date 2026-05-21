document.addEventListener("DOMContentLoaded", () => {
  const fullName = localStorage.getItem("full_name");
  const roleId = localStorage.getItem("role_id");

  if (roleId !== "1") {
    alert("Access denied");
    window.location.href = "/";
    return;
  }

  document.getElementById("adminUser").textContent =
    `Logged in as: ${fullName}`;

  loadUsers();
  loadHomes();
  loadDevices();
  initReadingSimulator(
    "adminSimulatorList",
    "adminSimulatorMessage",
    "adminBulkReadingCount",
    "adminBulkGenerateBtn",
  );

  document.getElementById("logoutLink").addEventListener("click", () => {
    localStorage.clear();
  });
});

async function loadUsers() {
  try {
    const roleId = localStorage.getItem("role_id") || "";
    const response = await fetch(`/admin/users?roleId=${encodeURIComponent(roleId)}`);
    const users = await response.json();

    const userList = document.getElementById("userList");
    userList.innerHTML = "";
    document.getElementById("adminUserCount").textContent = users.length;

    users.forEach((user) => {
      const li = document.createElement("li");
      li.className = "management-row";

      const details = createDetailList([
        { label: "User", value: user.full_name, primary: true },
        { label: "Email", value: user.email },
        { label: "Role", value: user.role_name },
      ]);

      const actions = document.createElement("span");
      actions.className = "list-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn-danger";
      deleteBtn.addEventListener("click", async () => {
        const confirmed = confirm(`Delete user ${user.full_name}?`);
        if (!confirmed) return;

        const roleId = localStorage.getItem("role_id") || "";
        const response = await fetch(
          `/admin/users/${user.user_id}?roleId=${encodeURIComponent(roleId)}`,
          {
          method: "DELETE",
          },
        );

        const result = await response.json();

        if (response.ok) {
          loadUsers();
          loadHomes();
        } else {
          alert(result.error || "Failed to delete user");
        }
      });

      actions.appendChild(deleteBtn);

      li.appendChild(details);
      li.appendChild(actions);
      userList.appendChild(li);
    });
  } catch (error) {
    console.error("LOAD USERS ERROR:", error);
  }
}

async function loadHomes() {
  try {
    const roleId = localStorage.getItem("role_id") || "";
    const response = await fetch(`/admin/homes?roleId=${encodeURIComponent(roleId)}`);
    const homes = await response.json();

    const homeList = document.getElementById("homeList");
    homeList.innerHTML = "";
    document.getElementById("adminHomeCount").textContent = homes.length;

    homes.forEach((home) => {
      const li = document.createElement("li");
      li.className = "management-row";

      const details = createDetailList([
        { label: "Home", value: home.home_name, primary: true },
        { label: "Owner", value: home.owner_name },
        { label: "Address", value: home.address_text },
      ]);

      const actions = document.createElement("span");
      actions.className = "list-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn-danger";
      deleteBtn.addEventListener("click", async () => {
        const confirmed = confirm(`Delete home ${home.home_name}?`);
        if (!confirmed) return;

        const roleId = localStorage.getItem("role_id") || "";
        const response = await fetch(
          `/admin/homes/${home.home_id}?roleId=${encodeURIComponent(roleId)}`,
          {
          method: "DELETE",
          },
        );

        const result = await response.json();

        if (response.ok) {
          loadHomes();
          loadDevices();
        } else {
          alert(result.error || "Failed to delete home");
        }
      });

      actions.appendChild(deleteBtn);

      li.appendChild(details);
      li.appendChild(actions);
      homeList.appendChild(li);
    });
  } catch (error) {
    console.error("LOAD HOMES ERROR:", error);
  }
}

async function loadDevices() {
  try {
    const roleId = localStorage.getItem("role_id") || "";
    const response = await fetch(`/admin/devices?roleId=${encodeURIComponent(roleId)}`);
    const devices = await response.json();

    const deviceList = document.getElementById("deviceList");
    deviceList.innerHTML = "";
    document.getElementById("adminDeviceCount").textContent = devices.length;

    devices.forEach((device) => {
      const li = document.createElement("li");
      li.className = "management-row";

      const details = createDetailList([
        { label: "Device", value: formatLabel(device.device_type), primary: true },
        { label: "Model", value: device.brand_model ?? "No model" },
        { label: "Serial", value: device.serial_no },
        {
          label: "Status",
          value: formatLabel(device.status),
          tone: getTone(device.status),
        },
        { label: "Room", value: device.room_name },
        { label: "Home", value: device.home_name },
      ]);

      const actions = document.createElement("span");
      actions.className = "list-actions";

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn-danger";
      deleteBtn.addEventListener("click", async () => {
        const confirmed = confirm(`Delete device ${formatLabel(device.device_type)}?`);
        if (!confirmed) return;

        const roleId = localStorage.getItem("role_id") || "";
        const response = await fetch(
          `/admin/devices/${device.device_id}?roleId=${encodeURIComponent(roleId)}`,
          {
          method: "DELETE",
          },
        );

        const result = await response.json();

        if (response.ok) {
          loadDevices();
        } else {
          alert(result.error || "Failed to delete device");
        }
      });

      actions.appendChild(deleteBtn);

      li.appendChild(details);
      li.appendChild(actions);
      deviceList.appendChild(li);
    });
  } catch (error) {
    console.error("LOAD DEVICES ERROR:", error);
  }
}
