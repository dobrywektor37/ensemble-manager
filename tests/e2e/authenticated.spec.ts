import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { test, expect, type Page } from "@playwright/test";

// Wczytujemy tylko lokalne dane kont TESTOWYCH.
// Plik .env.e2e.local jest ignorowany przez Git.
const envPath = resolve(process.cwd(), ".env.e2e.local");
if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
}

const emailA = process.env.E2E_TEST_EMAIL_A;
const passwordA = process.env.E2E_TEST_PASSWORD_A;
const emailB = process.env.E2E_TEST_EMAIL_B;
const passwordB = process.env.E2E_TEST_PASSWORD_B;
const writesEnabled = process.env.E2E_ALLOW_WRITES === "YES";

async function login(page: Page, email: string, password: string) {
    await page.goto("/login");
    await page.locator("#email").fill(email);
    await page.locator("#password").fill(password);
    await page.getByRole("button", { name: "Zaloguj się" }).click();
    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Witaj w panelu zespołu." })).toBeVisible();
}

// Nigdy nie uruchamiamy operacji zapisu bez osobnego, świadomego opt-in.
const canTestA = Boolean(writesEnabled && emailA && passwordA);
const canTestAB = Boolean(canTestA && emailB && passwordB && emailA !== emailB);

test.describe("Ensemble Manager — testy na osobnych kontach testowych", () => {
    test("E2E-09: pełny CRUD przez interfejs użytkownika", async ({ page }) => {
        test.skip(!canTestA, "Wymaga E2E_ALLOW_WRITES=YES i konta testowego A.");

        await login(page, emailA!, passwordA!);

        const suffix = randomUUID().slice(0, 8);
        const title = `E2E wydarzenie ${suffix}`;
        const editedTitle = `E2E wydarzenie edytowane ${suffix}`;
        const member = `E2E Uczestnik ${suffix}`;
        const editedMember = `E2E Zmiana ${suffix}`;
        let eventId: string | undefined;
        let absenceId: string | undefined;

        try {
            // Wydarzenie: CREATE.
            await page.goto("/events/new");
            await page.locator("#event-title").fill(title);
            await page.locator("#event-type").selectOption("rehearsal");
            await page.locator("#event-start").fill("2030-04-15T18:00");
            await page.locator("#event-end").fill("2030-04-15T20:00");
            await page.locator("#event-location").fill("Sala E2E");

            const createdEventResponsePromise = page.waitForResponse(
                (r) => r.url().endsWith("/api/events") && r.request().method() === "POST"
            );
            await page.getByRole("button", { name: "Zapisz wydarzenie" }).click();
            const createdEventResponse = await createdEventResponsePromise;
            expect(createdEventResponse.status()).toBe(201);
            const createdEvent = await createdEventResponse.json() as { data: { id: string } };
            eventId = createdEvent.data.id;
            await expect(page.getByRole("heading", { name: title })).toBeVisible();

            // Wydarzenie: UPDATE.
            await page.getByRole("link", { name: `Edytuj wydarzenie: ${title}` }).click();
            await page.locator("#event-title").fill(editedTitle);
            const updatedEventPromise = page.waitForResponse(
                (r) => r.url().endsWith(`/api/events/${eventId}`) && r.request().method() === "PATCH"
            );
            await page.getByRole("button", { name: "Zapisz zmiany" }).click();
            expect((await updatedEventPromise).status()).toBe(200);
            await expect(page.getByRole("heading", { name: editedTitle })).toBeVisible();

            // Nieobecność: CREATE.
            await page.goto("/absences/new");
            await page.locator("#absence-event").selectOption(eventId);
            await page.locator("#absence-member").fill(member);
            await page.locator("#absence-reason").fill("Powód testowy");
            const createdAbsencePromise = page.waitForResponse(
                (r) => r.url().endsWith("/api/absences") && r.request().method() === "POST"
            );
            await page.getByRole("button", { name: "Zgłoś nieobecność" }).click();
            const createdAbsenceResponse = await createdAbsencePromise;
            expect(createdAbsenceResponse.status()).toBe(201);
            const createdAbsence = await createdAbsenceResponse.json() as { data: { id: string } };
            absenceId = createdAbsence.data.id;
            await expect(page.getByRole("heading", { name: member })).toBeVisible();

            // Nieobecność: UPDATE.
            await page.getByRole("link", { name: `Edytuj nieobecność: ${member}` }).click();
            await page.locator("#absence-member").fill(editedMember);
            const updatedAbsencePromise = page.waitForResponse(
                (r) => r.url().endsWith(`/api/absences/${absenceId}`) && r.request().method() === "PATCH"
            );
            await page.getByRole("button", { name: "Zapisz zmiany" }).click();
            expect((await updatedAbsencePromise).status()).toBe(200);
            await expect(page.getByRole("heading", { name: editedMember })).toBeVisible();

            // Nieobecność: DELETE z oknem potwierdzenia.
            await page.getByRole("button", { name: `Usuń nieobecność: ${editedMember}` }).click();
            const deletedAbsencePromise = page.waitForResponse(
                (r) => r.url().endsWith(`/api/absences/${absenceId}`) && r.request().method() === "DELETE"
            );
            await page.getByRole("button", { name: "Tak, usuń nieobecność" }).click();
            expect((await deletedAbsencePromise).status()).toBe(204);
            await expect(page.getByRole("heading", { name: editedMember })).toHaveCount(0);
            absenceId = undefined;

            // Wydarzenie: DELETE z oknem potwierdzenia.
            await page.goto("/events");
            await page.getByRole("button", { name: `Usuń wydarzenie: ${editedTitle}` }).click();
            const deletedEventPromise = page.waitForResponse(
                (r) => r.url().endsWith(`/api/events/${eventId}`) && r.request().method() === "DELETE"
            );
            await page.getByRole("button", { name: "Tak, usuń wydarzenie" }).click();
            expect((await deletedEventPromise).status()).toBe(204);
            await expect(page.getByRole("heading", { name: editedTitle })).toHaveCount(0);
            eventId = undefined;
        } finally {
            // Awaryjne sprzątanie WYŁĄCZNIE rekordów utworzonych przez ten test.
            if (absenceId) {
                const response = await page.request.delete(`/api/absences/${absenceId}`);
                expect([204, 404]).toContain(response.status());
            }
            if (eventId) {
                const response = await page.request.delete(`/api/events/${eventId}`);
                expect([204, 404]).toContain(response.status());
            }
        }
    });

    test("E2E-10: Zespół B nie ma dostępu do rekordów Zespołu A", async ({ page, browser }) => {
        test.skip(!canTestAB, "Wymaga dwóch różnych kont testowych i E2E_ALLOW_WRITES=YES.");

        await login(page, emailA!, passwordA!);
        const contextB = await browser.newContext({ baseURL: "http://localhost:3000" });
        const pageB = await contextB.newPage();
        let eventId: string | undefined;
        let absenceId: string | undefined;

        try {
            await login(pageB, emailB!, passwordB!);

            // Tworzymy tylko własne, tymczasowe rekordy w Zespole A.
            const eventResponse = await page.request.post("/api/events", {
                data: {
                    title: `E2E izolacja ${randomUUID().slice(0, 8)}`,
                    type: "rehearsal",
                    starts_at: "2030-04-15T18:00:00Z",
                    ends_at: "2030-04-15T20:00:00Z",
                },
            });
            expect(eventResponse.status()).toBe(201);
            eventId = (await eventResponse.json() as { data: { id: string } }).data.id;

            const absenceResponse = await page.request.post("/api/absences", {
                data: { event_id: eventId, member_name: "E2E izolacja", reason: "Test RLS" },
            });
            expect(absenceResponse.status()).toBe(201);
            absenceId = (await absenceResponse.json() as { data: { id: string } }).data.id;

            // Zespół B nie może odczytać, zmienić ani usunąć rekordów A.
            for (const endpoint of [`/api/events/${eventId}`, `/api/absences/${absenceId}`]) {
                expect((await pageB.request.get(endpoint)).status(), `GET ${endpoint}`).toBe(404);
                const data = endpoint.includes("/events/")
                    ? { title: "Nieuprawniona aktualizacja" }
                    : { member_name: "Nieuprawniona aktualizacja" };
                expect((await pageB.request.patch(endpoint, { data })).status(), `PATCH ${endpoint}`).toBe(404);
                expect((await pageB.request.delete(endpoint)).status(), `DELETE ${endpoint}`).toBe(404);
            }

            expect((await pageB.request.post("/api/absences", {
                data: { event_id: eventId, member_name: "E2E B", reason: "Niedozwolony POST" },
            })).status()).toBe(404);

            // Po próbach B rekordy A nadal istnieją.
            expect((await page.request.get(`/api/events/${eventId}`)).status()).toBe(200);
            expect((await page.request.get(`/api/absences/${absenceId}`)).status()).toBe(200);
        } finally {
            // Sprzątamy tylko UUID utworzone przez ten test, używając konta A.
            if (absenceId) {
                const response = await page.request.delete(`/api/absences/${absenceId}`);
                expect([204, 404]).toContain(response.status());
            }
            if (eventId) {
                const response = await page.request.delete(`/api/events/${eventId}`);
                expect([204, 404]).toContain(response.status());
            }
            await contextB.close();
        }
    });
});
