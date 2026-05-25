async function getCurrentUser() {
  try {
    const response = await fetch("/me");

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.user || null;
  } catch (error) {
    console.error("AUTH CHECK ERROR:", error);
    return null;
  }
}

function getRoleName(user) {
  const roleName = String(user?.role_name || "").toLowerCase();

  if (roleName) {
    return roleName;
  }

  const roleId = String(user?.role_id || "");
  if (roleId === "1") return "admin";
  if (roleId === "3") return "technician";
  return "user";
}

function hasRole(user, roles) {
  const roleName = getRoleName(user);
  return roles.includes(roleName);
}

async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    localStorage.clear();
    window.location.replace("/");
    return null;
  }

  window.currentUser = user;
  localStorage.setItem("user_id", user.user_id);
  localStorage.setItem("full_name", user.full_name);
  localStorage.setItem("email", user.email);
  localStorage.setItem("role_id", user.role_id);
  localStorage.setItem("role_name", user.role_name || "");

  return user;
}

async function logout() {
  await fetch("/logout", { method: "POST" });
  localStorage.clear();
  window.location.href = "/";
}
