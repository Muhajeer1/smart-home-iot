(function () {
  function formatLabel(value) {
    if (value === null || value === undefined || value === "") {
      return "N/A";
    }

    return String(value)
      .trim()
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  }

  function formatInline(value) {
    if (value === null || value === undefined) {
      return "";
    }

    return String(value).replace(/\b[A-Za-z]+(?:_[A-Za-z0-9]+)+\b/g, (match) =>
      formatLabel(match),
    );
  }

  function createDetailList(items) {
    const details = document.createElement("span");
    details.className = "detail-list";

    items.forEach((item) => {
      const detail = document.createElement("span");
      detail.className = item.primary ? "detail-item detail-primary" : "detail-item";

      if (item.tone) {
        detail.classList.add(`detail-${item.tone}`);
      }

      const label = document.createElement("span");
      label.className = "detail-label";
      label.textContent = item.label;

      const value = document.createElement("span");
      value.className = "detail-value";
      value.textContent = item.value ?? "N/A";

      detail.appendChild(label);
      detail.appendChild(value);
      details.appendChild(detail);
    });

    return details;
  }

  function getTone(value) {
    const normalized = String(value || "").toLowerCase();

    if (normalized === "good" || normalized === "active" || normalized === "low" || normalized === "resolved") {
      return "good";
    }

    if (normalized === "warning" || normalized === "maintenance" || normalized === "inactive" || normalized === "medium") {
      return "warning";
    }

    if (normalized === "error" || normalized === "offline" || normalized === "high" || normalized === "open") {
      return "error";
    }

    return null;
  }

  function setMessage(element, message, tone) {
    if (!element) {
      return;
    }

    element.textContent = message;
    element.className = tone ? `message message-${tone}` : "message";
  }

  function setupToggleButton(buttonId, targetId, visibleText, hiddenText) {
    const button = document.getElementById(buttonId);
    const target = document.getElementById(targetId);

    if (!button || !target) {
      return;
    }

    button.textContent = visibleText || "Hide";
    button.addEventListener("click", () => {
      const isHidden = target.hidden;
      target.hidden = !isHidden;
      button.textContent = isHidden ? visibleText || "Hide" : hiddenText || "Show";
    });
  }

  window.formatLabel = formatLabel;
  window.formatInline = formatInline;
  window.createDetailList = createDetailList;
  window.getTone = getTone;
  window.setMessage = setMessage;
  window.setupToggleButton = setupToggleButton;
})();
