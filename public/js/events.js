document.addEventListener("DOMContentLoaded", () => {
  const fullName = localStorage.getItem("full_name");
  const roleId = localStorage.getItem("role_id");
  const backLinks = document.getElementById("eventsBackLinks");

  document.getElementById("eventsUser").textContent =
    `Logged in as: ${fullName}`;

  if (roleId === "1") {
    backLinks.style.display = "none";
  }

  loadEvents();
});

async function loadEvents() {
  try {
    const response = await fetch("/events");
    const events = await response.json();

    const eventList = document.getElementById("eventList");
    eventList.innerHTML = "";

    events.forEach((event) => {
      const li = document.createElement("li");
      li.className = "list-row";

      const time = new Date(event.event_time).toLocaleString();

      li.appendChild(
        createDetailList([
          { label: "Time", value: time },
          { label: "Event", value: formatLabel(event.event_type), primary: true },
          { label: "Home", value: event.home_name },
          { label: "Device", value: formatLabel(event.device_type) },
          { label: "Details", value: formatInline(event.description) },
        ]),
      );

      eventList.appendChild(li);
    });
  } catch (error) {
    console.error("LOAD EVENTS ERROR:", error);
  }
}
