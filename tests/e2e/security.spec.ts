import { test, expect } from "@playwright/test";

const unauthorized = {
    error: "Wymagane jest zalogowanie.",
};

const fakeId = "00000000-0000-4000-8000-000000000000";

test.describe("Ensemble Manager — bezpieczeństwo API", () => {
    test("E2E-02: niezalogowany nie może odczytywać danych", async ({ request }) => {
        for (const endpoint of ["/api/events", "/api/absences"]) {
            const response = await request.get(endpoint);
            expect(response.status(), `GET ${endpoint}`).toBe(401);
            expect(await response.json()).toEqual(unauthorized);
        }
    });

    test("E2E-03: niezalogowany nie może tworzyć danych", async ({ request }) => {
        const cases = [
            { endpoint: "/api/events", data: {} },
            {
                endpoint: "/api/absences",
                data: {
                    event_id: fakeId,
                    member_name: "E2E Test",
                    reason: "Kontrola uwierzytelnienia",
                },
            },
        ];

        for (const { endpoint, data } of cases) {
            const response = await request.post(endpoint, { data });
            expect(response.status(), `POST ${endpoint}`).toBe(401);
            expect(await response.json()).toEqual(unauthorized);
        }
    });

    test("E2E-04: niezalogowany nie może edytować ani usuwać danych", async ({ request }) => {
        const cases = [
            {
                endpoint: `/api/events/${fakeId}`,
                data: { title: "Nieautoryzowana zmiana" },
            },
            {
                endpoint: `/api/absences/${fakeId}`,
                data: { member_name: "Nieautoryzowana zmiana" },
            },
        ];

        for (const { endpoint, data } of cases) {
            const patch = await request.patch(endpoint, { data });
            expect(patch.status(), `PATCH ${endpoint}`).toBe(401);
            expect(await patch.json()).toEqual(unauthorized);

            const deletion = await request.delete(endpoint);
            expect(deletion.status(), `DELETE ${endpoint}`).toBe(401);
            expect(await deletion.json()).toEqual(unauthorized);
        }
    });
});
