document.addEventListener("DOMContentLoaded", async () => {
  const fullName = localStorage.getItem("full_name");
  const roleId = localStorage.getItem("role_id");
  const userId = localStorage.getItem("user_id");

  document.getElementById("welcomeText").textContent = `Welcome, ${fullName}`;

  let roleName = "User";
  if (roleId === "1") roleName = "Admin";
  if (roleId === "3") roleName = "Technician";

  document.getElementById("roleText").textContent = `Role: ${roleName}`;

  if (roleId === "3") {
    const menu = document.querySelector("ul");
    const techItem = document.createElement("li");
    techItem.innerHTML = `<a href="/technician.html">Technician Panel</a>`;
    menu.appendChild(techItem);
  }

  try {
    const homesResponse = await fetch(`/homes/${userId}`);
    const homes = await homesResponse.json();
    document.getElementById("homeCount").textContent = homes.length;
  } catch (err) {
    console.error(err);
  }

  document.getElementById("logoutLink").addEventListener("click", () => {
    localStorage.clear();
  });
});
