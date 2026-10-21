
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Formatowanie dat wedlug polskiej strefy czasowej.
const eventDateFormatter = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
});

function formatEventDate(date: string) {
    return eventDateFormatter.format(new Date(date));
}

// Moduly dostepne w panelu zespolu.
// href wskazuje docelowa strone danego modulu.
// null oznacza modul jeszcze nieaktywny.
const sections = [
    {
        title: "Wydarzenia",
        icon: "🎼",
        description:
            "Zarządzaj próbami, koncertami i terminami zespołu.",
        href: "/events",
    },
    {
        title: "Nieobecności",
        icon: "📅",
        description:
            "Sprawdzaj zgłoszenia nieobecności członków zespołu.",
        href: "/absences",
    },
    {
        title: "Konto zespołu",
        icon: "⚙️",
        description:
            "Przeglądaj informacje dotyczące konta zespołu.",
        href: null,
    },
];

// Dynamiczna zawartosc dashboardu.
async function DashboardContent() {
    await connection();

    // 1. Tworzymy serwerowego klienta Supabase.
    const supabase = await createClient();

    // 2. Sprawdzamy tozsamosc uzytkownika.
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    // 3. Brak sesji - przekierowanie na logowanie.
    if (error || !user) {
        redirect("/login");
    }

    // 4. Pobieramy maksymalnie 5 nadchodzacych wydarzen.
    const {
        data: upcomingEvents,
        error: eventsError,
    } = await supabase
        .from("events")
        .select("id, title, type, starts_at, location")
        .eq("team_id", user.id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(5);

    if (eventsError) {
        console.error(
            "Blad pobierania wydarzen:",
            eventsError.message
        );
    }

    // 5. Wyswietlamy chroniony panel zespolu.
    return (
        <main className="container py-4 py-md-5">

            {/* Naglowek */}
            <header className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-5">

                <Link
                    href="/"
                    className="fs-4 fw-bold text-decoration-none text-white"
                >
                    Ensemble Manager
                </Link>

                <span className="badge text-bg-primary">
                    Panel zespołu
                </span>

            </header>

            {/* Powitanie */}
            <section className="mb-5">

                <span className="text-uppercase fw-bold text-danger small">
                    Dashboard
                </span>

                <h1 className="display-6 fw-bold mt-2 mb-3">
                    Witaj w panelu zespołu.
                </h1>

                <p className="lead text-body-secondary">
                    Zarządzaj działalnością swojego zespołu
                    muzycznego w jednym miejscu.
                </p>

                <div className="d-inline-flex align-items-center gap-2 small">

                    <span className="badge text-bg-success">
                        Zalogowano
                    </span>

                    <span className="text-body-secondary">
                        Konto zespołu jest aktywne
                    </span>

                </div>

            </section>

            {/* Moduly aplikacji */}
            <section aria-label="Moduły aplikacji">

                <div className="row g-4">

                    {sections.map((section) => (
                        <div
                            key={section.title}
                            className="col-12 col-md-4"
                        >

                            <div className="card h-100 shadow-sm">

                                <div className="card-body p-4">

                                    <div className="fs-2 mb-3">
                                        {section.icon}
                                    </div>

                                    <h2 className="h5 fw-bold">
                                        {section.title}
                                    </h2>

                                    <p className="text-body-secondary mb-0">
                                        {section.description}
                                    </p>

                                    {/* Link aktywnego modulu.
                                        Bootstrap stretched-link sprawia,
                                        ze caly kafelek jest klikalny. */}
                                    {section.href && (
                                        <Link
                                            href={section.href}
                                            className="stretched-link"
                                            aria-label={`Otwórz moduł: ${section.title}`}
                                        />
                                    )}

                                </div>

                            </div>

                        </div>
                    ))}

                </div>

            </section>

            {/* Nadchodzace wydarzenia */}
            <section className="card mt-5">

                <div className="card-body p-4">

                    <div className="d-flex justify-content-between align-items-center mb-3">

                        <h2 className="h5 fw-bold mb-0">
                            Nadchodzące wydarzenia
                        </h2>

                        <span className="badge text-bg-primary">
                            Najbliższe 5
                        </span>

                    </div>

                    {/* Blad komunikacji z baza */}
                    {eventsError ? (

                        <div
                            className="alert alert-danger mb-0"
                            role="alert"
                        >
                            Nie udało się pobrać wydarzeń.
                            Spróbuj ponownie później.
                        </div>

                    ) : !upcomingEvents ||
                    upcomingEvents.length === 0 ? (

                        /* Brak nadchodzacych wydarzen */
                        <p className="text-body-secondary mb-0">
                            Nie masz jeszcze zaplanowanych
                            nadchodzących wydarzeń.
                        </p>

                    ) : (

                        /* Lista rzeczywistych wydarzen */
                        <div className="d-flex flex-column">

                            {upcomingEvents.map((event) => (
                                <article
                                    key={event.id}
                                    className="py-3 border-bottom"
                                >

                                    <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2 mb-2">

                                        <h3 className="h6 fw-bold mb-0">
                                            {event.title}
                                        </h3>

                                        <span className="badge text-bg-primary">
                                            {event.type === "rehearsal"
                                                ? "Próba"
                                                : event.type === "concert"
                                                    ? "Koncert"
                                                    : "Inne"}
                                        </span>

                                    </div>

                                    <p className="text-body-secondary small mb-1">

                                        <span className="text-danger me-2">
                                            ●
                                        </span>

                                        <time dateTime={event.starts_at}>
                                            {formatEventDate(event.starts_at)}
                                        </time>

                                    </p>

                                    {event.location && (
                                        <p className="text-body-secondary small mb-0">

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

// Ekran wyswietlany podczas ladowania danych.
function DashboardLoading() {
    return (
        <main
            className="container py-5"
            role="status"
        >

            <div className="row justify-content-center">

                <div className="col-12 col-md-8">

                    <div className="card">

                        <div className="card-body p-4">

                            <h1 className="h4 mb-3">
                                Ensemble Manager
                            </h1>

                            <div
                                className="spinner-border text-danger mb-3"
                                aria-hidden="true"
                            />

                            <p className="text-body-secondary mb-0">
                                Ładowanie panelu zespołu...
                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </main>
    );
}

// Glowny komponent strony /dashboard.
export default function DashboardPage() {
    return (
        <Suspense fallback={<DashboardLoading />}>
            <DashboardContent />
        </Suspense>
    );
}
