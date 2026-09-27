let editingHomeId = null;
let savingHome = false;

document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireCurrentUser();
  if (!user) return;

  const homeForm = document.getElementById("homeForm");
  const homeMessage = document.getElementById("homeMessage");

  loadHomes();

  document.getElementById("cancelHomeButton").addEventListener("click", closeHomeEditor);
  document.getElementById("editHomeForm").addEventListener("submit", saveHome);

  homeForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
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
  try {
    const response = await fetch("/api/homes");
    const homes = await response.json();

    const homeList = document.getElementById("homeList");
    homeList.innerHTML = "";

    homes.forEach((home) => {
      const li = document.createElement("li");
      li.className = "list-row";

      const details = createDetailList([
        { label: "Home", value: home.home_name, primary: true },
        { label: "Address", value: home.address_text },
      ]);

      const actions = document.createElement("span");
      actions.className = "list-actions";

      const openBtn = document.createElement("button");
      openBtn.textContent = "Open";
      openBtn.addEventListener("click", () => {
        localStorage.setItem("home_id", home.home_id);
        localStorage.setItem("home_name", home.home_name);
        window.location.href = "/rooms";
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.addEventListener("click", async () => {
        if (savingHome) return;
        try {
          const response = await fetch(`/homes/${home.home_id}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (response.ok) {
            if (String(editingHomeId) === String(home.home_id)) closeHomeEditor();
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
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.addEventListener("click", () => {
        if (savingHome) return;
        editingHomeId = home.home_id;
        const form = document.getElementById("editHomeForm");
        form.elements.home_name.value = home.home_name;
        form.elements.address_text.value = home.address_text;
        setMessage(document.getElementById("editHomeMessage"), "", "");
        document.getElementById("editHomePanel").hidden = false;
        form.elements.home_name.focus();
      });
      actions.appendChild(editBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(details);
      li.appendChild(actions);

      homeList.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading homes:", err);
  }
}

function closeHomeEditor() {
  if (savingHome) return;
  editingHomeId = null;
  document.getElementById("editHomePanel").hidden = true;
  document.getElementById("editHomeForm").reset();
}

async function saveHome(event) {
  event.preventDefault();
  if (savingHome || editingHomeId === null) return;
  const form = document.getElementById("editHomeForm");
  const message = document.getElementById("editHomeMessage");
  const id = editingHomeId;
  const data = {
    home_name: form.elements.home_name.value.trim(),
    address_text: form.elements.address_text.value.trim(),
  };
  savingHome = true;
  Array.from(form.elements).forEach((element) => { element.disabled = true; });
  let updatedHome = null;
  try {
    const response = await fetch(`/homes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(message, result.error || "Failed to update home.", "error");
      return;
    }
    updatedHome = result.home;
    if (localStorage.getItem("home_id") === String(id)) {
      localStorage.setItem("home_name", updatedHome.home_name);
    }
  } catch (error) {
    setMessage(message, "Unable to save home. Please try again.", "error");
  } finally {
    savingHome = false;
    Array.from(form.elements).forEach((element) => { element.disabled = false; });
  }
  if (updatedHome) {
    closeHomeEditor();
    setMessage(document.getElementById("homeMessage"), "Home updated successfully!", "good");
    await loadHomes();
  }
}
