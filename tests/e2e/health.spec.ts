import { test, expect } from "@playwright/test";

test.describe("Ensemble Manager — testy podstawowe", () => {
    test("E2E-01: strona główna i API Health działają", async ({
        page,
        request,
    }) => {
        const pageResponse = await page.goto("/");
        expect(pageResponse).not.toBeNull();
        expect(pageResponse?.status()).toBe(200);
        await expect(page.locator("body")).toBeVisible();

        const apiResponse = await request.get("/api/health");
        expect(apiResponse.status()).toBe(200);

        const data = await apiResponse.json();
        expect(data.status).toBe("ok");
        expect(data.supabase).toBe("connected");
    });
});
