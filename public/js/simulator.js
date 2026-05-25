async function initReadingSimulator(listId, messageId, bulkInputId, bulkButtonId) {
  const list = document.getElementById(listId);
  const message = document.getElementById(messageId);
  const bulkInput = document.getElementById(bulkInputId);
  const bulkButton = document.getElementById(bulkButtonId);

  if (!list || !message) {
    return;
  }

  if (bulkInput && bulkButton) {
    bulkButton.addEventListener("click", () =>
      generateBulkReadings(bulkInput, bulkButton, message),
    );
  }

  try {
    const response = await fetch("/technician/sensors");
    const sensors = await response.json();

    list.innerHTML = "";

    if (!response.ok) {
      setMessage(message, sensors.error || "Failed to load sensors.", "error");
      return;
    }

    if (sensors.length === 0) {
      setMessage(message, "No sensors available for simulation.", "warning");
      return;
    }

    sensors.forEach((sensor) => {
      const li = document.createElement("li");
      li.className = "list-row";

      const normalRange =
        sensor.normal_min === null && sensor.normal_max === null
          ? "Not set"
          : `${sensor.normal_min ?? "-"} - ${sensor.normal_max ?? "-"}`;

      li.appendChild(
        createDetailList([
          { label: "Sensor", value: formatLabel(sensor.sensor_type), primary: true },
          { label: "Device", value: formatLabel(sensor.device_type) },
          { label: "Home", value: sensor.home_name },
          { label: "Room", value: sensor.room_name },
          { label: "Normal Range", value: normalRange },
        ]),
      );

      const actions = document.createElement("span");
      actions.className = "list-actions";

      const simulateBtn = document.createElement("button");
      simulateBtn.textContent = "Generate Reading";
      simulateBtn.addEventListener("click", () =>
        generateSimulatedReading(sensor.sensor_id, simulateBtn, message),
      );

      actions.appendChild(simulateBtn);
      li.appendChild(actions);
      list.appendChild(li);
    });
  } catch (error) {
    console.error("LOAD SIMULATOR SENSORS ERROR:", error);
    setMessage(message, "Server error.", "error");
  }
}

async function generateSimulatedReading(sensorId, button, message) {
  try {
    button.disabled = true;
    setMessage(message, "Generating simulated reading...", "warning");

    const response = await fetch("/readings/simulate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sensor_id: sensorId }),
    });

    const result = await response.json();

    if (response.ok) {
      const reading = result.reading;
      setMessage(
        message,
        `Generated ${reading.reading_value} with ${formatLabel(reading.quality_flag)} quality.`,
        "good",
      );
      return;
    }

    setMessage(message, result.error || "Failed to generate reading.", "error");
  } catch (error) {
    console.error("GENERATE SIMULATED READING ERROR:", error);
    setMessage(message, "Server error.", "error");
  } finally {
    button.disabled = false;
  }
}

async function generateBulkReadings(input, button, message) {
  const count = input.value || 5000;
  const confirmed = confirm(
    `Generate ${count} simulated readings across all sensors?`,
  );

  if (!confirmed) {
    return;
  }

  try {
    button.disabled = true;
    setMessage(message, `Generating ${count} simulated readings...`, "warning");

    const response = await fetch("/readings/simulate-bulk", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ count }),
    });

    const result = await response.json();

    if (response.ok) {
      setMessage(
        message,
        `${result.inserted_count} readings generated across ${result.sensor_count} sensors.`,
        "good",
      );
      return;
    }

    setMessage(message, result.error || "Failed to generate dataset.", "error");
  } catch (error) {
    console.error("GENERATE BULK READINGS ERROR:", error);
    setMessage(message, "Server error.", "error");
  } finally {
    button.disabled = false;
  }
}
