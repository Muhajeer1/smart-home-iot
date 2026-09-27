import { test, expect, type Page } from "@playwright/test";
import type { Device, Home, Room, Sensor } from "../src/lib/types";

async function setup(page: Page, role = "user") {
  const state = {
    homes: [
      {
        home_id: 6,
        owner_user_id: 2,
        home_name: "City apartment",
        address_text: "Istanbul",
      },
      {
        home_id: 7,
        owner_user_id: 2,
        home_name: "Country house",
        address_text: "Izmir",
      },
    ] as Home[],
    rooms: [
      { room_id: 4, home_id: 6, room_name: "Living room", floor_no: 0 },
      { room_id: 5, home_id: 6, room_name: "Bedroom", floor_no: 1 },
      { room_id: 8, home_id: 7, room_name: "Study", floor_no: -1 },
    ] as Room[],
    devices: [
      {
        device_id: 10,
        room_id: 4,
        device_type: "thermostat",
        brand_model: "Nest Learning Thermostat",
        serial_no: "NEST-001",
        status: "active",
        installed_at: "2026-09-20T12:00:00Z",
      },
      {
        device_id: 11,
        room_id: 4,
        device_type: "light",
        brand_model: "Philips Hue",
        serial_no: "HUE-002",
        status: "offline",
        installed_at: null,
      },
      {
        device_id: 12,
        room_id: 8,
        device_type: "camera",
        brand_model: "Study camera",
        serial_no: "CAM-003",
        status: "inactive",
        installed_at: null,
      },
    ] as Device[],
    sensors: [
      {
        sensor_id: 20,
        device_id: 10,
        sensor_type: "temperature",
        unit: "C",
        normal_min: "18.00",
        normal_max: "26.00",
        is_active: true,
      },
      {
        sensor_id: 21,
        device_id: 10,
        sensor_type: "humidity",
        unit: "%",
        normal_min: "30.00",
        normal_max: "60.00",
        is_active: true,
      },
    ] as Sensor[],
    requests: [] as {
      method: string;
      path: string;
      body: Record<string, unknown> | null;
    }[],
    roomFailure: false,
    deviceFailure: 0,
    deleteFailure: false,
    listFailure: false,
    defaults: 0,
  };
  await page.route("**/backend/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/backend", "");
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : null;
    state.requests.push({ method, path, body });
    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, json: data });
    if (path === "/me")
      return json({
        user: {
          user_id: 2,
          full_name: "Aylin Demir",
          email: "aylin@example.com",
          role_name: role,
          role_id: role === "admin" ? "1" : role === "technician" ? "3" : "2",
        },
      });
    if (path === "/api/homes") return json(state.homes);
    if (path === "/analytics/dashboard-summary")
      return json({
        home_count: state.homes.length,
        room_count: state.rooms.length,
        device_count: state.devices.length,
      });
    if (method === "GET" && path.startsWith("/rooms/"))
      return json(
        state.rooms.filter(
          (room) => room.home_id === Number(path.split("/")[2]),
        ),
      );
    if (method === "GET" && path.startsWith("/devices/"))
      return state.listFailure
        ? json({ error: "Devices temporarily unavailable" }, 500)
        : json(
            state.devices.filter(
              (device) => device.room_id === Number(path.split("/")[2]),
            ),
          );
    if (method === "GET" && path.startsWith("/sensors/"))
      return json(
        state.sensors.filter(
          (sensor) => sensor.device_id === Number(path.split("/")[2]),
        ),
      );
    if (method === "POST" && path.endsWith("/default-sensors")) {
      state.defaults++;
      const device_id = Number(path.split("/")[2]);
      const exists = state.sensors.some(
        (sensor) => sensor.device_id === device_id,
      );
      if (!exists)
        state.sensors.push({
          sensor_id: 30,
          device_id,
          sensor_type: "light",
          unit: "lux",
          normal_min: 100,
          normal_max: 800,
          is_active: true,
        });
      return json(
        {
          sensor_count: exists ? 0 : 1,
          message: exists
            ? "Default sensors already exist for this device."
            : "1 default sensors created.",
        },
        201,
      );
    }
    if (["POST", "PUT"].includes(method) && path.startsWith("/rooms")) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (state.roomFailure)
        return json({ error: "Room could not be saved." }, 409);
      if (method === "POST") {
        const room = { ...body, room_id: 20 } as Room;
        state.rooms.unshift(room);
        return json({ room }, 201);
      }
      const room = state.rooms.find(
        (item) => item.room_id === Number(path.split("/")[2]),
      )!;
      Object.assign(room, body);
      return json({ room });
    }
    if (["POST", "PUT"].includes(method) && path.startsWith("/devices")) {
      await new Promise((resolve) => setTimeout(resolve, 250));
      if (state.deviceFailure)
        return json(
          {
            error:
              state.deviceFailure === 403
                ? "Only admin or technician can change device state."
                : "This serial number is already used.",
          },
          state.deviceFailure,
        );
      if (method === "POST") {
        const device = {
          ...body,
          device_id: 30,
          installed_at: "2026-09-27T12:00:00Z",
        } as Device;
        state.devices.unshift(device);
        state.sensors.push({
          sensor_id: 40,
          device_id: 30,
          sensor_type: "temperature",
          unit: "C",
          normal_min: 18,
          normal_max: 26,
          is_active: true,
        });
        return json(
          {
            device,
            message: "Device created successfully with default sensors",
          },
          201,
        );
      }
      const device = state.devices.find(
        (item) => item.device_id === Number(path.split("/")[2]),
      )!;
      Object.assign(device, body);
      return json({ device, message: "Device updated successfully" });
    }
    if (method === "DELETE" && path.startsWith("/devices/")) {
      if (state.deleteFailure)
        return json({ error: "Device could not be deleted." }, 500);
      state.devices = state.devices.filter(
        (item) => item.device_id !== Number(path.split("/")[2]),
      );
      return json({ message: "Device deleted successfully" });
    }
    return json({ error: `Unexpected ${method} ${path}` }, 500);
  });
  return state;
}

const roomPath = "/homes/6/rooms/4";
const devicePath = `${roomPath}/devices/10`;

test("room create trims input, accepts basement floors, updates counts and supports edit after refresh", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/homes/6");
  await page.getByRole("button", { name: "Add room", exact: true }).click();
  await expect(page.getByLabel("Room name")).toBeFocused();
  await page.getByLabel("Room name").fill("  Workshop  ");
  await page.getByLabel("Floor", { exact: true }).fill("-1");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add room", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Workshop", exact: true }),
  ).toBeVisible();
  expect(
    state.requests
      .filter((r) => r.method === "POST" && r.path === "/rooms")
      .map((r) => r.body),
  ).toEqual([{ home_id: 6, room_name: "Workshop", floor_no: -1 }]);
  await page.reload();
  await page
    .getByRole("button", { name: "Edit Workshop", exact: true })
    .click();
  await expect(page.getByLabel("Floor", { exact: true })).toHaveValue("-1");
  await page.getByLabel("Room name").fill("Creative studio");
  await page.getByLabel("Floor", { exact: true }).fill("0");
  await page.getByRole("button", { name: "Save room", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Creative studio", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Creative studio", exact: true })
    .click();
  await expect(page).toHaveURL(/\/homes\/6\/rooms\/20$/);
  await expect(
    page.getByRole("button", { name: "Add your first device" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Rooms" })
      .locator(".stat-number"),
  ).toHaveText("4");
});

test("room validation, cancel, and failed save preserve the original record and draft", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/homes/6");
  await page.getByRole("button", { name: "Edit Living room" }).click();
  await page.getByLabel("Room name").fill("   ");
  await page.getByRole("button", { name: "Save room" }).click();
  await expect(page.getByRole("alert")).toContainText("room name");
  expect(state.requests.filter((r) => r.method === "PUT")).toHaveLength(0);
  await page.getByLabel("Room name").fill("Family room");
  state.roomFailure = true;
  await page.getByRole("button", { name: "Save room" }).click();
  await expect(page.getByRole("alert")).toContainText("could not be saved");
  await expect(page.getByLabel("Room name")).toHaveValue("Family room");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Living room" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit Living room" }).click();
  await expect(page.getByLabel("Room name")).toHaveValue("Living room");
  state.roomFailure = false;
  await page.getByLabel("Room name").fill("<b>Family</b>");
  await page.getByRole("button", { name: "Save room" }).click();
  await expect(
    page.getByRole("heading", { name: "<b>Family</b>", exact: true }),
  ).toBeVisible();
});

test("device creation keeps failed input and connects a room to its new device and sensors", async ({
  page,
}) => {
  const state = await setup(page);
  state.deviceFailure = 409;
  await page.goto(roomPath);
  await page.getByRole("button", { name: "Add device", exact: true }).click();
  await expect(page.getByLabel("Brand / model")).toBeFocused();
  await page.getByLabel("Device type").selectOption("thermostat");
  await page.getByLabel("Brand / model").fill("  New thermostat  ");
  await page.getByLabel("Serial number").fill("  NEW-001  ");
  await page.getByLabel("Initial state").selectOption("inactive");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add device", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("serial number");
  await expect(page.getByLabel("Serial number")).toHaveValue("  NEW-001  ");
  state.deviceFailure = 0;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add device", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "New thermostat", exact: true }),
  ).toBeVisible();
  const creates = state.requests.filter(
    (r) => r.method === "POST" && r.path === "/devices",
  );
  expect(creates).toHaveLength(2);
  expect(creates[1].body).toEqual({
    room_id: 4,
    device_type: "thermostat",
    brand_model: "New thermostat",
    serial_no: "NEW-001",
    status: "inactive",
  });
  await page.getByRole("link", { name: "New thermostat", exact: true }).click();
  await expect(page).toHaveURL(/\/devices\/30$/);
  await expect(
    page.getByRole("heading", { name: "Temperature", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "New thermostat", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Living room" })
    .click();
  await expect(
    page.getByRole("heading", { name: "New thermostat", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page
      .locator(".stat-card")
      .filter({ hasText: "Devices" })
      .locator(".stat-number"),
  ).toHaveText("4");
});

for (const role of ["admin", "technician"]) {
  test(`${role} can update model and state while type and serial remain immutable`, async ({
    page,
  }) => {
    const state = await setup(page, role);
    await page.goto(devicePath);
    await page
      .getByRole("button", { name: "Edit device", exact: true })
      .click();
    await expect(page.getByLabel("Device type")).toBeDisabled();
    await expect(page.getByLabel("Serial number")).toBeDisabled();
    await page.getByLabel("Brand / model").fill("Nest revised");
    await page
      .getByLabel("Device state", { exact: true })
      .selectOption("maintenance");
    await page.getByRole("button", { name: "Save device" }).click();
    await expect(
      page.getByRole("heading", { name: "Nest revised" }),
    ).toBeVisible();
    await expect(page.getByText("Maintenance", { exact: true })).toBeVisible();
    expect(
      state.requests.filter((r) => r.method === "PUT").map((r) => r.body),
    ).toEqual([
      {
        device_type: "thermostat",
        brand_model: "Nest revised",
        status: "maintenance",
      },
    ]);
    expect(state.devices[0].serial_no).toBe("NEST-001");
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "Nest revised" }),
    ).toBeVisible();
  });
}

test("regular users have no edit-state action", async ({ page }) => {
  await setup(page);
  await page.goto(roomPath);
  await expect(
    page.getByRole("heading", { name: "Nest Learning Thermostat" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit Nest Learning Thermostat" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Nest Learning Thermostat" }).click();
  await expect(
    page.getByRole("heading", { name: "Temperature" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit device", exact: true }),
  ).toHaveCount(0);
});

test("server denial keeps device edits and permits retry", async ({ page }) => {
  const state = await setup(page, "technician");
  state.deviceFailure = 403;
  await page.goto(devicePath);
  await page.getByRole("button", { name: "Edit device", exact: true }).click();
  await page
    .getByLabel("Device state", { exact: true })
    .selectOption("offline");
  await page.getByRole("button", { name: "Save device" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Only admin or technician",
  );
  await expect(page.getByLabel("Device state", { exact: true })).toHaveValue(
    "offline",
  );
  state.deviceFailure = 0;
  await page.getByRole("button", { name: "Save device" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
});

test("device search and state filters combine and recover from a list error", async ({
  page,
}) => {
  const state = await setup(page);
  state.listFailure = true;
  await page.goto(roomPath);
  await expect(page.getByRole("alert")).toContainText(
    "temporarily unavailable",
  );
  await expect(
    page.getByRole("button", { name: "Add device", exact: true }),
  ).toBeDisabled();
  state.listFailure = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByLabel("Filter device state").selectOption("offline");
  await expect(
    page.getByRole("heading", { name: "Philips Hue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nest Learning Thermostat" }),
  ).toHaveCount(0);
  await page
    .getByRole("searchbox", { name: "Search devices" })
    .fill("NEST-001");
  await expect(
    page.getByRole("heading", { name: "No devices found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(
    page.getByRole("heading", { name: "Nest Learning Thermostat" }),
  ).toBeVisible();
});

test("delete cancellation and failure preserve device; success returns to room", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto(devicePath);
  await page
    .getByRole("button", { name: "Delete device", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Keep device" })).toBeFocused();
  await page.getByRole("button", { name: "Keep device" }).click();
  expect(state.requests.filter((r) => r.method === "DELETE")).toHaveLength(0);
  state.deleteFailure = true;
  await page
    .getByRole("button", { name: "Delete device", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete device", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("could not be deleted");
  state.deleteFailure = false;
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete device", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`${roomPath}$`));
  await expect(
    page.getByRole("heading", { name: "Philips Hue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Nest Learning Thermostat" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Nest Learning Thermostat" }),
  ).toHaveCount(0);
});

test("default sensors refresh the list and can be requested without duplicating rows", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto(`${roomPath}/devices/11`);
  await expect(
    page.getByRole("heading", { name: "No sensors yet" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add default sensors" }).click();
  await expect(
    page.getByRole("heading", { name: "Light", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add default sensors" }).click();
  await expect(page.getByRole("status")).toContainText("already exist");
  expect(state.defaults).toBe(2);
  await expect(page.locator(".sensor-card")).toHaveCount(1);
});

test("invalid parent-child paths stop before requesting unrelated descendants", async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto("/homes/6/rooms/8");
  await expect(
    page.getByRole("heading", { name: "Room not found" }),
  ).toBeVisible();
  expect(state.requests.some((r) => r.path === "/devices/8")).toBe(false);
  await page.goto("/homes/6/rooms/4/devices/12");
  await expect(
    page.getByRole("heading", { name: "Device not found" }),
  ).toBeVisible();
  expect(state.requests.some((r) => r.path === "/sensors/12")).toBe(false);
  await page.goto("/homes/7/rooms/8/devices/12");
  await expect(
    page.getByRole("heading", { name: "Study camera" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Study camera" }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});

test("room and device pages and modals fit desktop and mobile layouts", async ({
  page,
}) => {
  await setup(page, "technician");
  await page.goto("/homes/6");
  await expect(
    page.getByRole("heading", { name: "Living room" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/rooms-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("link", { name: "Living room", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nest Learning Thermostat" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/devices-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("link", { name: "Nest Learning Thermostat", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Temperature", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/device-detail-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/device-detail-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Edit device", exact: true }).click();
  await expect(page.getByLabel("Brand / model")).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/device-edit-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Edit device", exact: true }),
  ).toBeFocused();
});
