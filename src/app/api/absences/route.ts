
import { connection, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /api/absences
// Zwraca nieobecnosci dostepne dla zalogowanego zespolu.
export async function GET(request: Request) {
    await connection();

    try {
        const supabase = await createClient();

        // 1. Sprawdzamy zalogowanego uzytkownika.
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

        // 2. Odczytujemy opcjonalny filtr wydarzenia.
        const url = new URL(request.url);
        const eventId = url.searchParams.get("event_id");

        const uuidRegex =
            /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

        if (eventId !== null && !uuidRegex.test(eventId)) {
            return NextResponse.json(
                { error: "Nieprawidlowy identyfikator wydarzenia." },
                { status: 400 }
            );
        }

        // 3. Pobieramy zgłoszenia.
        let query = supabase
            .from("absences")
            .select("id, event_id, member_name, reason, created_at")
            .order("created_at", { ascending: false });

        // 4. Opcjonalnie ograniczamy wyniki do wydarzenia.
        if (eventId !== null) {
            query = query.eq("event_id", eventId);
        }

        const { data: absences, error } = await query;

        if (error) {
            console.error("Blad pobierania nieobecnosci:", error.message);

            return NextResponse.json(
                { error: "Nie udalo sie pobrac nieobecnosci." },
                { status: 500 }
            );
        }

        // 5. Zwracamy liste.
        return NextResponse.json(
            { data: absences ?? [] },
            { status: 200 }
        );
    } catch (error) {
        console.error("Blad GET /api/absences:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}


// POST /api/absences
// Tworzy zgloszenie nieobecnosci na wydarzenie
// nalezace do zalogowanego zespolu.

export async function POST(request: Request) {
    await connection();

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

        // 2. Odczytujemy JSON z zadania HTTP.
        let payload: unknown;

        try {
            payload = await request.json();
        } catch {
            return NextResponse.json(
                { error: "Niepoprawny format JSON." },
                { status: 400 }
            );
        }

        if (
            !payload ||
            typeof payload !== "object" ||
            Array.isArray(payload)
        ) {
            return NextResponse.json(
                { error: "Dane musza byc obiektem JSON." },
                { status: 400 }
            );
        }

        const body = payload as Record<string, unknown>;

        // 3. Akceptujemy tylko dozwolone pola.
        const allowedFields = [
            "event_id",
            "member_name",
            "reason"
        ];

        if (
            Object.keys(body).some(
                (key) => !allowedFields.includes(key)
            )
        ) {
            return NextResponse.json(
                { error: "Zadanie zawiera niedozwolone pola." },
                { status: 400 }
            );
        }

        // 4. Walidujemy UUID wydarzenia.
        const uuidRegex =
            /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

        if (
            typeof body.event_id !== "string" ||
            !uuidRegex.test(body.event_id)
        ) {
            return NextResponse.json(
                { error: "Nieprawidlowy identyfikator wydarzenia." },
                { status: 400 }
            );
        }

        const eventId = body.event_id;

        // 5. Walidujemy imie i nazwisko.
        const memberName =
            typeof body.member_name === "string"
                ? body.member_name.trim()
                : "";

        if (
            memberName.length < 2 ||
            memberName.length > 100
        ) {
            return NextResponse.json(
                { error: "Imie i nazwisko musi miec od 2 do 100 znakow." },
                { status: 400 }
            );
        }

        // 6. Walidujemy opcjonalny powod.
        if (
            body.reason !== undefined &&
            body.reason !== null &&
            typeof body.reason !== "string"
        ) {
            return NextResponse.json(
                { error: "Powod musi byc tekstem lub null." },
                { status: 400 }
            );
        }

        const reason =
            typeof body.reason === "string"
                ? body.reason.trim() || null
                : null;

        if (reason !== null && reason.length > 2000) {
            return NextResponse.json(
                { error: "Powod moze miec maksymalnie 2000 znakow." },
                { status: 400 }
            );
        }

        // 7. Sprawdzamy, czy wydarzenie istnieje
        // i nalezy do zalogowanego zespolu.
        const { data: event, error: eventError } =
            await supabase
                .from("events")
                .select("id")
                .eq("id", eventId)
                .eq("team_id", user.id)
                .maybeSingle();

        if (eventError) {
            console.error(
                "Blad sprawdzania wydarzenia:",
                eventError.message
            );

            return NextResponse.json(
                { error: "Nie udalo sie sprawdzic wydarzenia." },
                { status: 500 }
            );
        }

        if (!event) {
            return NextResponse.json(
                { error: "Nie znaleziono wydarzenia." },
                { status: 404 }
            );
        }

        // 8. Zapisujemy zgloszenie w PostgreSQL.
        const { data: absence, error: insertError } =
            await supabase
                .from("absences")
                .insert({
                    event_id: eventId,
                    member_name: memberName,
                    reason
                })
                .select(
                    "id, event_id, member_name, reason, created_at"
                )
                .single();

        if (insertError) {
            console.error(
                "Blad zapisu nieobecnosci:",
                insertError.message
            );

            return NextResponse.json(
                { error: "Nie udalo sie zapisac nieobecnosci." },
                { status: 500 }
            );
        }

        // 9. Zwracamy utworzone zgloszenie.
        return NextResponse.json(
            { data: absence },
            { status: 201 }
        );

    } catch (error) {
        console.error("Blad POST /api/absences:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}

