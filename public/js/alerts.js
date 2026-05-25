document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireCurrentUser();
  if (!user) return;

  const fullName = user.full_name;
  const roleName = getRoleName(user);
  const alertFilter = document.getElementById("alertFilter");
  const backLink = document.getElementById("alertsBackLink");

  document.getElementById("alertsUser").textContent = `Logged in as: ${fullName}`;

  if (roleName === "admin" && backLink) {
    backLink.href = "/admin";
    backLink.textContent = "Back to Admin";
  } else if (roleName === "technician" && backLink) {
    backLink.href = "/technician";
    backLink.textContent = "Back to Technician";
  }

  document.querySelectorAll("[data-alert-status]").forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll("[data-alert-status]")
        .forEach((tab) => tab.classList.remove("is-active"));
      button.classList.add("is-active");
      alertFilter.value = button.dataset.alertStatus;
      loadAlerts();
    });
  });

  alertFilter.addEventListener("change", loadAlerts);
  loadAlerts();
});

function updateAlertSummary(alerts) {
  const activeCount = alerts.filter((alert) => !alert.is_resolved).length;
  const resolvedCount = alerts.filter((alert) => alert.is_resolved).length;
  const highCount = alerts.filter(
    (alert) => String(alert.severity || "").toLowerCase() === "high",
  ).length;

  document.getElementById("activeAlertCount").textContent = activeCount;
  document.getElementById("resolvedAlertCount").textContent = resolvedCount;
  document.getElementById("highAlertCount").textContent = highCount;
}

async function loadAlerts() {
  const status = document.getElementById("alertFilter").value;
  const alertMessage = document.getElementById("alertMessage");
  const alertList = document.getElementById("alertList");

  alertList.innerHTML = "";
  setMessage(alertMessage, "", null);

  try {
    const response = await fetch(`/alerts?status=${encodeURIComponent(status)}`);
    const alerts = await response.json();

    if (!response.ok) {
      updateAlertSummary([]);
      setMessage(alertMessage, alerts.error || "Failed to load alerts.", "error");
      return;
    }

    if (!Array.isArray(alerts)) {
      updateAlertSummary([]);
      setMessage(alertMessage, "Failed to load alerts.", "error");
      return;
    }

    updateAlertSummary(alerts);

    if (alerts.length === 0) {
      setMessage(alertMessage, "No alerts found.", "good");
      return;
    }

    alerts.forEach((alert) => {
      const li = document.createElement("li");
      const severityTone = getTone(alert.severity) || "warning";
      li.className = `incident-card incident-${severityTone}`;

      const time = new Date(alert.created_at).toLocaleString();
      const resolvedLabel = alert.is_resolved ? "Resolved" : "Open";

      const content = document.createElement("div");
      content.className = "incident-content";

      const header = document.createElement("div");
      header.className = "incident-header";
      header.innerHTML = `
        <div>
          <span class="incident-type">${formatLabel(alert.alert_type)}</span>
          <p class="incident-time">${time}</p>
        </div>
        <div class="incident-badges">
          <span class="status-badge status-${getTone(alert.severity) || "warning"}">${formatLabel(alert.severity)}</span>
          <span class="status-badge status-${getTone(resolvedLabel)}">${resolvedLabel}</span>
        </div>
      `;

      const details = createDetailList([
        { label: "Home", value: alert.home_name },
        { label: "Room", value: alert.room_name },
        { label: "Device", value: formatLabel(alert.device_type) },
        { label: "Sensor", value: formatLabel(alert.sensor_type) },
      ]);

      const actions = document.createElement("span");
      actions.className = "incident-actions";

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

      content.appendChild(header);
      content.appendChild(details);
      content.appendChild(actions);
      li.appendChild(content);
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
