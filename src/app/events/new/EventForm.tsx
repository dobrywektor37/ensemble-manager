
"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import {
    toWarsawDateTimeLocal,
    warsawLocalToUtc,
} from "@/lib/warsaw-time";

type EventType = "rehearsal" | "concert" | "other";

type EventFormProps = {
    initialEvent?: {
        id: string;
        title: string;
        type: string;
        starts_at: string;
        ends_at: string;
        location: string | null;
        description: string | null;
    };
};

export default function EventForm({
                                      initialEvent,
                                  }: EventFormProps) {
    const router = useRouter();

    // Jesli istnieje initialEvent, pracujemy w trybie edycji.
    const isEditMode = Boolean(initialEvent);

    // Pola formularza.
    const [title, setTitle] = useState(
        initialEvent?.title ?? ""
    );

    const [eventType, setEventType] = useState<EventType>(
        initialEvent?.type === "concert" ||
        initialEvent?.type === "other"
            ? initialEvent.type
            : "rehearsal"
    );

    const [startsAt, setStartsAt] = useState(
        initialEvent
            ? toWarsawDateTimeLocal(initialEvent.starts_at)
            : ""
    );

    const [endsAt, setEndsAt] = useState(
        initialEvent
            ? toWarsawDateTimeLocal(initialEvent.ends_at)
            : ""
    );

    const [location, setLocation] = useState(
        initialEvent?.location ?? ""
    );

    const [description, setDescription] = useState(
        initialEvent?.description ?? ""
    );

    // Status formularza.
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

        // 1. Walidacja nazwy.
        const trimmedTitle = title.trim();

        if (
            trimmedTitle.length < 3 ||
            trimmedTitle.length > 150
        ) {
            setError(
                "Nazwa wydarzenia musi mieć od 3 do 150 znaków."
            );
            return;
        }

        // 2. Walidacja dat.
        if (!startsAt || !endsAt) {
            setError(
                "Podaj datę rozpoczęcia i zakończenia."
            );
            return;
        }

        // Interpretujemy daty w Europe/Warsaw, niezależnie od
        // strefy czasowej przeglądarki użytkownika.
        let startIso: string;
        let endIso: string;

        try {
            // Przy edycji zachowujemy dokładny moment UTC,
            // gdy pole daty nie zostało zmienione. Jest to ważne
            // podczas jesiennego cofnięcia zegarów.
            startIso =
                initialEvent &&
                startsAt === toWarsawDateTimeLocal(initialEvent.starts_at)
                    ? initialEvent.starts_at
                    : warsawLocalToUtc(startsAt);

            endIso =
                initialEvent &&
                endsAt === toWarsawDateTimeLocal(initialEvent.ends_at)
                    ? initialEvent.ends_at
                    : warsawLocalToUtc(endsAt);
        } catch {
            setError(
                "Nieprawidłowa lub niejednoznaczna godzina " +
                "w polskiej strefie czasowej. " +
                "Sprawdź datę i zmianę czasu."
            );
            return;
        }

        if (Date.parse(endIso) <= Date.parse(startIso)) {
            setError(
                "Data zakończenia musi być późniejsza " +
                "niż data rozpoczęcia."
            );
            return;
        }

        // 3. Walidacja dodatkowych pol.
        const trimmedLocation = location.trim();
        const trimmedDescription = description.trim();

        if (trimmedLocation.length > 200) {
            setError(
                "Lokalizacja może mieć maksymalnie 200 znaków."
            );
            return;
        }

        if (trimmedDescription.length > 2000) {
            setError(
                "Opis może mieć maksymalnie 2000 znaków."
            );
            return;
        }

        // 4. Przygotowanie danych do REST API.
        // Puste pola opcjonalne zapisujemy jako null.
        const payload = {
            title: trimmedTitle,
            type: eventType,
            starts_at: startIso,
            ends_at: endIso,
            location: trimmedLocation || null,
            description: trimmedDescription || null,
        };

        // 5. Wybieramy endpoint i metode HTTP.
        // Tworzenie: POST /api/events
        // Edycja:    PATCH /api/events/[id]
        const endpoint = initialEvent
            ? `/api/events/${initialEvent.id}`
            : "/api/events";

        const method = initialEvent
            ? "PATCH"
            : "POST";

        setLoading(true);

        try {
            // 6. Wysylamy zadanie do backendu.
            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "same-origin",
                body: JSON.stringify(payload),
            });

            // 7. Obslugujemy bledy backendu.
            if (!response.ok) {
                const result: unknown = await response
                    .json()
                    .catch(() => null);

                let message = isEditMode
                    ? "Nie udało się zaktualizować wydarzenia."
                    : "Nie udało się zapisać wydarzenia.";

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

            // 8. Sukces.
            // Wracamy do listy wydarzen.
            router.push("/events");
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

            {/* Nazwa wydarzenia */}
            <div className="mb-4">
                <label
                    htmlFor="event-title"
                    className="form-label"
                >
                    Nazwa wydarzenia *
                </label>

                <input
                    id="event-title"
                    type="text"
                    className="form-control"
                    placeholder="Np. Próba generalna"
                    value={title}
                    onChange={(event) =>
                        setTitle(event.target.value)
                    }
                    minLength={3}
                    maxLength={150}
                    required
                />
            </div>

            {/* Rodzaj wydarzenia */}
            <div className="mb-4">
                <label
                    htmlFor="event-type"
                    className="form-label"
                >
                    Rodzaj wydarzenia *
                </label>

                <select
                    id="event-type"
                    className="form-select"
                    value={eventType}
                    onChange={(event) =>
                        setEventType(
                            event.target.value as EventType
                        )
                    }
                    required
                >
                    <option value="rehearsal">
                        Próba
                    </option>

                    <option value="concert">
                        Koncert
                    </option>

                    <option value="other">
                        Inne
                    </option>
                </select>
            </div>

            {/* Daty wydarzenia */}
            <div className="row g-3 mb-4">

                <div className="col-12 col-md-6">
                    <label
                        htmlFor="event-start"
                        className="form-label"
                    >
                        Rozpoczęcie *
                    </label>

                    <input
                        id="event-start"
                        type="datetime-local"
                        className="form-control"
                        value={startsAt}
                        onChange={(event) =>
                            setStartsAt(event.target.value)
                        }
                        required
                    />
                </div>

                <div className="col-12 col-md-6">
                    <label
                        htmlFor="event-end"
                        className="form-label"
                    >
                        Zakończenie *
                    </label>

                    <input
                        id="event-end"
                        type="datetime-local"
                        className="form-control"
                        value={endsAt}
                        onChange={(event) =>
                            setEndsAt(event.target.value)
                        }
                        required
                    />
                </div>

            </div>

            <p className="text-body-secondary small mb-4">
                Podaj daty i godziny według czasu polskiego
                (Europe/Warsaw). Aplikacja przeliczy je na UTC.
            </p>

            {/* Lokalizacja */}
            <div className="mb-4">
                <label
                    htmlFor="event-location"
                    className="form-label"
                >
                    Lokalizacja
                </label>

                <input
                    id="event-location"
                    type="text"
                    className="form-control"
                    placeholder="Np. Warszawa, sala prób"
                    value={location}
                    onChange={(event) =>
                        setLocation(event.target.value)
                    }
                    maxLength={200}
                />
            </div>

            {/* Opis wydarzenia */}
            <div className="mb-4">
                <label
                    htmlFor="event-description"
                    className="form-label"
                >
                    Opis wydarzenia
                </label>

                <textarea
                    id="event-description"
                    className="form-control"
                    rows={4}
                    placeholder="Dodatkowe informacje..."
                    value={description}
                    onChange={(event) =>
                        setDescription(event.target.value)
                    }
                    maxLength={2000}
                />
            </div>

            {/* Blad walidacji lub backendu */}
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
                    disabled={loading}
                >
                    {loading
                        ? "Zapisywanie..."
                        : isEditMode
                            ? "Zapisz zmiany"
                            : "Zapisz wydarzenie"}
                </button>

                <button
                    type="button"
                    className="btn btn-outline-light"
                    onClick={() =>
                        router.push("/events")
                    }
                    disabled={loading}
                >
                    Anuluj
                </button>

            </div>

        </form>
    );
}
