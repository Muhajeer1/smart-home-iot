let allRooms = [];

document.addEventListener("DOMContentLoaded", () => {
  const roomForm = document.getElementById("roomForm");
  const roomMessage = document.getElementById("roomMessage");
  const selectedHome = document.getElementById("selectedHome");
  const roomFilter = document.getElementById("roomFilter");

  const home_id = localStorage.getItem("home_id");
  const home_name = localStorage.getItem("home_name");

  if (!home_id) {
    setMessage(roomMessage, "No home selected.", "error");
    return;
  }

  selectedHome.textContent = `Selected Home: ${home_name}`;

  loadRooms();

  roomFilter.addEventListener("input", () => {
    renderRooms(allRooms, roomFilter.value);
  });

  roomForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      home_id,
      room_name: roomForm.room_name.value,
      floor_no: roomForm.floor_no.value,
    };

    try {
      const response = await fetch("/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(roomMessage, "Room created successfully!", "good");
        roomForm.reset();
        loadRooms();
      } else {
        setMessage(roomMessage, result.error || "Failed to create room.", "error");
      }
    } catch (err) {
      console.error(err);
      setMessage(roomMessage, "Server error.", "error");
    }
  });
});

async function loadRooms() {
  const home_id = localStorage.getItem("home_id");
  const roomFilter = document.getElementById("roomFilter");

  try {
    const response = await fetch(`/rooms/${home_id}`);
    allRooms = await response.json();
    renderRooms(allRooms, roomFilter.value);
  } catch (err) {
    console.error("Error loading rooms:", err);
  }
}

function renderRooms(rooms, filterText = "") {
  const roomList = document.getElementById("roomList");
  roomList.innerHTML = "";

  const filteredRooms = rooms.filter((room) =>
    room.room_name.toLowerCase().includes(filterText.toLowerCase()),
  );

  filteredRooms.forEach((room) => {
    const li = document.createElement("li");
    li.className = "list-row";

    const openBtn = document.createElement("button");
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", () => {
      localStorage.setItem("room_id", room.room_id);
      localStorage.setItem("room_name", room.room_name);
      window.location.href = "/devices.html";
    });

    const details = createDetailList([
      { label: "Room", value: room.room_name, primary: true },
      { label: "Floor", value: room.floor_no },
    ]);

    const actions = document.createElement("span");
    actions.className = "list-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", async () => {
      const newName = prompt("Enter new room name:", room.room_name);
      if (newName === null) return;

      const newFloor = prompt("Enter new floor number:", room.floor_no ?? "");
      if (newFloor === null) return;

      try {
        const response = await fetch(`/rooms/${room.room_id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_name: newName,
            floor_no: newFloor,
          }),
        });

        const result = await response.json();

        if (response.ok) {
          loadRooms();
        } else {
          alert(result.error || "Failed to update room");
        }
      } catch (err) {
        console.error(err);
        alert("Server error");
      }
    });

    actions.appendChild(openBtn);
    actions.appendChild(editBtn);

    li.appendChild(details);
    li.appendChild(actions);

    roomList.appendChild(li);
  });
}
