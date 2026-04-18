function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function normalizeText(value) {
  return isBlank(value) ? null : String(value).trim();
}

function normalizeKey(value) {
  return isBlank(value)
    ? null
    : String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function requireFields(res, fields) {
  const missing = fields.find((field) => isBlank(field.value));

  if (missing) {
    res.status(400).json({ error: `${missing.label} is required.` });
    return false;
  }

  return true;
}

function validateEnum(res, value, allowedValues, label) {
  if (!allowedValues.includes(value)) {
    res.status(400).json({ error: `Please select a valid ${label}.` });
    return false;
  }

  return true;
}

function validateNumber(res, value, label) {
  if (isBlank(value) || Number.isNaN(Number(value))) {
    res.status(400).json({ error: `${label} must be a valid number.` });
    return false;
  }

  return true;
}

function getDuplicateMessage(error) {
  const constraint = String(error.constraint || "").toLowerCase();
  const detail = String(error.detail || "").toLowerCase();

  if (constraint.includes("email") || detail.includes("email")) {
    return "This email is already registered.";
  }

  if (constraint.includes("serial") || detail.includes("serial")) {
    return "This serial number is already used.";
  }

  if (constraint.includes("home") || detail.includes("home_name")) {
    return "A home with this name already exists.";
  }

  return "This record already exists. Please use different values.";
}

function sendDbError(res, error, fallbackMessage = "Server error. Please try again.") {
  if (error.code === "23505") {
    return res.status(409).json({ error: getDuplicateMessage(error) });
  }

  if (error.code === "23502") {
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  if (error.code === "23503") {
    return res.status(400).json({ error: "Related record was not found." });
  }

  if (error.code === "23514") {
    return res.status(400).json({ error: "Please check the entered values." });
  }

  return res.status(500).json({ error: fallbackMessage });
}

module.exports = {
  isBlank,
  normalizeKey,
  normalizeText,
  requireFields,
  sendDbError,
  validateEnum,
  validateNumber,
};
