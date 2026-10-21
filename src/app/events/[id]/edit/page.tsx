
import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import EventForm from "../../new/EventForm";

// Parametry dynamicznej trasy /events/[id]/edit.
type EditEventPageProps = {
    params: Promise<{ id: string }>;
};

// Chroniona zawartosc strony edycji wydarzenia.
async function EditEventContent({
                                    params,
                                }: EditEventPageProps) {
    await connection();

    // 1. Odczytujemy identyfikator wydarzenia z adresu URL.
    const { id } = await params;

    // 2. Tworzymy serwerowego klienta Supabase.
    const supabase = await createClient();

    // 3. Sprawdzamy tozsamosc zalogowanego uzytkownika.
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    // Brak autoryzacji - przekierowanie do logowania.
    if (authError || !user) {
        redirect("/login");
    }

    // 4. Walidujemy format identyfikatora UUID.
    const uuidRegex =
        /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

    if (!uuidRegex.test(id)) {
        notFound();
    }

    // 5. Pobieramy konkretne wydarzenie z PostgreSQL.
    // Dodatkowo filtrujemy je wedlug zalogowanego zespolu.
    // Polityki RLS w Supabase stanowia kolejna warstwe ochrony.
    const {
        data: event,
        error: eventError,
    } = await supabase
        .from("events")
        .select(
            "id, title, type, starts_at, ends_at, location, description"
        )
        .eq("id", id)
        .eq("team_id", user.id)
        .maybeSingle();

    // 6. Obslugujemy blad pobierania danych.
    if (eventError) {
        console.error(
            "Blad pobierania wydarzenia:",
            eventError.message
        );

        return (
            <main className="container py-5">
                <div
                    className="alert alert-danger"
                    role="alert"
                >
                    Nie udało się pobrać wydarzenia.
                    Spróbuj ponownie później.
                </div>
            </main>
        );
    }

    // 7. Rekord nie istnieje lub nie nalezy do zespolu.
    if (!event) {
        notFound();
    }

    // 8. Wyswietlamy strone z formularzem edycji.
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
                    href="/events"
                    className="btn btn-outline-light"
                >
                    Wróć do wydarzeń
                </Link>

            </header>

            {/* Tytul strony */}
            <section className="mb-4">

                <span className="text-danger text-uppercase fw-bold small">
                    Zarządzanie wydarzeniami
                </span>

                <h1 className="display-6 fw-bold mt-2 mb-3">
                    Edytuj wydarzenie
                </h1>

                <p className="text-body-secondary">
                    Sprawdź i zmień dane wybranego wydarzenia
                    swojego zespołu.
                </p>

            </section>

            {/* Formularz edycji */}
            <section
                className="card"
                aria-label="Formularz edycji wydarzenia"
            >
                <div className="card-body p-4">

                    <h2 className="h5 fw-bold mb-4">
                        {event.title}
                    </h2>

                    {/* Przekazujemy dane pobrane z Supabase */}
                    <EventForm
                        key={event.id}
                        initialEvent={event}
                    />

                </div>
            </section>

        </main>
    );
}

// Ekran ladowania podczas pobierania danych.
function EditEventLoading() {
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
                        Ładowanie wydarzenia...
                    </p>

                </div>
            </div>
        </main>
    );
}

// Glowny komponent strony.
// Suspense obsluguje dynamiczne dane w Next.js 16.
export default function EditEventPage({
                                          params,
                                      }: EditEventPageProps) {
    return (
        <Suspense fallback={<EditEventLoading />}>
            <EditEventContent params={params} />
        </Suspense>
    );
}
