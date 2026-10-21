
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import AbsenceForm from "./AbsenceForm";

// Chroniona zawartosc strony dodawania nieobecnosci.
async function NewAbsenceContent() {
    await connection();

    // 1. Tworzymy serwerowego klienta Supabase.
    const supabase = await createClient();

    // 2. Sprawdzamy tozsamosc uzytkownika.
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // 3. Pobieramy wydarzenia zalogowanego zespolu.
    // RLS dodatkowo ogranicza widoczne rekordy.
    const {
        data: events,
        error: eventsError,
    } = await supabase
        .from("events")
        .select("id, title, starts_at")
        .eq("team_id", user.id)
        .order("starts_at", { ascending: true });

    if (eventsError) {
        console.error(
            "Blad pobierania wydarzen:",
            eventsError.message
        );
    }

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
                    href="/absences"
                    className="btn btn-outline-light"
                >
                    Wróć do nieobecności
                </Link>

            </header>

            {/* Tytul strony */}
            <section className="mb-4">

                <span className="text-danger text-uppercase fw-bold small">
                    Zarządzanie nieobecnościami
                </span>

                <h1 className="display-6 fw-bold mt-2 mb-3">
                    Zgłoś nieobecność
                </h1>

                <p className="text-body-secondary">
                    Dodaj zgłoszenie nieobecności członka
                    zespołu na wybrane wydarzenie.
                </p>

            </section>

            {/* Formularz */}
            <section
                className="card"
                aria-label="Zgłaszanie nieobecności"
            >
                <div className="card-body p-4">

                    <h2 className="h5 fw-bold mb-4">
                        Nowe zgłoszenie
                    </h2>

                    {eventsError ? (

                        <div
                            className="alert alert-danger mb-0"
                            role="alert"
                        >
                            Nie udało się pobrać wydarzeń.
                            Spróbuj ponownie później.
                        </div>

                    ) : !events || events.length === 0 ? (

                        <div>
                            <p className="text-body-secondary">
                                Nie możesz zgłosić
                                nieobecności, ponieważ
                                zespół nie ma jeszcze wydarzeń.
                            </p>

                            <Link
                                href="/events/new"
                                className="btn btn-primary"
                            >
                                + Dodaj wydarzenie
                            </Link>
                        </div>

                    ) : (

                        <AbsenceForm events={events} />

                    )}

                </div>
            </section>

        </main>
    );
}

// Ekran ladowania.
function NewAbsenceLoading() {
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
                        Ładowanie formularza nieobecności...
                    </p>

                </div>
            </div>
        </main>
    );
}

// Dynamiczna strona Next.js 16.
export default function NewAbsencePage() {
    return (
        <Suspense fallback={<NewAbsenceLoading />}>
            <NewAbsenceContent />
        </Suspense>
    );
}
