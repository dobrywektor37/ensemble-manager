
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import AbsenceForm from "@/app/absences/new/AbsenceForm";

type EditAbsencePageProps = {
    params: Promise<{
        id: string;
    }>;
};

const UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function EditAbsenceContent({
                                      params,
                                  }: EditAbsencePageProps) {
    await connection();

    const { id } = await params;
    const supabase = await createClient();

    // 1. Sprawdzamy sesje zalogowanego zespolu.
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        redirect("/login");
    }

    // 2. Sprawdzamy UUID nieobecnosci.
    if (!UUID_PATTERN.test(id)) {
        notFound();
    }

    // 3. Pobieramy edytowana nieobecnosc.
    // RLS ogranicza odczyt do wlasnych rekordow.
    const {
        data: absence,
        error: absenceError,
    } = await supabase
        .from("absences")
        .select("id, event_id, member_name, reason")
        .eq("id", id)
        .maybeSingle();

    if (absenceError) {
        console.error(
            "Blad pobierania nieobecnosci:",
            absenceError.message
        );

        throw new Error(
            "Nie udało się pobrać nieobecności."
        );
    }

    if (!absence) {
        notFound();
    }

    // 4. Pobieramy wydarzenia zalogowanego zespolu.
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

        throw new Error(
            "Nie udało się pobrać wydarzeń."
        );
    }

    // 5. Dodatkowo weryfikujemy, czy edytowane
    // zgloszenie dotyczy wydarzenia tego zespolu.
    const relatedEvent = events?.find(
        (event) => event.id === absence.event_id
    );

    if (!relatedEvent) {
        notFound();
    }

    // 6. Wyswietlamy formularz z aktualnymi danymi.
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

            {/* Tytul */}
            <section className="mb-4">

                <span className="text-danger text-uppercase fw-bold small">
                    Zarządzanie nieobecnościami
                </span>

                <h1 className="display-6 fw-bold mt-2 mb-3">
                    Edytuj nieobecność
                </h1>

                <p className="text-body-secondary">
                    Zmień dane zgłoszenia i zapisz
                    aktualizację.
                </p>

            </section>

            {/* Formularz edycji */}
            <section
                className="card"
                aria-label="Edycja nieobecności"
            >
                <div className="card-body p-4">

                    <h2 className="h5 fw-bold mb-4">
                        Edytowane zgłoszenie
                    </h2>

                    <AbsenceForm
                        events={events ?? []}
                        initialAbsence={absence}
                    />

                </div>
            </section>

        </main>
    );
}

// Ekran ladowania.
function EditAbsenceLoading() {
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
                        Ładowanie formularza edycji...
                    </p>

                </div>
            </div>
        </main>
    );
}

// Strona /absences/[id]/edit.
export default function EditAbsencePage({
                                            params,
                                        }: EditAbsencePageProps) {
    return (
        <Suspense fallback={<EditAbsenceLoading />}>
            <EditAbsenceContent params={params} />
        </Suspense>
    );
}
