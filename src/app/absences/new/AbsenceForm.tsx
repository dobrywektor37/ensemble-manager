
"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";

type AvailableEvent = {
    id: string;
    title: string;
    starts_at: string;
};

type InitialAbsence = {
    id: string;
    event_id: string;
    member_name: string;
    reason: string | null;
};

type AbsenceFormProps = {
    events: AvailableEvent[];
    initialAbsence?: InitialAbsence;
};

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
});

export default function AbsenceForm({
                                        events,
                                        initialAbsence,
                                    }: AbsenceFormProps) {
    const router = useRouter();

    // Obecnosc initialAbsence oznacza tryb edycji.
    const isEditing = Boolean(initialAbsence);

    // W trybie edycji pola otrzymuja zapisane wartosci.
    const [eventId, setEventId] = useState(
        initialAbsence?.event_id ?? ""
    );

    const [memberName, setMemberName] = useState(
        initialAbsence?.member_name ?? ""
    );

    const [reason, setReason] = useState(
        initialAbsence?.reason ?? ""
    );

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    async function handleSubmit(
        event: SyntheticEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (loading) {
            return;
        }

        setError("");

        // 1. Sprawdzamy wybrane wydarzenie.
        const selectedEvent = events.find(
            (item) => item.id === eventId
        );

        if (!selectedEvent) {
            setError("Wybierz wydarzenie zespołu.");
            return;
        }

        // 2. Walidujemy imie i nazwisko.
        const trimmedName = memberName.trim();

        if (
            trimmedName.length < 2 ||
            trimmedName.length > 100
        ) {
            setError(
                "Imię i nazwisko musi mieć od 2 do 100 znaków."
            );
            return;
        }

        // 3. Walidujemy powod nieobecnosci.
        const trimmedReason = reason.trim();

        if (trimmedReason.length > 2000) {
            setError(
                "Powód nieobecności może mieć maksymalnie 2000 znaków."
            );
            return;
        }

        // 4. Dane zgodne z kontraktem API.
        const payload = {
            event_id: selectedEvent.id,
            member_name: trimmedName,
            reason: trimmedReason || null,
        };

        // 5. Wybieramy operacje POST lub PATCH.
        const endpoint = initialAbsence
            ? `/api/absences/${initialAbsence.id}`
            : "/api/absences";

        const method = isEditing ? "PATCH" : "POST";
        const expectedStatus = isEditing ? 200 : 201;

        setLoading(true);

        try {
            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "same-origin",
                body: JSON.stringify(payload),
            });

            // 6. Sprawdzamy oczekiwany status HTTP.
            if (response.status !== expectedStatus) {
                const result: unknown = await response
                    .json()
                    .catch(() => null);

                let message = isEditing
                    ? "Nie udało się zaktualizować nieobecności."
                    : "Nie udało się zapisać nieobecności.";

                if (
                    result &&
                    typeof result === "object" &&
                    "error" in result &&
                    typeof result.error === "string"
                ) {
                    message = result.error;
                }

                setError(message);
                return;
            }

            // 7. Po sukcesie odswiezamy liste.
            router.push("/absences");
            router.refresh();

        } catch {
            setError(
                "Wystąpił problem z połączeniem z serwerem."
            );
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit}>

            {/* Wydarzenie */}
            <div className="mb-4">
                <label
                    htmlFor="absence-event"
                    className="form-label"
                >
                    Wydarzenie *
                </label>

                <select
                    id="absence-event"
                    className="form-select"
                    value={eventId}
                    onChange={(event) =>
                        setEventId(event.target.value)
                    }
                    required
                    disabled={loading}
                >
                    <option value="">
                        Wybierz wydarzenie...
                    </option>

                    {events.map((event) => (
                        <option
                            key={event.id}
                            value={event.id}
                        >
                            {event.title} —{" "}
                            {dateFormatter.format(
                                new Date(event.starts_at)
                            )}
                        </option>
                    ))}
                </select>

                <div className="form-text">
                    Wybierz wydarzenie należące
                    do zalogowanego zespołu.
                </div>
            </div>

            {/* Imie i nazwisko */}
            <div className="mb-4">
                <label
                    htmlFor="absence-member"
                    className="form-label"
                >
                    Imię i nazwisko *
                </label>

                <input
                    id="absence-member"
                    type="text"
                    className="form-control"
                    value={memberName}
                    onChange={(event) =>
                        setMemberName(event.target.value)
                    }
                    placeholder="Np. Jan Kowalski"
                    minLength={2}
                    maxLength={100}
                    required
                    disabled={loading}
                />
            </div>

            {/* Powod */}
            <div className="mb-4">
                <label
                    htmlFor="absence-reason"
                    className="form-label"
                >
                    Powód nieobecności
                </label>

                <textarea
                    id="absence-reason"
                    className="form-control"
                    rows={4}
                    value={reason}
                    onChange={(event) =>
                        setReason(event.target.value)
                    }
                    maxLength={2000}
                    placeholder="Opcjonalne uzasadnienie..."
                    disabled={loading}
                />

                <div className="form-text">
                    Pole opcjonalne, maksymalnie 2000 znaków.
                </div>
            </div>

            {/* Komunikat bledu */}
            {error && (
                <div
                    className="alert alert-danger"
                    role="alert"
                >
                    {error}
                </div>
            )}

            {/* Przyciski */}
            <div className="d-flex flex-column flex-sm-row gap-3">

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || events.length === 0}
                >
                    {loading
                        ? isEditing
                            ? "Zapisywanie zmian..."
                            : "Zapisywanie..."
                        : isEditing
                            ? "Zapisz zmiany"
                            : "Zgłoś nieobecność"}
                </button>

                <button
                    type="button"
                    className="btn btn-outline-light"
                    onClick={() =>
                        router.push("/absences")
                    }
                    disabled={loading}
                >
                    Anuluj
                </button>

            </div>

        </form>
    );
}
