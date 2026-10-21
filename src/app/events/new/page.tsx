
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import EventForm from "./EventForm";

// Chroniona zawartosc strony dodawania wydarzenia.
async function NewEventContent() {
    await connection();

    const supabase = await createClient();

    // Sprawdzamy zalogowanego uzytkownika.
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    // Brak sesji - przekierowanie do logowania.
    if (error || !user) {
        redirect("/login");
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
                    Dodaj wydarzenie
                </h1>

                <p className="text-body-secondary">
                    Utwórz nową próbę, koncert lub inne
                    wydarzenie swojego zespołu.
                </p>

            </section>

            {/* Miejsce na formularz */}
            <section
                className="card"
                aria-label="Dodawanie wydarzenia"
            >
                <div className="card-body p-4">

                    <h2 className="h5 fw-bold mb-3">
                        Nowe wydarzenie
                    </h2>

                    <EventForm />

                </div>
            </section>

        </main>
    );
}

// Ekran ladowania.
function NewEventLoading() {
    return (
        <main className="container py-5" role="status">

            <div className="card">
                <div className="card-body p-4">

                    <div
                        className="spinner-border text-danger mb-3"
                        aria-hidden="true"
                    />

                    <p className="text-body-secondary mb-0">
                        Ładowanie formularza...
                    </p>

                </div>
            </div>

        </main>
    );
}

// Next.js 16 - obsluga dynamicznej sesji.
export default function NewEventPage() {
    return (
        <Suspense fallback={<NewEventLoading />}>
            <NewEventContent />
        </Suspense>
    );
}

