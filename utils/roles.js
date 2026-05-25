const ROLE_ID_BY_NAME = {
  admin: "1",
  user: "2",
  technician: "3",
};

const ROLE_NAME_BY_ID = {
  1: "admin",
  2: "user",
  3: "technician",
};

function normalizeRoleName(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeUserRole(user) {
  const roleName = normalizeRoleName(user.role_name) || ROLE_NAME_BY_ID[String(user.role_id)] || "user";
  const roleId = ROLE_ID_BY_NAME[roleName] || String(user.role_id || "");

  return {
    ...user,
    role_id: roleId,
    role_name: roleName,
  };
}

function hasRole(user, allowedRoles) {
  const normalizedUser = normalizeUserRole(user || {});
  const allowed = allowedRoles.map((role) => normalizeRoleName(role));

  return allowed.some((role) =>
    role === String(normalizedUser.role_id) || role === normalizedUser.role_name
  );
}

module.exports = {
  normalizeUserRole,
  hasRole,
};
