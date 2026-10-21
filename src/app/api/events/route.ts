
import { connection, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";


// GET /api/events
// Pobiera wydarzenia zalogowanego zespolu.

export async function GET() {
    // Endpoint wymaga rzeczywistego żądania HTTP,
    // ponieważ odczytuje sesję użytkownika z cookies.
    await connection();

    try {
        const supabase = await createClient();

        // KROK 1: Weryfikacja zalogowanego uzytkownika.
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Wymagane jest zalogowanie." },
                { status: 401 }
            );
        }

        // KROK 2: Pobranie wydarzen z PostgreSQL.
        const { data: events, error } = await supabase
            .from("events")
            .select(
                "id, team_id, title, type, starts_at, ends_at, location, description, created_at"
            )
            .eq("team_id", user.id)
            .order("starts_at", { ascending: true });

        // KROK 3: Obsluga bledu bazy danych.
        if (error) {
            console.error("Blad pobierania wydarzen:", error.message);

            return NextResponse.json(
                { error: "Nie udalo sie pobrac wydarzen." },
                { status: 500 }
            );
        }

        // KROK 4: Poprawna odpowiedz HTTP 200.
        return NextResponse.json(
            { data: events ?? [] },
            { status: 200 }
        );

    } catch (error) {
        console.error("Blad GET /api/events:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}


// POST /api/events
// Tworzy nowe wydarzenie zalogowanego zespolu.

export async function POST(request: Request) {
    try {
        const supabase = await createClient();

        // 1. Sprawdzamy tozsamosc uzytkownika.
        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json(
                { error: "Wymagane jest zalogowanie." },
                { status: 401 }
            );
        }

        // 2. Odczytujemy JSON przeslany przez klienta.
        let payload: unknown;

        try {
            payload = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Niepoprawny format JSON." },
                { status: 400 }
            );
        }

        if (!payload || typeof payload !== "object" ||
            Array.isArray(payload)) {
            return NextResponse.json(
                { error: "Dane musza byc obiektem JSON." },
                { status: 400 }
            );
        }

        const body = payload as Record<string, unknown>;

        // 3. Akceptujemy tylko wskazane pola.
        const allowedFields = [
            "title", "type", "starts_at", "ends_at",
            "location", "description"
        ];

        if (Object.keys(body).some(
            (key) => !allowedFields.includes(key)
        )) {
            return NextResponse.json(
                { error: "Zadanie zawiera niedozwolone pola." },
                { status: 400 }
            );
        }

        // 4. Walidacja tytulu.
        const title =
            typeof body.title === "string"
                ? body.title.trim()
                : "";

        if (title.length < 3 || title.length > 150) {
            return NextResponse.json(
                { error: "Tytul musi miec od 3 do 150 znakow." },
                { status: 400 }
            );
        }

        // 5. Walidacja rodzaju wydarzenia.
        if (
            body.type !== "rehearsal" &&
            body.type !== "concert" &&
            body.type !== "other"
        ) {
            return NextResponse.json(
                { error: "Nieprawidlowy typ wydarzenia." },
                { status: 400 }
            );
        }

        // 6. Walidacja dat z podana strefa czasowa.
        const validDate = (value: unknown): value is string =>
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
            !Number.isNaN(Date.parse(value));


        if (!validDate(body.starts_at) ||
            !validDate(body.ends_at)) {
            return NextResponse.json(
                { error: "Podaj poprawne daty ISO 8601 ze strefa czasowa." },
                { status: 400 }
            );
        }

        if (
            Date.parse(body.ends_at) <= Date.parse(body.starts_at)
        ) {
            return NextResponse.json(
                { error: "Koniec wydarzenia musi byc po jego rozpoczeciu." },
                { status: 400 }
            );
        }

        // 7. Walidacja pol opcjonalnych.
        for (const field of ["location", "description"]) {
            const value = body[field];

            if (value !== undefined && value !== null &&
                typeof value !== "string") {
                return NextResponse.json(
                    { error: `Pole ${field} musi byc tekstem.` },
                    { status: 400 }
                );
            }
        }

        const location =
            typeof body.location === "string"
                ? body.location.trim()
                : null;

        const description =
            typeof body.description === "string"
                ? body.description.trim()
                : null;

        if ((location?.length ?? 0) > 200 ||
            (description?.length ?? 0) > 2000) {
            return NextResponse.json(
                { error: "Lokalizacja lub opis sa za dlugie." },
                { status: 400 }
            );
        }

        // 8. Zapisujemy wydarzenie do PostgreSQL.
        const { data: event, error } = await supabase
            .from("events")
            .insert({
                team_id: user.id,
                title,
                type: body.type,
                starts_at: body.starts_at,
                ends_at: body.ends_at,
                location,
                description,
            })
            .select(
                "id, team_id, title, type, starts_at, ends_at, location, description, created_at"
            )
            .single();

        if (error) {
            console.error("Blad zapisu wydarzenia:", error.message);

            return NextResponse.json(
                { error: "Nie udalo sie zapisac wydarzenia." },
                { status: 500 }
            );
        }

        // 9. Zwracamy utworzony rekord.
        return NextResponse.json(
            { data: event },
            { status: 201 }
        );

    } catch (error) {
        console.error("Blad POST /api/events:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}
