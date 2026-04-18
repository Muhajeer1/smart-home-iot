document.addEventListener("DOMContentLoaded", () => {
  const fullName = localStorage.getItem("full_name");
  const roleId = localStorage.getItem("role_id");
  const alertFilter = document.getElementById("alertFilter");
  const backLink = document.getElementById("alertsBackLink");

  document.getElementById("alertsUser").textContent = `Logged in as: ${fullName}`;

  if (roleId === "1") {
    backLink.href = "/admin.html";
    backLink.textContent = "Back to Admin";
  } else if (roleId === "3") {
    backLink.href = "/technician.html";
    backLink.textContent = "Back to Technician";
  }

  alertFilter.addEventListener("change", loadAlerts);
  loadAlerts();
});

async function loadAlerts() {
  const userId = localStorage.getItem("user_id");
  const roleId = localStorage.getItem("role_id");
  const status = document.getElementById("alertFilter").value;
  const alertMessage = document.getElementById("alertMessage");
  const alertList = document.getElementById("alertList");

  alertList.innerHTML = "";
  setMessage(alertMessage, "", null);

  try {
    const response = await fetch(
      `/alerts?userId=${encodeURIComponent(userId || "")}&roleId=${encodeURIComponent(roleId || "")}&status=${encodeURIComponent(status)}`,
    );
    const alerts = await response.json();

    if (!response.ok) {
      setMessage(alertMessage, alerts.error || "Failed to load alerts.", "error");
      return;
    }

    if (alerts.length === 0) {
      setMessage(alertMessage, "No alerts found.", "good");
      return;
    }

    alerts.forEach((alert) => {
      const li = document.createElement("li");
      li.className = "list-row";

      const time = new Date(alert.created_at).toLocaleString();
      const resolvedLabel = alert.is_resolved ? "Resolved" : "Open";

      const details = createDetailList([
        {
          label: "Alert",
          value: formatLabel(alert.alert_type),
          primary: true,
          tone: getTone(alert.is_resolved ? "resolved" : alert.severity),
        },
        { label: "Severity", value: formatLabel(alert.severity), tone: getTone(alert.severity) },
        { label: "Status", value: resolvedLabel, tone: getTone(resolvedLabel) },
        { label: "Home", value: alert.home_name },
        { label: "Room", value: alert.room_name },
        { label: "Device", value: formatLabel(alert.device_type) },
        { label: "Sensor", value: formatLabel(alert.sensor_type) },
        { label: "Time", value: time },
      ]);

      const actions = document.createElement("span");
      actions.className = "list-actions";

      const toggleBtn = document.createElement("button");
      toggleBtn.textContent = alert.is_resolved ? "Reopen" : "Resolve";
      toggleBtn.addEventListener("click", () =>
        updateAlertResolution(alert.alert_id, !alert.is_resolved),
      );

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.className = "btn-danger";
      deleteBtn.addEventListener("click", () => deleteAlert(alert.alert_id));

      actions.appendChild(toggleBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(details);
      li.appendChild(actions);
      alertList.appendChild(li);
    });
  } catch (error) {
    console.error("LOAD ALERTS ERROR:", error);
    setMessage(alertMessage, "Server error.", "error");
  }
}

async function updateAlertResolution(alertId, isResolved) {
  const alertMessage = document.getElementById("alertMessage");

  try {
    const response = await fetch(`/alerts/${alertId}/resolve`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ is_resolved: isResolved }),
    });
    const result = await response.json();

    if (response.ok) {
      setMessage(alertMessage, result.message, "good");
      loadAlerts();
    } else {
      setMessage(alertMessage, result.error || "Failed to update alert.", "error");
    }
  } catch (error) {
    console.error("UPDATE ALERT ERROR:", error);
    setMessage(alertMessage, "Server error.", "error");
  }
}

async function deleteAlert(alertId) {
  const alertMessage = document.getElementById("alertMessage");
  const confirmed = confirm("Delete this alert?");

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(`/alerts/${alertId}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (response.ok) {
      setMessage(alertMessage, result.message, "good");
      loadAlerts();
    } else {
      setMessage(alertMessage, result.error || "Failed to delete alert.", "error");
    }
  } catch (error) {
    console.error("DELETE ALERT ERROR:", error);
    setMessage(alertMessage, "Server error.", "error");
  }
}
