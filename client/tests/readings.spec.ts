import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Reading, Sensor } from "../src/lib/types";
import {
  dateBoundary,
  numeric,
  rangeState,
  readingsCsv,
} from "../src/features/readings/readingUtils";

test.use({ timezoneId: "Europe/Istanbul", locale: "en-US" });
const basePath = "/homes/6/rooms/4/devices/10";
const historyPath = `${basePath}/sensors/20`;
const sensor: Sensor = {
  sensor_id: 20,
  device_id: 10,
  sensor_type: "temperature",
  unit: "C",
  normal_min: "18.00",
  normal_max: "26.00",
  is_active: true,
};

async function setup(page: Page, role = "user") {
  const state = {
    sensors: [
      sensor,
      {
        ...sensor,
        sensor_id: 21,
        sensor_type: "humidity",
        unit: "%",
        normal_min: null,
        normal_max: null,
        is_active: false,
      },
    ],
    readings: Array.from({ length: 61 }, (_, index) => ({
      reading_id: index + 1,
      sensor_id: 20,
      reading_time: new Date(Date.UTC(2026, 8, 25, index)).toISOString(),
      reading_value: String(index % 10 === 0 ? 30 : 20 + (index % 5)),
      quality_flag: index % 10 === 0 ? "warning" : "good",
    })) as Reading[],
    calls: [] as {
      path: string;
      method: string;
      body: Record<string, unknown> | null;
    }[],
    readFailure: false,
    generateFailure: 0,
    bulkFailure: false,
    extraSensors: false,
  };
  await page.route("**/backend/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/backend", "");
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : null;
    state.calls.push({ path, method, body });
    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, json: data });
    if (path === "/me")
      return json({
        user: {
          user_id: 2,
          full_name: "Aylin Demir",
          email: "aylin@example.com",
          role_name: role,
          role_id: role === "user" ? "2" : role === "admin" ? "1" : "3",
        },
      });
    if (path === "/api/homes")
      return json([
        {
          home_id: 6,
          owner_user_id: 2,
          home_name: "City apartment",
          address_text: "Istanbul",
        },
      ]);
    if (path === "/analytics/dashboard-summary")
      return json({ home_count: 1, room_count: 1, device_count: 1 });
    if (path === "/rooms/6")
      return json([
        { room_id: 4, home_id: 6, room_name: "Living room", floor_no: 0 },
      ]);
    if (path === "/devices/4")
      return json([
        {
          device_id: 10,
          room_id: 4,
          device_type: "thermostat",
          brand_model: "Nest Thermostat",
          serial_no: "NEST-001",
          status: "active",
          installed_at: "2026-09-01",
        },
      ]);
    if (path === "/sensors/10") return json(state.sensors);
    if (method === "GET" && path.startsWith("/readings/"))
      return state.readFailure
        ? json({ error: "History temporarily unavailable" }, 500)
        : json(
            state.readings.filter(
              (reading) => reading.sensor_id === Number(path.split("/")[2]),
            ),
          );
    if (path === "/technician/sensors") {
      const list = state.sensors.map((item) => ({
        ...item,
        home_name: "City apartment",
        room_name: "Living room",
        serial_no: "NEST-001",
        device_type: "thermostat",
      }));
      if (state.extraSensors)
        list.push({
          ...list[0],
          sensor_id: 50,
          home_name: "Country house",
          room_name: "Study",
          serial_no: "OTHER-002",
        });
      return json(list);
    }
    if (path === "/readings/simulate" && method === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (state.generateFailure)
        return json(
          {
            error:
              state.generateFailure === 401
                ? "Please log in again."
                : "Only admin or technician can generate readings.",
          },
          state.generateFailure,
        );
      const reading: Reading = {
        reading_id: 500,
        sensor_id: Number(body.sensor_id),
        reading_time: "2026-09-30T10:00:00Z",
        reading_value: "22.50",
        quality_flag: "good",
      };
      state.readings.unshift(reading);
      return json({ reading }, 201);
    }
    if (path === "/readings/simulate-bulk" && method === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (state.bulkFailure)
        return json({ error: "Dataset could not be generated." }, 500);
      return json(
        {
          inserted_count: Number(body.count),
          sensor_count: state.extraSensors ? 3 : 2,
          alert_sensor_count: 1,
        },
        201,
      );
    }
    return json({ error: `Unexpected ${method} ${path}` }, 500);
  });
  return state;
}

function tableRows(page: Page) {
  return page
    .getByRole("region", { name: "Reading history table" })
    .locator("tbody tr");
}

test("sensor search links to history and deep links survive refresh without localStorage", async ({
  page,
}) => {
  await setup(page);
  await page.goto(basePath);
  await page.getByRole("searchbox", { name: "Search sensors" }).fill("temp");
  await expect(
    page.getByRole("heading", { name: "Humidity", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "View readings" }).click();
  await expect(page).toHaveURL(new RegExp(`${historyPath}$`));
  await expect(
    page.getByRole("heading", { name: "Temperature readings" }),
  ).toBeVisible();
  await expect(tableRows(page)).toHaveCount(25);
  await page.reload();
  await expect(tableRows(page)).toHaveCount(25);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await expect(
    page.getByRole("button", { name: "Generate reading", exact: true }),
  ).toHaveCount(0);
});

test("quality filters, independent range filters, pagination, sort and URL persistence", async ({
  page,
}) => {
  const state = await setup(page);
  state.readings[60].quality_flag = "good"; // Good quality can still be outside normal range.
  await page.goto(historyPath);
  await expect(tableRows(page)).toHaveCount(25);
  await expect(tableRows(page).first()).toContainText("30");
  await expect(tableRows(page).first()).toContainText("Good");
  await expect(tableRows(page).first()).toContainText("Outside range");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    page.getByRole("navigation", { name: "Pagination" }),
  ).toContainText("26–50 of 61");
  await page.getByLabel("Quality", { exact: true }).selectOption("warning");
  await expect(page).not.toHaveURL(/page=2/);
  await expect(tableRows(page)).toHaveCount(6);
  await page.getByLabel("Normal range", { exact: true }).selectOption("within");
  await expect(
    page.getByRole("heading", { name: "No readings match" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Export CSV" })
    .isDisabled()
    .then((value) => expect(value).toBe(true));
  await page.getByRole("button", { name: "Reset filters" }).click();
  await page
    .getByLabel("Normal range", { exact: true })
    .selectOption("outside");
  await expect(tableRows(page)).toHaveCount(7);
  await page.reload();
  await expect(page.getByLabel("Normal range", { exact: true })).toHaveValue(
    "outside",
  );
  await expect(tableRows(page)).toHaveCount(7);
  await page.getByLabel("Sort readings").selectOption("oldest");
  await expect(tableRows(page).first()).toContainText("Sep 25");
});

test("date filters include the entire local day and reject reversed dates", async ({
  page,
}) => {
  const state = await setup(page);
  state.readings = [
    {
      reading_id: 1,
      sensor_id: 20,
      reading_time: "2026-09-25T20:59:59Z",
      reading_value: 10,
      quality_flag: "good",
    },
    {
      reading_id: 2,
      sensor_id: 20,
      reading_time: "2026-09-25T21:00:00Z",
      reading_value: 20,
      quality_flag: "good",
    },
    {
      reading_id: 3,
      sensor_id: 20,
      reading_time: "2026-09-26T20:59:59Z",
      reading_value: 30,
      quality_flag: "good",
    },
    {
      reading_id: 4,
      sensor_id: 20,
      reading_time: "2026-09-26T21:00:00Z",
      reading_value: 40,
      quality_flag: "good",
    },
  ];
  await page.goto(historyPath);
  await page.getByLabel("From date").fill("2026-09-26");
  await page.getByLabel("To date").fill("2026-09-26");
  await expect(tableRows(page)).toHaveCount(2);
  await expect(tableRows(page).first().locator(".reading-value")).toHaveText(
    "30",
  );
  await expect(tableRows(page).last().locator(".reading-value")).toHaveText(
    "20",
  );
  await page.getByLabel("From date").fill("2026-09-27");
  await expect(page.getByRole("alert")).toContainText("start date");
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
});

test("summary and CSV use all matching records rather than only one page", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto(historyPath);
  await expect(tableRows(page)).toHaveCount(25);
  const summary = page.getByRole("region", {
    name: "Filtered reading summary",
  });
  await expect(summary).toContainText("7");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("sensor-20-readings.csv");
  const content = await readFile((await download.path())!, "utf8");
  expect(content.split("\r\n")).toHaveLength(state.readings.length + 1);
  expect(content).toContain('"61","20"');
  expect(content).toContain('"1","20"');
  await page.getByLabel("Quality", { exact: true }).selectOption("warning");
  const filteredDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  const csv = await readFile((await (await filteredDownload).path())!, "utf8");
  expect(csv.split("\r\n")).toHaveLength(8);
});

for (const role of ["admin", "technician"]) {
  test(`${role} can simulate a reading without duplicate submission and keep it after refresh`, async ({
    page,
  }) => {
    const state = await setup(page, role);
    await page.goto(historyPath);
    await expect(tableRows(page)).toHaveCount(25);
    await page
      .getByRole("button", { name: "Generate reading", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Generating…", exact: true }),
    ).toBeDisabled();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText("22.5");
    expect(
      state.calls.filter((call) => call.path === "/readings/simulate"),
    ).toHaveLength(1);
    expect(
      state.calls.find((call) => call.path === "/readings/simulate")?.body,
    ).toEqual({ sensor_id: 20 });
    await expect(tableRows(page).first().locator(".reading-value")).toHaveText(
      "22.5",
    );
    await page.reload();
    await expect(tableRows(page).first().locator(".reading-value")).toHaveText(
      "22.5",
    );
  });
}

test("simulation failures and expiry are visible; filtered-out generation does not reset filters", async ({
  page,
}) => {
  const state = await setup(page, "technician");
  state.generateFailure = 403;
  await page.goto(historyPath + "?quality=warning");
  await page
    .getByRole("button", { name: "Generate reading", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Only admin or technician",
  );
  await expect(tableRows(page)).toHaveCount(7);
  state.generateFailure = 0;
  await page
    .getByRole("button", { name: "Generate reading", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("filters may hide");
  await expect(page.getByLabel("Quality", { exact: true })).toHaveValue(
    "warning",
  );
  await expect(tableRows(page)).toHaveCount(7);
  state.generateFailure = 401;
  await page
    .getByRole("button", { name: "Generate reading", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login$/);
});

test("read failures retry; empty history and wrong-device sensors are distinct", async ({
  page,
}) => {
  const state = await setup(page);
  state.readFailure = true;
  await page.goto(historyPath);
  await expect(page.getByRole("alert")).toContainText(
    "History temporarily unavailable",
  );
  state.readFailure = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(tableRows(page)).toHaveCount(25);
  await page.goto(basePath + "/sensors/21");
  await expect(
    page.getByRole("heading", { name: "Waiting for the first reading" }),
  ).toBeVisible();
  await expect(
    page.getByText("Sensor disabled", { exact: true }),
  ).toBeVisible();
  await page.goto(basePath + "/sensors/999");
  await expect(
    page.getByRole("heading", { name: "Sensor not found" }),
  ).toBeVisible();
  expect(state.calls.some((call) => call.path === "/readings/999")).toBe(false);
});

test("large histories bound table and chart size, invalid values remain unavailable", async ({
  page,
}) => {
  const state = await setup(page);
  state.readings = Array.from({ length: 5000 }, (_, i) => ({
    reading_id: i + 1,
    sensor_id: 20,
    reading_time: new Date(Date.UTC(2026, 8, 25, 0, i)).toISOString(),
    reading_value: i === 2222 ? 70 : 22,
    quality_flag: "good",
  }));
  state.readings.push({
    reading_id: 6000,
    sensor_id: 20,
    reading_time: "2026-10-01T12:00:00Z",
    reading_value: null,
    quality_flag: null,
  });
  await page.goto(historyPath + "?page=999999&from=2026-99-99");
  await expect(
    page.getByRole("navigation", { name: "Pagination" }),
  ).toContainText("Page 201 of 201");
  expect(
    await page.locator(".reading-chart circle").count(),
  ).toBeLessThanOrEqual(180);
  await expect(
    page.getByRole("region", { name: "Filtered reading summary" }),
  ).toContainText("70");
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(tableRows(page)).toHaveCount(25);
  await expect(tableRows(page).first().locator(".reading-value")).toHaveText(
    "—",
  );
  await expect(tableRows(page).first()).toContainText("Unavailable");
});

test("ordinary user cannot access the operator simulator or request its data", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/simulator");
  await expect(
    page.getByRole("heading", { name: "Access restricted" }),
  ).toBeVisible();
  expect(state.calls.some((call) => call.path === "/technician/sensors")).toBe(
    false,
  );
  await expect(
    page.getByRole("link", { name: "Simulator", exact: true }),
  ).toHaveCount(0);
});

test("operator simulator supports search, single readings, and explicit all-home bulk confirmation", async ({
  page,
}) => {
  const state = await setup(page, "technician");
  state.extraSensors = true;
  await page.goto("/simulator");
  await page
    .getByRole("searchbox", { name: "Search simulator sensors" })
    .fill("OTHER-002");
  const table = page.getByRole("region", { name: "Simulator sensor table" });
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await table.getByRole("button", { name: /Generate Temperature/ }).click();
  await expect(page.getByRole("status")).toContainText("Country house");
  expect(
    state.calls.find((call) => call.path === "/readings/simulate")?.body,
  ).toEqual({ sensor_id: 50 });
  await page
    .getByRole("button", { name: "Generate dataset", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("all homes");
  await expect(page.getByRole("dialog")).toContainText(
    "filters on the page do not limit",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(
    state.calls.some((call) => call.path === "/readings/simulate-bulk"),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Generate dataset", exact: true })
    .click();
  await page.getByLabel("Number of readings").fill("0");
  await page.getByRole("button", { name: "Generate across all homes" }).click();
  expect(
    state.calls.some((call) => call.path === "/readings/simulate-bulk"),
  ).toBe(false);
  await page.getByLabel("Number of readings").fill("1.5");
  await page.getByRole("button", { name: "Generate across all homes" }).click();
  expect(
    state.calls.some((call) => call.path === "/readings/simulate-bulk"),
  ).toBe(false);
  await page.getByLabel("Number of readings").fill("50");
  state.bulkFailure = true;
  await page.getByRole("button", { name: "Generate across all homes" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Dataset could not be generated",
  );
  await expect(page.getByLabel("Number of readings")).toHaveValue("50");
  state.bulkFailure = false;
  await page.getByRole("button", { name: "Generate across all homes" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "50 readings generated across 3 sensors",
  );
  expect(
    state.calls.filter((call) => call.path === "/readings/simulate-bulk").at(-1)
      ?.body,
  ).toEqual({ count: 50 });
});

test("reading and simulator screens fit mobile widths with intentional table scrolling", async ({
  page,
}) => {
  await setup(page, "admin");
  await page.goto(historyPath);
  await expect(tableRows(page)).toHaveCount(25);
  await page.screenshot({
    path: "test-results/readings-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("button", { name: "Open navigation" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/readings-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.goto("/simulator");
  await expect(
    page.getByRole("region", { name: "Simulator sensor table" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/simulator-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Generate dataset", exact: true })
    .click();
  await expect(page.getByLabel("Number of readings")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/bulk-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Generate dataset", exact: true }),
  ).toBeFocused();
});

test("range boundaries, invalid numbers, dates and formula-safe CSV keep their meaning", () => {
  expect(rangeState("18", sensor)).toBe("within");
  expect(rangeState("26", sensor)).toBe("within");
  expect(rangeState("26.01", sensor)).toBe("outside");
  expect(rangeState(null, sensor)).toBe("unknown");
  expect(rangeState("", sensor)).toBe("unknown");
  expect(rangeState("0", { normal_min: null, normal_max: null })).toBe(
    "unconfigured",
  );
  expect(rangeState("0", { normal_min: null, normal_max: 0 })).toBe("within");
  expect(rangeState("2", { normal_min: 3, normal_max: 1 })).toBe("unknown");
  expect(numeric("Infinity")).toBeNull();
  expect(dateBoundary("2026-02-30")).toBeNull();
  const csv = readingsCsv(
    [
      {
        reading_id: 1,
        sensor_id: 20,
        reading_time: "2026-09-25T12:00:00Z",
        reading_value: "-4",
        quality_flag: "=cmd",
      },
    ],
    { ...sensor, unit: "=1+1" },
  );
  expect(csv).toContain('"-4"');
  expect(csv).toContain('"\'=1+1"');
  expect(csv).toContain('"\'=cmd"');
});
