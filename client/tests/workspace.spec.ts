import { test, expect, type Page } from "@playwright/test";

const user = {
  user_id: 2,
  full_name: "Aylin Demir",
  email: "aylin@example.com",
  role_name: "user",
  role_id: "2",
};
const initialHomes = [
  {
    home_id: 6,
    owner_user_id: 2,
    home_name: "City apartment",
    address_text: "Kadıköy, Istanbul",
    created_at: "2026-09-01",
  },
  {
    home_id: 5,
    owner_user_id: 2,
    home_name: "Weekend retreat",
    address_text: "Urla, İzmir",
    created_at: "2026-08-01",
  },
];

async function mockApi(page: Page, authenticated = true) {
  const state = {
    authenticated,
    homes: structuredClone(initialHomes),
    updates: [] as unknown[],
    failSave: false,
    failSession: false,
    expire: false,
    registrations: [] as unknown[],
  };
  await page.route("**/backend/**", async (route) => {
    const path = new URL(route.request().url()).pathname.replace(
      "/backend",
      "",
    );
    const method = route.request().method();
    const json = (data: unknown, status = 200) =>
      route.fulfill({ status, json: data });
    if (path === "/login") {
      if (route.request().postDataJSON().password !== "correct-password")
        return json({ error: "Wrong credentials" }, 401);
      state.authenticated = true;
      return json({ user });
    }
    if (path === "/register") {
      state.registrations.push(route.request().postDataJSON());
      return json({ message: "Registration successful" }, 201);
    }
    if (path === "/logout") {
      state.authenticated = false;
      return json({ message: "Logged out" });
    }
    if (state.failSession && path === "/me")
      return json({ error: "Database unavailable" }, 500);
    if (!state.authenticated || state.expire)
      return json({ error: "Please log in again." }, 401);
    if (path === "/me") return json({ user });
    if (path === "/api/homes") return json(state.homes);
    if (path === "/analytics/dashboard-summary")
      return json({
        home_count: state.homes.length,
        room_count: 8,
        device_count: 14,
      });
    if (path.startsWith("/rooms/"))
      return json([
        { room_id: 4, home_id: 6, room_name: "Living room", floor_no: 0 },
        { room_id: 5, home_id: 6, room_name: "Bedroom", floor_no: 1 },
      ]);
    if (method === "POST" && path === "/homes") {
      const home = {
        ...route.request().postDataJSON(),
        home_id: 10,
        owner_user_id: 2,
      };
      state.homes.unshift(home);
      return json({ home }, 201);
    }
    if (method === "PUT" && path.startsWith("/homes/")) {
      state.updates.push(route.request().postDataJSON());
      await new Promise((resolve) => setTimeout(resolve, 150));
      if (state.failSave)
        return json({ error: "A home with this name already exists." }, 409);
      const id = Number(path.split("/").pop());
      state.homes = state.homes.map((home) =>
        home.home_id === id
          ? { ...home, ...route.request().postDataJSON() }
          : home,
      );
      return json({ home: state.homes.find((home) => home.home_id === id) });
    }
    if (method === "DELETE" && path.startsWith("/homes/")) {
      state.homes = state.homes.filter(
        (home) => home.home_id !== Number(path.split("/").pop()),
      );
      return json({ message: "Home deleted successfully" });
    }
    return json({ error: `Unmocked endpoint: ${method} ${path}` }, 500);
  });
  return state;
}

test("login keeps the intended route, shows wrong credentials, and logout clears the workspace", async ({
  page,
}) => {
  await mockApi(page, false);
  await page.goto("/homes/6");
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill("wrong");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Wrong credentials");
  await page.getByLabel("Password", { exact: true }).fill("correct-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/homes\/6$/);
  await expect(
    page.getByRole("heading", { name: "City apartment" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("registration uses the existing contract and asks the user to sign in", async ({
  page,
}) => {
  const state = await mockApi(page, false);
  await page.goto("/register");
  await page.getByLabel("Full name").fill("New User");
  await page.getByLabel("Email address").fill("new@example.com");
  await page.getByLabel("Password", { exact: true }).fill("new-password");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(
    page.getByRole("heading", { name: "You’re all set." }),
  ).toBeVisible();
  expect(state.registrations).toEqual([
    {
      full_name: "New User",
      email: "new@example.com",
      password: "new-password",
    },
  ]);
  await page.getByRole("link", { name: "Continue to sign in" }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test("editing trims values, prevents duplicate submission and persists after reload", async ({
  page,
}) => {
  const state = await mockApi(page);
  await page.goto("/homes");
  await page
    .getByRole("button", { name: "Edit City apartment", exact: true })
    .click();
  await page.getByLabel("Home name").fill("  Our home  ");
  await page.getByLabel("Address", { exact: true }).fill("  New address  ");
  const save = page.getByRole("button", { name: "Save changes" });
  await save.click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(state.updates).toEqual([
    { home_name: "Our home", address_text: "New address" },
  ]);
  expect(state.homes[0].owner_user_id).toBe(2);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Our home", exact: true }),
  ).toBeVisible();
});

test("failed saves preserve the draft and allow retry; cancel discards it", async ({
  page,
}) => {
  const state = await mockApi(page);
  state.failSave = true;
  await page.goto("/homes");
  await page.getByRole("button", { name: "Edit City apartment" }).click();
  await page.getByLabel("Home name").fill("My draft");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toContainText("already exists");
  await expect(page.getByLabel("Home name")).toHaveValue("My draft");
  state.failSave = false;
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Edit My draft" }).click();
  await page.getByLabel("Home name").fill("Discard me");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Edit My draft" }).click();
  await expect(page.getByLabel("Home name")).toHaveValue("My draft");
});

test("Unicode lengths match the server and user text is rendered literally", async ({
  page,
}) => {
  const state = await mockApi(page);
  await page.goto("/homes");
  await page.getByRole("button", { name: "Edit City apartment" }).click();
  await page.getByLabel("Home name").fill("🏡".repeat(61));
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("alert")).toContainText("60 characters");
  expect(state.updates).toHaveLength(0);
  await page.getByLabel("Home name").fill("🏡".repeat(60));
  await page
    .getByLabel("Address", { exact: true })
    .fill("<img src=x onerror=alert(1)>");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByText("<img src=x onerror=alert(1)>", { exact: true }),
  ).toBeVisible();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  expect(state.updates).toHaveLength(1);
});

test("create, search, clear, and confirm deletion including the empty state", async ({
  page,
}) => {
  const state = await mockApi(page);
  state.homes = [];
  await page.goto("/homes");
  await page.getByRole("button", { name: "Add your first home" }).click();
  await page.getByLabel("Home name").fill("First home");
  await page.getByLabel("Address", { exact: true }).fill("Istanbul");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add home", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "First home", exact: true }),
  ).toBeVisible();
  await page.getByRole("searchbox").fill("not here");
  await expect(
    page.getByRole("heading", { name: "No homes found" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Delete First home" }).click();
  await page.getByRole("button", { name: "Keep home" }).click();
  expect(state.homes).toHaveLength(1);
  await page.getByRole("button", { name: "Delete First home" }).click();
  await page.getByRole("button", { name: "Delete home", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add your first home" }),
  ).toBeVisible();
  expect(state.homes).toHaveLength(0);
});

test("session failures offer retry while expired sessions require login", async ({
  page,
}) => {
  const state = await mockApi(page);
  state.failSession = true;
  await page.goto("/homes");
  await expect(page.getByRole("alert")).toContainText("Database unavailable");
  await expect(page).toHaveURL(/\/homes$/);
  state.failSession = false;
  await page.getByRole("button", { name: "Try again" }).click();
  await page.getByRole("button", { name: "Edit City apartment" }).click();
  state.expire = true;
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole("heading", { name: "City apartment" }),
  ).not.toBeVisible();
});

test("deep links reload without localStorage and inaccessible homes are not queried", async ({
  page,
}) => {
  await mockApi(page);
  await page.goto("/homes/6");
  await expect(
    page.getByRole("heading", { name: "Living room" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "City apartment" }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.goto("/homes/999");
  await expect(
    page.getByRole("heading", { name: "Home not found" }),
  ).toBeVisible();
});

test("responsive layout and keyboard dialog navigation", async ({ page }) => {
  await mockApi(page);
  await page.goto("/homes");
  await expect(
    page.getByRole("heading", { name: "City apartment" }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/homes-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Edit City apartment" }).click();
  await expect(page.getByLabel("Home name")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Edit City apartment" }),
  ).toBeFocused();
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
    path: "test-results/homes-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("link", { name: "Overview", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close navigation", exact: true })
    .last()
    .click();
  await page.getByRole("button", { name: "Edit City apartment" }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/home-edit-mobile.png",
    fullPage: true,
  });
});

test("login design at desktop and mobile widths", async ({ page }) => {
  await mockApi(page, false);
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "Good to have you back." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
});
