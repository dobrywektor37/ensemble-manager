
import { Temporal } from "@js-temporal/polyfill";

const TIME_ZONE = "Europe/Warsaw";

// Konwersja daty UTC z Supabase na czas polski
// dla pola HTML datetime-local.
export function toWarsawDateTimeLocal(
    isoDate: string
): string {
    return Temporal.Instant.from(isoDate)
        .toZonedDateTimeISO(TIME_ZONE)
        .toPlainDateTime()
        .toString({ smallestUnit: "minute" });
}

// Interpretacja daty wpisanej w formularzu
// jako czasu obowiązującego w Polsce.
export function warsawLocalToUtc(
    localDate: string
): string {
    const plainDate = Temporal.PlainDateTime.from(
        localDate
    );

    const zonedDate = plainDate.toZonedDateTime(
        TIME_ZONE,
        { disambiguation: "reject" }
    );

    return zonedDate
        .toInstant()
        .toString({ smallestUnit: "second" });
}
