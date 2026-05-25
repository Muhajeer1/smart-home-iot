(function () {
  function createDockLink(label, href, currentPath) {
    const link = document.createElement("a");
    link.className = "dock-item";
    link.href = href;
    link.dataset.label = label;
    link.innerHTML = `<span class="dock-item-label">${label}</span>`;

    const homeSectionPaths = new Set([
      "/homes",
      "/rooms",
      "/devices",
      "/sensors",
      "/readings",
    ]);

    const isCurrent = href === currentPath;
    const isHomeSection = href === "/homes" && homeSectionPaths.has(currentPath);

    if (isCurrent || isHomeSection) {
      link.classList.add("is-active");
    }

    if (href === "/") {
      link.addEventListener("click", async (event) => {
        event.preventDefault();
        await logout();
      });
    }

    return link;
  }

  function getRoleHome() {
    const roleName = getRoleName(window.currentUser);

    if (roleName === "admin") {
      return { label: "Admin", href: "/admin" };
    }

    if (roleName === "technician") {
      return { label: "Technician", href: "/technician" };
    }

    return { label: "Dashboard", href: "/dashboard" };
  }

  function getRoleLinks() {
    const roleName = getRoleName(window.currentUser);

    if (roleName === "admin") {
      return [
        ["Admin", "/admin"],
        ["Analytics", "/analytics"],
        ["Events", "/activity"],
        ["Alerts", "/alert-center"],
      ];
    }

    if (roleName === "technician") {
      return [
        ["Technician", "/technician"],
        ["Analytics", "/analytics"],
        ["Events", "/activity"],
        ["Alerts", "/alert-center"],
      ];
    }

    return [
      ["Dashboard", "/dashboard"],
      ["Homes", "/homes"],
      ["Analytics", "/analytics"],
      ["Events", "/activity"],
      ["Alerts", "/alert-center"],
    ];
  }

  function enforcePageAccess(currentPath) {
    const roleName = getRoleName(window.currentUser);
    const publicPaths = new Set(["/", "/index.html"]);

    if (publicPaths.has(currentPath)) {
      return true;
    }

    const userWorkspacePaths = new Set([
      "/dashboard",
      "/homes",
      "/rooms",
      "/devices",
      "/sensors",
      "/readings",
    ]);

    if (roleName === "admin" && (userWorkspacePaths.has(currentPath) || currentPath === "/technician")) {
      window.location.replace("/admin");
      return false;
    }

    if (roleName === "technician" && (userWorkspacePaths.has(currentPath) || currentPath === "/admin")) {
      window.location.replace("/technician");
      return false;
    }

    if (roleName === "user" && (currentPath === "/admin" || currentPath === "/technician")) {
      window.location.replace("/dashboard");
      return false;
    }

    return true;
  }

  function addAppDock(currentPath) {
    if (currentPath === "/" || document.querySelector(".app-dock")) {
      return;
    }

    const roleHome = getRoleHome();
    const dock = document.createElement("aside");
    dock.className = "app-dock is-collapsed";
    document.body.classList.add("dock-collapsed");

    const brand = document.createElement("a");
    brand.className = "dock-brand";
    brand.href = roleHome.href;
    brand.innerHTML = `<span class="dock-brand-mark">IoT</span><span>Smart Home</span>`;
    dock.appendChild(brand);

    const mainNav = document.createElement("nav");
    mainNav.className = "dock-nav";

    getRoleLinks().forEach(([label, href]) => {
      mainNav.appendChild(createDockLink(label, href, currentPath));
    });

    dock.appendChild(mainNav);

    const bottomNav = document.createElement("nav");
    bottomNav.className = "dock-nav dock-nav-bottom";
    bottomNav.appendChild(createDockLink("Logout", "/", currentPath));
    dock.appendChild(bottomNav);

    document.body.prepend(dock);
    document.body.classList.add("has-app-dock");
  }

  function addPageTools(currentPath) {
    if (currentPath === "/" || document.querySelector(".page-tools")) {
      return;
    }

    const hero = document.querySelector(".page-hero");
    const pageTitle = document.querySelector(".page-hero h1")?.textContent || document.title;
    const roleHome = getRoleHome();

    if (!hero) {
      return;
    }

    const tools = document.createElement("div");
    tools.className = "page-tools";

    const backButton = document.createElement("button");
    backButton.type = "button";
    backButton.className = "btn-secondary";
    backButton.textContent = "Back";
    backButton.addEventListener("click", () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = roleHome.href;
      }
    });

    const crumb = document.createElement("div");
    crumb.className = "page-crumb";
    crumb.innerHTML = `<span>${roleHome.label}</span><strong>${pageTitle}</strong>`;

    const dashboardLink = document.createElement("a");
    dashboardLink.href = roleHome.href;
    dashboardLink.className = "page-tool-link";
    dashboardLink.textContent = roleHome.label;

    tools.appendChild(backButton);
    tools.appendChild(crumb);
    tools.appendChild(dashboardLink);

    hero.before(tools);
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const currentPath = window.location.pathname;
    const publicPaths = new Set(["/", "/index.html"]);

    if (!publicPaths.has(currentPath)) {
      const user = await requireCurrentUser();

      if (!user) {
        return;
      }
    }

    if (!enforcePageAccess(currentPath)) {
      return;
    }

    addAppDock(currentPath);
    addPageTools(currentPath);

    document.querySelectorAll(".topnav a").forEach((link) => {
      const linkPath = new URL(link.href, window.location.origin).pathname;

      if (linkPath === currentPath) {
        link.classList.add("is-active");
      }

      if (linkPath === "/") {
        link.addEventListener("click", async (event) => {
          event.preventDefault();
          await logout();
        });
      }
    });
  });
})();
