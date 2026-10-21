
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import DeleteAbsenceButton from "./DeleteAbsenceButton";

// Daty wyswietlamy wedlug polskiej strefy czasowej.
const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Warsaw",
});

// Chroniona zawartosc strony nieobecnosci.
async function AbsencesContent() {
    await connection();

    const supabase = await createClient();

    // 1. Weryfikujemy zalogowany zespol.
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // 2. Pobieramy nieobecnosci.
    // Polityki RLS ograniczaja dostep do wlasnych danych.
    const {
        data: absences,
        error: absencesError,
    } = await supabase
        .from("absences")
        .select(
            "id, event_id, member_name, reason, created_at"
        )
        .order("created_at", { ascending: false });

    // 3. Pobieramy nazwy wydarzen zalogowanego zespolu.
    const {
        data: events,
        error: eventsError,
    } = await supabase
        .from("events")
        .select("id, title")
        .eq("team_id", user.id);

    const hasError = Boolean(
        absencesError || eventsError
    );

    if (hasError) {
        console.error(
            "Blad pobierania nieobecnosci:",
            absencesError?.message ?? eventsError?.message
        );
    }

    // 4. Tworzymy mape identyfikatorow i nazw wydarzen.
    const eventTitles = new Map(
        (events ?? []).map((event) => [
            event.id,
            event.title,
        ])
    );

    return (
        <main className="container py-4 py-md-5">

            {/* Naglowek */}
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

            {/* Tytul i przycisk dodawania */}
            <section className="mb-4">

                <span className="text-danger text-uppercase fw-bold small">
                    Zarządzanie nieobecnościami
                </span>

                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mt-2 mb-3">

                    <h1 className="display-6 fw-bold mb-0">
                        Nieobecności zespołu
                    </h1>

                    <Link
                        href="/absences/new"
                        className="btn btn-danger flex-shrink-0"
                    >
                        + Zgłoś nieobecność
                    </Link>

                </div>

                <p className="text-body-secondary">
                    Przeglądaj zgłoszenia nieobecności
                    dotyczące prób i koncertów zespołu.
                </p>

            </section>

            {/* Lista nieobecnosci */}
            <section
                className="card"
                aria-label="Lista nieobecności"
            >
                <div className="card-body p-4">

                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">

                        <h2 className="h5 fw-bold mb-0">
                            Zgłoszone nieobecności
                        </h2>

                        {!hasError && (
                            <span className="badge text-bg-primary">
                                {absences?.length ?? 0} zgłoszeń
                            </span>
                        )}

                    </div>

                    {hasError ? (

                        <div
                            className="alert alert-danger mb-0"
                            role="alert"
                        >
                            Nie udało się pobrać nieobecności.
                            Spróbuj ponownie później.
                        </div>

                    ) : !absences || absences.length === 0 ? (

                        <p className="text-body-secondary mb-0">
                            Ten zespół nie ma jeszcze
                            zgłoszonych nieobecności.
                        </p>

                    ) : (

                        <div className="d-flex flex-column gap-3">

                            {absences.map((absence) => (

                                <article
                                    key={absence.id}
                                    className="border p-3 p-md-4"
                                >

                                    <h3 className="h5 fw-bold mb-3">
                                        {absence.member_name}
                                    </h3>

                                    <p className="text-body-secondary mb-2">

                                        <span className="text-danger me-2">
                                            ●
                                        </span>

                                        <strong>Wydarzenie:</strong>{" "}
                                        {eventTitles.get(absence.event_id)
                                            ?? "Nieznane wydarzenie"}

                                    </p>

                                    {absence.reason && (
                                        <p className="text-body-secondary mb-2">

                                            <span className="text-danger me-2">
                                                ●
                                            </span>

                                            <strong>Powód:</strong>{" "}
                                            {absence.reason}

                                        </p>
                                    )}

                                    <p className="text-body-secondary small mb-0">

                                        Zgłoszono:{" "}

                                        <time dateTime={absence.created_at}>
                                            {dateFormatter.format(
                                                new Date(absence.created_at)
                                            )}
                                        </time>

                                    </p>

                                    {/* Akcje dotyczace konkretnego rekordu */}
                                    <div className="d-flex justify-content-end flex-wrap gap-2 mt-3">

                                        <Link
                                            href={`/absences/${absence.id}/edit`}
                                            className="btn btn-sm btn-outline-danger"
                                            aria-label={`Edytuj nieobecność: ${absence.member_name}`}
                                        >
                                            Edytuj
                                        </Link>

                                        <DeleteAbsenceButton
                                            absenceId={absence.id}
                                            memberName={absence.member_name}
                                            eventTitle={
                                                eventTitles.get(
                                                    absence.event_id
                                                ) ?? "Nieznane wydarzenie"
                                            }
                                        />

                                    </div>

                                </article>

                            ))}

                        </div>

                    )}

                </div>
            </section>

        </main>
    );
}

// Ekran ladowania strony.
function AbsencesLoading() {
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
                        Ładowanie nieobecności...
                    </p>

                </div>
            </div>
        </main>
    );
}

// Dynamiczna strona Next.js 16.
export default function AbsencesPage() {
    return (
        <Suspense fallback={<AbsencesLoading />}>
            <AbsencesContent />
        </Suspense>
    );
}
