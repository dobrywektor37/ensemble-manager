import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { test, expect, type Page, type APIRequestContext } from "@playwright/test";

// Dane logowania sa odczytywane wylacznie z lokalnego pliku.
// Nie dodawaj .env.e2e.local do Git.
const envPath = resolve(process.cwd(), ".env.e2e.local");
if (existsSync(envPath)) {
    process.loadEnvFile(envPath);
}

const emailA = process.env.E2E_TEST_EMAIL_A;
const passwordA = process.env.E2E_TEST_PASSWORD_A;
const emailB = process.env.E2E_TEST_EMAIL_B;
const passwordB = process.env.E2E_TEST_PASSWORD_B;
const writesEnabled = process.env.E2E_ALLOW_WRITES === "YES";

const canTestA = Boolean(writesEnabled && emailA && passwordA);
const canTestAB = Boolean(canTestA && emailB && passwordB && emailA !== emailB);

// W App Router poprzednia strona moze przez chwile pozostawac w DOM
// z display:none. Wybieramy wylacznie widoczny formularz.
const visibleMain = (page: Page) => page.locator("main:visible");
const visibleField = (page: Page, id: string) =>
    page.locator(`main:visible #${id}`);

async function login(page: Page, email: string, password: string) {
    await page.goto("/login");
    await visibleField(page, "email").fill(email);
    await visibleField(page, "password").fill(password);
    await visibleMain(page).getByRole("button", { name: "Zaloguj się" }).click();

    await expect(page).toHaveURL(/\/dashboard\/?$/, { timeout: 20_000 });
    await expect(
        visibleMain(page).getByRole("heading", {
            name: "Witaj w panelu zespołu.",
        })
    ).toBeVisible();
}

// Sprzatanie dotyczy WYLACZNIE identyfikatorow zwroconych przez POST
// podczas aktualnego testu. Blad cleanup nie maskuje pierwotnego bledu.
async function cleanupRecord(request: APIRequestContext, endpoint: string) {
    try {
        const response = await request.delete(endpoint, { timeout: 10_000 });
        if (![204, 404].includes(response.status())) {
            console.warn(`E2E cleanup: ${endpoint} -> HTTP ${response.status()}`);
        }
    } catch (error) {
        console.warn(`E2E cleanup nie powiodl sie: ${endpoint}`, error);
    }
}

test.describe("Ensemble Manager — testy na osobnych kontach testowych", () => {

    test("E2E-09: pełny CRUD przez interfejs użytkownika", async ({ page }) => {
        test.skip(!canTestA, "Wymaga E2E_ALLOW_WRITES=YES i konta testowego A.");
        test.setTimeout(120_000);

        await login(page, emailA!, passwordA!);

        const suffix = randomUUID().slice(0, 8);
        const title = `E2E wydarzenie ${suffix}`;
        const editedTitle = `E2E wydarzenie edytowane ${suffix}`;
        const member = `E2E Uczestnik ${suffix}`;
        const editedMember = `E2E Zmiana ${suffix}`;

        let eventId: string | undefined;
        let absenceId: string | undefined;

        try {
            // 1. CREATE wydarzenia przez formularz.
            await page.goto("/events/new");
            await expect(visibleField(page, "event-title")).toBeVisible();
            await visibleField(page, "event-title").fill(title);
            await visibleField(page, "event-type").selectOption("rehearsal");
            await visibleField(page, "event-start").fill("2030-04-15T18:00");
            await visibleField(page, "event-end").fill("2030-04-15T20:00");
            await visibleField(page, "event-location").fill("Sala E2E");

            const createEventPromise = page.waitForResponse((response) =>
                response.url().endsWith("/api/events") &&
                response.request().method() === "POST"
            );
            await visibleMain(page).getByRole("button", {
                name: "Zapisz wydarzenie",
            }).click();

            const createEventResponse = await createEventPromise;
            expect(createEventResponse.status()).toBe(201);
            const createdEvent = await createEventResponse.json() as {
                data: { id: string };
            };
            eventId = createdEvent.data.id;

            await expect(page).toHaveURL(/\/events\/?$/, { timeout: 15_000 });
            await expect(visibleMain(page).getByRole("heading", {
                name: title,
            })).toBeVisible();

            // 2. UPDATE wydarzenia.
            await visibleMain(page).getByRole("link", {
                name: `Edytuj wydarzenie: ${title}`,
            }).click();
            await expect(page).toHaveURL(
                new RegExp(`/events/${eventId}/edit/?$`),
                { timeout: 15_000 }
            );
            await expect(visibleField(page, "event-title")).toBeVisible();
            await visibleField(page, "event-title").fill(editedTitle);

            const updateEventPromise = page.waitForResponse((response) =>
                response.url().endsWith(`/api/events/${eventId}`) &&
                response.request().method() === "PATCH"
            );
            await visibleMain(page).getByRole("button", {
                name: "Zapisz zmiany",
            }).click();

            expect((await updateEventPromise).status()).toBe(200);
            await expect(page).toHaveURL(/\/events\/?$/, { timeout: 15_000 });
            await expect(visibleMain(page).getByRole("heading", {
                name: editedTitle,
            })).toBeVisible();

            // 3. CREATE nieobecnosci.
            await page.goto("/absences/new");
            await expect(visibleField(page, "absence-event")).toBeVisible();
            await visibleField(page, "absence-event").selectOption(eventId);
            await visibleField(page, "absence-member").fill(member);
            await visibleField(page, "absence-reason").fill("Powód testowy");

            const createAbsencePromise = page.waitForResponse((response) =>
                response.url().endsWith("/api/absences") &&
                response.request().method() === "POST"
            );
            await visibleMain(page).getByRole("button", {
                name: "Zgłoś nieobecność",
            }).click();

            const createAbsenceResponse = await createAbsencePromise;
            expect(createAbsenceResponse.status()).toBe(201);
            const createdAbsence = await createAbsenceResponse.json() as {
                data: { id: string };
            };
            absenceId = createdAbsence.data.id;

            await expect(page).toHaveURL(/\/absences\/?$/, { timeout: 15_000 });
            await expect(visibleMain(page).getByRole("heading", {
                name: member,
            })).toBeVisible();

            // 4. UPDATE nieobecnosci.
            await visibleMain(page).getByRole("link", {
                name: `Edytuj nieobecność: ${member}`,
            }).click();
            await expect(page).toHaveURL(
                new RegExp(`/absences/${absenceId}/edit/?$`),
                { timeout: 15_000 }
            );
            await expect(visibleField(page, "absence-member")).toBeVisible();
            await visibleField(page, "absence-member").fill(editedMember);

            const updateAbsencePromise = page.waitForResponse((response) =>
                response.url().endsWith(`/api/absences/${absenceId}`) &&
                response.request().method() === "PATCH"
            );
            await visibleMain(page).getByRole("button", {
                name: "Zapisz zmiany",
            }).click();

            expect((await updateAbsencePromise).status()).toBe(200);
            await expect(page).toHaveURL(/\/absences\/?$/, { timeout: 15_000 });
            await expect(visibleMain(page).getByRole("heading", {
                name: editedMember,
            })).toBeVisible();

            // 5. DELETE nieobecnosci — potwierdzenie w oknie dialogowym.
            await visibleMain(page).getByRole("button", {
                name: `Usuń nieobecność: ${editedMember}`,
            }).click();

            const deleteAbsencePromise = page.waitForResponse((response) =>
                response.url().endsWith(`/api/absences/${absenceId}`) &&
                response.request().method() === "DELETE"
            );
            await page.getByRole("button", {
                name: "Tak, usuń nieobecność",
            }).click();

            expect((await deleteAbsencePromise).status()).toBe(204);
            await expect(visibleMain(page).getByRole("heading", {
                name: editedMember,
            })).toHaveCount(0);
            absenceId = undefined;

            // 6. DELETE wydarzenia — potwierdzenie w oknie dialogowym.
            await page.goto("/events");
            await visibleMain(page).getByRole("button", {
                name: `Usuń wydarzenie: ${editedTitle}`,
            }).click();

            const deleteEventPromise = page.waitForResponse((response) =>
                response.url().endsWith(`/api/events/${eventId}`) &&
                response.request().method() === "DELETE"
            );
            await page.getByRole("button", {
                name: "Tak, usuń wydarzenie",
            }).click();

            expect((await deleteEventPromise).status()).toBe(204);
            await expect(visibleMain(page).getByRole("heading", {
                name: editedTitle,
            })).toHaveCount(0);
            eventId = undefined;

        } finally {
            if (absenceId) {
                await cleanupRecord(page.request, `/api/absences/${absenceId}`);
            }
            if (eventId) {
                await cleanupRecord(page.request, `/api/events/${eventId}`);
            }
        }
    });

    test("E2E-10: Zespół B nie ma dostępu do rekordów Zespołu A", async ({ page, browser }) => {
        test.skip(!canTestAB, "Wymaga dwoch roznych kont testowych i E2E_ALLOW_WRITES=YES.");
        test.setTimeout(120_000);

        await login(page, emailA!, passwordA!);
        const contextB = await browser.newContext({
            baseURL: "http://localhost:3000",
        });

        let eventId: string | undefined;
        let absenceId: string | undefined;

        try {
            const pageB = await contextB.newPage();
            await login(pageB, emailB!, passwordB!);

            // Zespol A tworzy tymczasowe dane tylko dla tego testu.
            const eventResponse = await page.request.post("/api/events", {
                data: {
                    title: `E2E izolacja ${randomUUID().slice(0, 8)}`,
                    type: "rehearsal",
                    starts_at: "2030-04-15T18:00:00Z",
                    ends_at: "2030-04-15T20:00:00Z",
                },
            });
            expect(eventResponse.status()).toBe(201);
            eventId = (await eventResponse.json() as {
                data: { id: string };
            }).data.id;

            const absenceResponse = await page.request.post("/api/absences", {
                data: {
                    event_id: eventId,
                    member_name: "E2E izolacja",
                    reason: "Test RLS",
                },
            });
            expect(absenceResponse.status()).toBe(201);
            absenceId = (await absenceResponse.json() as {
                data: { id: string };
            }).data.id;

            // B nie moze odczytac, zmienic ani usunac rekordow A.
            for (const endpoint of [
                `/api/events/${eventId}`,
                `/api/absences/${absenceId}`,
            ]) {
                expect(
                    (await pageB.request.get(endpoint)).status(),
                    `GET ${endpoint}`
                ).toBe(404);

                const data = endpoint.includes("/events/")
                    ? { title: "Nieuprawniona aktualizacja" }
                    : { member_name: "Nieuprawniona aktualizacja" };

                expect(
                    (await pageB.request.patch(endpoint, { data })).status(),
                    `PATCH ${endpoint}`
                ).toBe(404);

                expect(
                    (await pageB.request.delete(endpoint)).status(),
                    `DELETE ${endpoint}`
                ).toBe(404);
            }

            const forbiddenPost = await pageB.request.post("/api/absences", {
                data: {
                    event_id: eventId,
                    member_name: "E2E B",
                    reason: "Niedozwolony POST",
                },
            });
            expect(forbiddenPost.status()).toBe(404);

            // Potwierdzamy, ze rekordy A nadal istnieja.
            expect(
                (await page.request.get(`/api/events/${eventId}`)).status()
            ).toBe(200);
            expect(
                (await page.request.get(`/api/absences/${absenceId}`)).status()
            ).toBe(200);

        } finally {
            if (absenceId) {
                await cleanupRecord(page.request, `/api/absences/${absenceId}`);
            }
            if (eventId) {
                await cleanupRecord(page.request, `/api/events/${eventId}`);
            }
            await contextB.close();
        }
    });
});
