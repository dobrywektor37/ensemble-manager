import { test, expect } from "@playwright/test";

test.describe("Ensemble Manager — publiczny interfejs", () => {
    test("E2E-05: strona główna prowadzi do logowania", async ({ page }) => {
        await page.goto("/");
        await expect(page.getByRole("heading", { level: 1 })).toContainText("Twój zespół.");
        await page.getByRole("link", { name: "Przejdź do logowania" }).click();
        await expect(page).toHaveURL(/\/login\/?$/);
        await expect(page.getByRole("heading", { name: "Ensemble Manager" })).toBeVisible();
    });

    test("E2E-06: prywatne strony przekierowują do logowania", async ({ page }) => {
        const privateRoutes = [
            "/dashboard",
            "/events",
            "/events/new",
            "/absences",
            "/absences/new",
        ];

        for (const route of privateRoutes) {
            await page.goto(route);
            await expect(page).toHaveURL(/\/login\/?$/);
            await expect(page.locator("#email")).toBeVisible();
        }
    });

    test("E2E-07: formularz logowania odrzuca nieprawidłowy e-mail", async ({ page }) => {
        await page.goto("/login");
        await page.locator("#email").fill("niepoprawny-email");
        await page.locator("#password").fill("testowe-haslo");
        await page.getByRole("button", { name: "Zaloguj się" }).click();

        const isInvalid = await page.locator("#email").evaluate((element) =>
            (element as HTMLInputElement).validity.typeMismatch
        );
        expect(isInvalid).toBe(true);
        await expect(page).toHaveURL(/\/login\/?$/);
    });

    test("E2E-08: na ekranie mobilnym działa przejście do logowania", async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.goto("/");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await page.getByRole("link", { name: "Przejdź do logowania" }).click();
        await expect(page.locator("#email")).toBeVisible();
        await expect(page.locator("#password")).toBeVisible();
        await expect(page.getByRole("button", { name: "Zaloguj się" })).toBeVisible();
    });
});
