document.addEventListener("DOMContentLoaded", () => {
  const homeForm = document.getElementById("homeForm");
  const homeMessage = document.getElementById("homeMessage");

  loadHomes();

  homeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const owner_user_id = localStorage.getItem("user_id");

    const data = {
      owner_user_id,
      home_name: homeForm.home_name.value,
      address_text: homeForm.address_text.value,
    };

    try {
      const response = await fetch("/homes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage(homeMessage, "Home created successfully!", "good");
        homeForm.reset();
        loadHomes();
      } else {
        setMessage(homeMessage, result.error || "Failed to create home", "error");
      }
    } catch (err) {
      console.error(err);
      setMessage(homeMessage, "Server error", "error");
    }
  });
});

async function loadHomes() {
  const user_id = localStorage.getItem("user_id");

  try {
    const response = await fetch(`/homes/${user_id}`);
    const homes = await response.json();

    const homeList = document.getElementById("homeList");
    homeList.innerHTML = "";

    homes.forEach((home) => {
      const li = document.createElement("li");
      li.className = "list-row";

      const details = createDetailList([
        { label: "Home", value: home.home_name, primary: true },
      ]);

      const actions = document.createElement("span");
      actions.className = "list-actions";

      const openBtn = document.createElement("button");
      openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => {
        localStorage.setItem("home_id", home.home_id);
        localStorage.setItem("home_name", home.home_name);
        window.location.href = "/rooms.html";
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        try {
          const response = await fetch(`/homes/${home.home_id}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (response.ok) {
            loadHomes();
          } else {
            alert(result.error || "Failed to delete home");
          }
        } catch (err) {
          console.error(err);
          alert("Server error");
        }
      });

      actions.appendChild(openBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(details);
      li.appendChild(actions);

      homeList.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading homes:", err);
  }
}
