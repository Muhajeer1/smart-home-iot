document.addEventListener("DOMContentLoaded", async () => {
  const user = await requireCurrentUser();
  if (!user) return;

  const fullName = user.full_name;
  const roleName = getRoleName(user);

  if (roleName === "admin") {
    window.location.replace("/admin");
    return;
  }

  if (roleName === "technician") {
    window.location.replace("/technician");
    return;
  }

  document.getElementById("welcomeText").textContent = `Welcome, ${fullName}`;
  document.getElementById("roleText").textContent = `Role: ${formatLabel(roleName)}`;

  try {
    const summaryResponse = await fetch("/analytics/dashboard-summary");
    const summary = await summaryResponse.json();

    if (summaryResponse.ok) {
      document.getElementById("homeCount").textContent = summary.home_count || 0;
      document.getElementById("roomCount").textContent = summary.room_count || 0;
      document.getElementById("deviceCount").textContent = summary.device_count || 0;
    } else {
      console.error("Dashboard summary error:", summary);
      document.getElementById("homeCount").textContent = "N/A";
      document.getElementById("roomCount").textContent = "N/A";
      document.getElementById("deviceCount").textContent = "N/A";
    }
  } catch (err) {
    console.error(err);
    document.getElementById("homeCount").textContent = "N/A";
    document.getElementById("roomCount").textContent = "N/A";
    document.getElementById("deviceCount").textContent = "N/A";
  }

  document.getElementById("logoutLink").addEventListener("click", async (event) => {
    event.preventDefault();
    await logout();
  });
});
