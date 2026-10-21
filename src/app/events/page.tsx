
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import DeleteEventButton from "./DeleteEventButton";

// Formatowanie dat wedlug polskiej strefy czasowej.
const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
});

const timeFormatter = new Intl.DateTimeFormat("pl-PL", {
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
});

function formatDate(date: string) {
    return dateFormatter.format(new Date(date));
}

function formatTime(date: string) {
    return timeFormatter.format(new Date(date));
}

function getEventType(type: string) {
    switch (type) {
        case "rehearsal":
            return "Próba";
        case "concert":
            return "Koncert";
        default:
            return "Inne";
    }
}

// Chroniona zawartosc strony wydarzen.
async function EventsContent() {
    await connection();

    const supabase = await createClient();

    // Sprawdzamy sesje zalogowanego zespolu.
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // Pobieramy wydarzenia nalezace do zespolu.
    const {
        data: events,
        error: eventsError,
    } = await supabase
        .from("events")
        .select(
            "id, title, type, starts_at, ends_at, location"
        )
        .eq("team_id", user.id)
        .order("starts_at", { ascending: true });

    return (
        <main className="container py-4 py-md-5">

            {/* Naglowek strony */}
            <header className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-5">

                <Link
                    href="/dashboard"
                    className="fs-4 fw-bold text-white text-decoration-none"
                >
                    Ensemble Manager
                </Link>

                <Link
                    href="/dashboard"
                    className="btn btn-outline-light"
                >
                    Wróć do panelu
                </Link>

            </header>

            {/* Tytul strony */}
            <section className="mb-4">

                <span className="text-danger text-uppercase fw-bold small">
                    Zarządzanie wydarzeniami
                </span>

                <h1 className="display-6 fw-bold mt-2 mb-3">
                    Wydarzenia zespołu
                </h1>

                <p className="text-body-secondary">
                    Przeglądaj próby, koncerty i pozostałe
                    wydarzenia swojego zespołu.
                </p>

            </section>

            {/* Lista wydarzen */}
            <section
                className="card"
                aria-label="Lista wydarzeń"
            >
                <div className="card-body p-4">

                    {/* Naglowek listy */}
                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">

                        <div className="d-flex align-items-center gap-3">

                            <h2 className="h5 fw-bold mb-0">
                                Lista wydarzeń
                            </h2>

                            {!eventsError && (
                                <span className="badge text-bg-primary">
                                    {events?.length ?? 0} wydarzeń
                                </span>
                            )}

                        </div>

                        <Link
                            href="/events/new"
                            className="btn btn-primary"
                        >
                            + Dodaj wydarzenie
                        </Link>

                    </div>

                    {/* Blad pobierania */}
                    {eventsError ? (
                        <div
                            className="alert alert-danger mb-0"
                            role="alert"
                        >
                            Nie udało się pobrać wydarzeń.
                            Spróbuj ponownie później.
                        </div>

                    ) : !events || events.length === 0 ? (

                        /* Pusta lista */
                        <p className="text-body-secondary mb-0">
                            Ten zespół nie ma jeszcze
                            zapisanych wydarzeń.
                        </p>

                    ) : (

                        /* Rzeczywiste rekordy PostgreSQL */
                        <div className="d-flex flex-column gap-3">

                            {events.map((event) => (
                                <article
                                    key={event.id}
                                    className="border p-3 p-md-4"
                                >

                                    {/* Nazwa, typ i operacje */}
                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-3 mb-3">

                                        <h3 className="h5 fw-bold mb-0">
                                            {event.title}
                                        </h3>

                                        <div className="d-flex flex-wrap align-items-center gap-2">

                                            <span className="badge text-bg-primary">
                                                {getEventType(event.type)}
                                            </span>

                                            <Link
                                                href={`/events/${event.id}/edit`}
                                                className="btn btn-sm btn-outline-light"
                                                aria-label={`Edytuj wydarzenie: ${event.title}`}
                                            >
                                                Edytuj
                                            </Link>

                                            {/* Usuwanie wydarzenia */}
                                            <DeleteEventButton
                                                eventId={event.id}
                                                eventTitle={event.title}
                                            />

                                        </div>

                                    </div>

                                    {/* Termin wydarzenia */}
                                    <p className="text-body-secondary mb-2">

                                        <span className="text-danger me-2">
                                            ●
                                        </span>

                                        <time dateTime={event.starts_at}>
                                            {formatDate(event.starts_at)}
                                        </time>

                                        {" – "}

                                        <time dateTime={event.ends_at}>
                                            {formatTime(event.ends_at)}
                                        </time>

                                    </p>

                                    {/* Lokalizacja */}
                                    {event.location && (
                                        <p className="text-body-secondary mb-0">

                                            <span className="text-danger me-2">
                                                ●
                                            </span>

                                            {event.location}

                                        </p>
                                    )}

                                </article>
                            ))}

                        </div>
                    )}

                </div>
            </section>

        </main>
    );
}

// Ekran ladowania.
function EventsLoading() {
    return (
        <main
            className="container py-5"
            role="status"
        >
            <div className="card">
                <div className="card-body p-4">

                    <div
                        className="spinner-border text-danger mb-3"
                        aria-hidden="true"
                    />

                    <p className="text-body-secondary mb-0">
                        Ładowanie wydarzeń...
                    </p>

                </div>
            </div>
        </main>
    );
}

// Dynamiczna strona Next.js 16.
export default function EventsPage() {
    return (
        <Suspense fallback={<EventsLoading />}>
            <EventsContent />
        </Suspense>
    );
}
