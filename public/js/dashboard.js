document.addEventListener("DOMContentLoaded", async () => {
  const fullName = localStorage.getItem("full_name");
  const roleId = localStorage.getItem("role_id");
  const userId = localStorage.getItem("user_id");

  if (roleId === "1") {
    window.location.replace("/admin");
    return;
  }

  if (roleId === "3") {
    window.location.replace("/technician");
    return;
  }

  document.getElementById("welcomeText").textContent = `Welcome, ${fullName}`;

  let roleName = "User";
  if (roleId === "1") roleName = "Admin";
  if (roleId === "3") roleName = "Technician";

  document.getElementById("roleText").textContent = `Role: ${roleName}`;

  try {
    const summaryResponse = await fetch(`/analytics/dashboard-summary/${userId}`);
    const summary = await summaryResponse.json();

    if (summaryResponse.ok) {
      document.getElementById("homeCount").textContent = summary.home_count || 0;
      document.getElementById("roomCount").textContent = summary.room_count || 0;
      document.getElementById("deviceCount").textContent = summary.device_count || 0;
    }
  } catch (err) {
    console.error(err);
  }

  document.getElementById("logoutLink").addEventListener("click", () => {
    localStorage.clear();
  });
});
