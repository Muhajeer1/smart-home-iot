document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireCurrentUser();
  if (!user) return;

  const fullName = user.full_name;
  const roleName = getRoleName(user);
  const backLinks = document.getElementById("eventsBackLinks");

  document.getElementById("eventsUser").textContent =
    `Logged in as: ${fullName}`;

  setupToggleButton(
    "toggleEvents",
    "eventList",
    "Collapse Timeline",
    "Expand Timeline",
  );

  if (roleName === "admin" && backLinks) {
    backLinks.style.display = "none";
  }

  loadEvents();
});

function updateEventSummary(events) {
  const deviceCount = events.filter((event) =>
    String(event.event_type || "").includes("device"),
  ).length;
  const readingCount = events.filter((event) =>
    String(event.event_type || "").includes("reading"),
  ).length;

  document.getElementById("totalEventCount").textContent = events.length;
  document.getElementById("deviceEventCount").textContent = deviceCount;
  document.getElementById("readingEventCount").textContent = readingCount;
}

async function loadEvents() {
  const eventList = document.getElementById("eventList");

  try {
    const response = await fetch("/events");
    const events = await response.json();

    eventList.innerHTML = "";

    if (!response.ok || !Array.isArray(events)) {
      updateEventSummary([]);
      eventList.innerHTML = `<li class="timeline-item"><div class="timeline-body">Failed to load events: ${events.error || "unknown error"}</div></li>`;
      return;
    }

    updateEventSummary(events);

    if (events.length === 0) {
      eventList.innerHTML = `<li class="timeline-item"><div class="timeline-body">No events found yet.</div></li>`;
      return;
    }

    events.forEach((event) => {
      const li = document.createElement("li");
      li.className = "timeline-item";

      const time = new Date(event.event_time).toLocaleString();
      const eventType = formatLabel(event.event_type);

      const marker = document.createElement("span");
      marker.className = "timeline-marker";

      const body = document.createElement("div");
      body.className = "timeline-body";

      const header = document.createElement("div");
      header.className = "timeline-header";
      header.innerHTML = `
        <div>
          <span class="timeline-title">${eventType}</span>
          <p class="timeline-description">${formatInline(event.description)}</p>
        </div>
        <time>${time}</time>
      `;

      const details = createDetailList([
        { label: "Home", value: event.home_name },
        { label: "Device", value: formatLabel(event.device_type) },
      ]);

      body.appendChild(header);
      body.appendChild(details);
      li.appendChild(marker);
      li.appendChild(body);
      eventList.appendChild(li);
    });
  } catch (error) {
    console.error("LOAD EVENTS ERROR:", error);
    updateEventSummary([]);
    eventList.innerHTML = `<li class="timeline-item"><div class="timeline-body">Server error while loading events.</div></li>`;
  }
}
