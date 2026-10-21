
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({

    // Lokalizacja testów E2E.
    testDir: "./tests/e2e",

    // Testy wykonujemy kolejno.
    fullyParallel: false,
    workers: 1,

    // Bez automatycznego ponawiania błędnych testów.
    retries: 0,

    // Wyniki widoczne bezpośrednio w terminalu.
    reporter: "list",

    use: {
        baseURL: "http://localhost:3000",

        // Materiały diagnostyczne przy błędach.
        trace: "retain-on-failure",
        screenshot: "only-on-failure",
    },

    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
            },
        },
    ],

    // Testujemy wersję produkcyjną Next.js,
    // bez Turbopack HMR i Fast Refresh.
    webServer: {

        // Najpierw kompilacja, potem uruchomienie.
        command: "npm run build && npm run start",

        // Kontrola gotowości aplikacji i Supabase.
        url: "http://localhost:3000/api/health",

        // Nie podłączamy się do starego serwera dev.
        reuseExistingServer: false,

        // Czas obejmuje kompilację i start aplikacji.
        timeout: 240_000,
    },
});
