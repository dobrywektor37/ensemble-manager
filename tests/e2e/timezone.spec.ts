
import { test, expect } from "@playwright/test";

import {
    toWarsawDateTimeLocal,
    warsawLocalToUtc,
} from "../../src/lib/warsaw-time";

test.describe("Konwersja dat Europe/Warsaw", () => {

    test("TIME-01: czas zimowy UTC+1", () => {
        expect(
            warsawLocalToUtc("2026-01-15T18:00")
        ).toBe("2026-01-15T17:00:00Z");
    });

    test("TIME-02: czas letni UTC+2", () => {
        expect(
            warsawLocalToUtc("2026-07-15T18:00")
        ).toBe("2026-07-15T16:00:00Z");
    });

    test("TIME-03: nieistniejąca godzina w marcu", () => {
        expect(() =>
            warsawLocalToUtc("2026-03-29T02:30")
        ).toThrow();
    });

    test("TIME-04: niejednoznaczna godzina w październiku", () => {
        expect(() =>
            warsawLocalToUtc("2026-10-25T02:30")
        ).toThrow();
    });

    test("TIME-05: odczyt UTC jako czasu warszawskiego", () => {
        expect(
            toWarsawDateTimeLocal(
                "2026-07-15T16:00:00Z"
            )
        ).toBe("2026-07-15T18:00");
    });

    test("TIME-06: konwersja w obie strony", () => {
        const original = "2026-01-15T18:00";

        const utc = warsawLocalToUtc(original);

        const restored = toWarsawDateTimeLocal(utc);

        expect(restored).toBe(original);
    });

});
