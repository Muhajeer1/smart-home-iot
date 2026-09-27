import { test, expect, type Page } from "@playwright/test";
async function setup(page: Page, role = "user") {
  const calls: { path: string; method: string; body: unknown }[] = [];
  const state = {
    fail: "",
    delay: false,
    alertResolved: false,
    deleted: false,
  };
  await page.route("**/backend/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace("/backend", "");
    const method = route.request().method();
    calls.push({
      path,
      method,
      body: route.request().postData() ? route.request().postDataJSON() : null,
    });
    const send = (json: unknown, status = 200) =>
      route.fulfill({ json, status });
    if (state.fail === path)
      return send({ error: "Temporary service failure" }, 500);
    if (path === "/me")
      return send({
        user: {
          user_id: 1,
          full_name: "Test Account",
          email: "test@example.com",
          role_id: role === "admin" ? 1 : role === "technician" ? 3 : 2,
          role_name: role,
        },
      });
    if (path === "/api/homes") return send([]);
    if (path === "/analytics/dashboard-summary")
      return send({ home_count: 0, room_count: 0, device_count: 0 });
    if (path === "/events")
      return send(
        Array.from({ length: 18 }, (_, i) => ({
          event_id: i + 1,
          event_type: i === 0 ? "device_offline" : "device_updated",
          home_id: i === 0 ? 2 : 1,
          home_name: i === 0 ? "Garden house" : "City apartment",
          description:
            i === 0 ? '<img src=x onerror="alert(1)">' : `Device event ${i}`,
          device_type: "thermostat",
          event_time: "2026-09-27T08:00:00Z",
        })),
      );
    if (path === "/alerts")
      return send(
        state.deleted
          ? []
          : [
              {
                alert_id: 7,
                home_id: 1,
                alert_type: "sensor_out_of_range",
                severity: "high",
                is_resolved: state.alertResolved,
                home_name: "City apartment",
                room_name: "Living room",
                sensor_type: "temperature",
                created_at: "2026-09-27T08:00:00Z",
              },
            ],
      );
    if (path === "/alerts/7/resolve") {
      state.alertResolved = route.request().postDataJSON().is_resolved;
      return send({ alert: { alert_id: 7, is_resolved: state.alertResolved } });
    }
    if (path === "/alerts/7" && method === "DELETE") {
      state.deleted = true;
      return send({ message: "Deleted" });
    }
    if (path === "/admin/users")
      return send([
        {
          user_id: 1,
          full_name: "Test Account",
          email: "test@example.com",
          role_name: "admin",
          role_id: 1,
        },
        {
          user_id: 2,
          full_name: "Aylin Demir",
          email: "aylin@example.com",
          role_name: "user",
          role_id: 2,
        },
      ]);
    if (path === "/admin/homes")
      return send([
        {
          home_id: 1,
          home_name: "City apartment",
          address_text: "Istanbul",
          owner_name: "Aylin Demir",
        },
      ]);
    if (path.startsWith("/admin/") && method === "DELETE")
      return send({ message: "Deleted" });
    if (path === "/admin/devices" || path === "/technician/devices")
      return send([
        {
          device_id: 12,
          brand_model: "Nest thermostat",
          device_type: "thermostat",
          serial_no: "NST001",
          status: "offline",
          home_name: "City apartment",
          room_name: "Living room",
        },
      ]);
    if (path === "/technician/devices/12")
      return send({
        device: {
          device_id: 12,
          status: route.request().postDataJSON().status,
        },
      });
    if (path === "/analytics/homes")
      return send([
        { home_id: 1, home_name: "City apartment" },
        { home_id: 2, home_name: "Garden house" },
      ]);
    if (path.startsWith("/analytics/")) {
      if (state.delay && url.searchParams.get("homeId") === "1")
        await new Promise((resolve) => setTimeout(resolve, 350));
      const homeId = url.searchParams.get("homeId") || "all";
      if (path.endsWith("devices-per-home"))
        return send([
          {
            home_id: homeId,
            home_name: homeId === "2" ? "Garden house" : "City apartment",
            device_count: homeId === "2" ? "8" : "3",
          },
        ]);
      if (path.endsWith("rooms-per-home"))
        return send([
          { home_id: homeId, home_name: "City apartment", room_count: "2" },
        ]);
      if (path.endsWith("alert-summary"))
        return send([{ alert_type: "sensor_out_of_range", alert_count: "14" }]);
      if (path.endsWith("average-reading-by-sensor-type"))
        return send([
          {
            sensor_type: "temperature",
            average_reading_value: "22.75319",
            reading_count: "35",
          },
        ]);
      if (path.endsWith("latest-readings"))
        return send([
          {
            sensor_id: 5,
            sensor_type: "temperature",
            device_type: "thermostat",
            home_name: "City apartment",
            room_name: "Living room",
            reading_value: "24.5",
            reading_time: "2026-09-27T08:00:00Z",
          },
        ]);
      return send([]);
    }
    return send({ error: `Unexpected request: ${method} ${path}` }, 404);
  });
  return { calls, state };
}

test("events: pagination, home filter and untrusted text", async ({ page }) => {
  const { calls } = await setup(page);
  await page.goto("/activity");
  await expect(
    page.getByText('<img src=x onerror="alert(1)">', { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ops-table img")).toHaveCount(0);
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(
    page.getByText("Device event 17", { exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Home" }).selectOption("2");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  expect(
    calls.some((call) => call.path.startsWith("/events/home")),
  ).toBeFalsy();
});

test("alerts resolve and reopen preserve location and counters", async ({
  page,
}) => {
  const { calls } = await setup(page);
  await page.goto("/alert-center");
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(
    page.getByText("Alert resolved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Resolved", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: /City apartment/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reopen", exact: true }).click();
  await page.getByRole("button", { name: "Active", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: /City apartment/ }),
  ).toBeVisible();
  expect(
    calls.filter((call) => call.method === "PATCH").map((call) => call.body),
  ).toEqual([{ is_resolved: true }, { is_resolved: false }]);
});

test("alert delete cancels, reports errors and retries explicitly", async ({
  page,
}) => {
  const { state, calls } = await setup(page);
  await page.goto("/alert-center");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(calls.filter((call) => call.method === "DELETE")).toHaveLength(0);
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  state.fail = "/alerts/7";
  await page.getByRole("button", { name: "Delete alert", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "Temporary service failure",
  );
  state.fail = "";
  await page.getByRole("button", { name: "Delete alert", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByText("Alert deleted.", { exact: true })).toBeVisible();
});

for (const path of ["/admin", "/technician"])
  test(`user cannot request restricted ${path} data`, async ({ page }) => {
    const { calls } = await setup(page);
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Access restricted" }),
    ).toBeVisible();
    expect(calls.some((call) => call.path.startsWith(path))).toBeFalsy();
    await expect(
      page.getByRole("link", { name: "Administration", exact: true }),
    ).toHaveCount(0);
  });

test("admin user deletion protects current account and updates directory", async ({
  page,
}) => {
  const { calls } = await setup(page, "admin");
  await page.goto("/admin");
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: "Test Account" })
      .getByRole("button", { name: "Delete user" }),
  ).toBeDisabled();
  await page
    .getByRole("row")
    .filter({ hasText: "Aylin Demir" })
    .getByRole("button", { name: "Delete user" })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete user", exact: true })
    .click();
  await expect(
    page.getByRole("row").filter({ hasText: "Aylin Demir" }),
  ).toHaveCount(0);
  expect(
    calls.filter((call) => call.method === "DELETE").map((call) => call.path),
  ).toEqual(["/admin/users/2"]);
});

for (const tab of ["homes", "devices"])
  test(`admin ${tab} delete uses correct endpoint`, async ({ page }) => {
    const { calls } = await setup(page, "admin");
    await page.goto(`/admin?tab=${tab}`);
    const label = tab === "homes" ? "Delete home" : "Delete device";
    await page.getByRole("button", { name: label, exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: label, exact: true })
      .click();
    await expect(page.locator("tbody tr")).toHaveCount(0);
    expect(calls.filter((call) => call.method === "DELETE")[0].path).toBe(
      `/admin/${tab}/${tab === "homes" ? 1 : 12}`,
    );
  });

test("technician status update retains joined location and exposes all statuses", async ({
  page,
}) => {
  const { calls } = await setup(page, "technician");
  await page.goto("/technician");
  await page.getByRole("button", { name: "Change status" }).click();
  await page
    .getByRole("combobox", { name: "New status" })
    .selectOption("inactive");
  await page.getByRole("button", { name: "Save status" }).click();
  await expect(
    page.getByRole("cell", { name: /City apartment/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Inactive", exact: true }),
  ).toBeVisible();
  expect(calls.find((call) => call.method === "PUT")?.body).toEqual({
    status: "inactive",
  });
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
});

test("analytics partial failure can retry without hiding other reports", async ({
  page,
}) => {
  const { state } = await setup(page);
  state.fail = "/analytics/rooms-per-home";
  await page.goto("/analytics");
  await expect(
    page.getByRole("region", { name: "Rooms per home" }).getByRole("alert"),
  ).toContainText("Temporary service failure");
  await expect(
    page
      .getByRole("region", { name: "Latest readings" })
      .getByRole("cell", { name: "24.5", exact: true }),
  ).toBeVisible();
  state.fail = "";
  await page
    .getByRole("region", { name: "Rooms per home" })
    .getByRole("button", { name: "Try again" })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Rooms per home" })
      .getByRole("cell", { name: "2", exact: true }),
  ).toBeVisible();
});

test("analytics scope change ignores late response and survives reload", async ({
  page,
}) => {
  const { state } = await setup(page);
  state.delay = true;
  await page.goto("/analytics");
  await page.getByRole("combobox", { name: "Report scope" }).selectOption("1");
  await page.getByRole("combobox", { name: "Report scope" }).selectOption("2");
  const report = page.getByRole("region", { name: "Devices per home" });
  await expect(
    report.getByRole("cell", { name: "Garden house", exact: true }),
  ).toBeVisible();
  await expect(
    report.getByRole("cell", { name: "City apartment", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("combobox", { name: "Report scope" }),
  ).toHaveValue("2");
  await expect(
    report.getByRole("cell", { name: "8", exact: true }),
  ).toBeVisible();
});

test("analytics unavailable home sends no report queries", async ({ page }) => {
  const { calls } = await setup(page);
  await page.goto("/analytics?homeId=999");
  await expect(page.getByRole("alert")).toContainText(
    "This home is not available",
  );
  expect(
    calls.some((call) => call.path === "/analytics/devices-per-home"),
  ).toBeFalsy();
});

for (const path of [
  "activity",
  "alert-center",
  "analytics",
  "admin",
  "technician",
])
  test(`${path} mobile has no document overflow`, async ({ page }) => {
    await setup(page, "admin");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${path}`);
    await expect(page.locator(".ops-table").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `test-results/${path}-mobile.png`,
      fullPage: true,
    });
  });

test("operator desktop visual review", async ({ page }) => {
  await setup(page, "admin");
  for (const path of [
    "activity",
    "alert-center",
    "analytics",
    "admin",
    "technician",
  ]) {
    await page.goto(`/${path}`);
    await expect(page.locator(".ops-table").first()).toBeVisible();
    await page.screenshot({
      path: `test-results/${path}-desktop.png`,
      fullPage: true,
    });
  }
});
