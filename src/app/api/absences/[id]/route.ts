
import { connection, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
    params: Promise<{ id: string }>;
};

// GET /api/absences/[id]
// Pobiera pojedyncze zgloszenie nieobecnosci.
export async function GET(
    _request: Request,
    { params }: RouteContext
) {
    await connection();

    try {
        // 1. Odczytujemy UUID z adresu URL.
        const { id } = await params;

        // 2. Sprawdzamy format UUID.
        const uuidRegex =
            /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            return NextResponse.json(
                { error: "Nieprawidlowy identyfikator nieobecnosci." },
                { status: 400 }
            );
        }

        // 3. Tworzymy klienta Supabase.
        const supabase = await createClient();

        // 4. Weryfikujemy zalogowanego uzytkownika.
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

        // 5. Pobieramy zgloszenie.
        // Polityka RLS ogranicza widoczne rekordy.
        const { data: absence, error: absenceError } =
            await supabase
                .from("absences")
                .select(
                    "id, event_id, member_name, reason, created_at"
                )
                .eq("id", id)
                .maybeSingle();

        if (absenceError) {
            console.error(
                "Blad pobierania nieobecnosci:",
                absenceError.message
            );

            return NextResponse.json(
                { error: "Nie udalo sie pobrac nieobecnosci." },
                { status: 500 }
            );
        }

        if (!absence) {
            return NextResponse.json(
                { error: "Nie znaleziono nieobecnosci." },
                { status: 404 }
            );
        }

        // 6. Dodatkowo sprawdzamy wlasciciela wydarzenia.
        const { data: event, error: eventError } =
            await supabase
                .from("events")
                .select("id")
                .eq("id", absence.event_id)
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
                { error: "Nie znaleziono nieobecnosci." },
                { status: 404 }
            );
        }

        // 7. Zwracamy pojedyncze zgloszenie.
        return NextResponse.json(
            { data: absence },
            { status: 200 }
        );

    } catch (error) {
        console.error("Blad GET /api/absences/[id]:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}


type AbsenceChanges = {
    event_id?: string;
    member_name?: string;
    reason?: string | null;
};

// PATCH /api/absences/[id]
// Aktualizuje zgloszenie nieobecnosci wlasnego zespolu.
export async function PATCH(
    request: Request,
    { params }: RouteContext
) {
    await connection();

    try {
        // 1. Pobieramy UUID z adresu URL.
        const { id } = await params;

        const uuidRegex =
            /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            return NextResponse.json(
                { error: "Nieprawidlowy identyfikator nieobecnosci." },
                { status: 400 }
            );
        }

        // 2. Weryfikujemy sesje Supabase Auth.
        const supabase = await createClient();

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

        // 3. Odczytujemy dane JSON.
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

        // 4. Ograniczamy zestaw dozwolonych pol.
        const allowedFields = [
            "event_id",
            "member_name",
            "reason",
        ];

        const keys = Object.keys(body);

        if (
            keys.length === 0 ||
            keys.some((key) => !allowedFields.includes(key))
        ) {
            return NextResponse.json(
                { error: "Brak pol do zmiany lub niedozwolone pola." },
                { status: 400 }
            );
        }

        const hasField = (name: string) =>
            Object.prototype.hasOwnProperty.call(body, name);

        const changes: AbsenceChanges = {};

        // 5. Walidacja imienia i nazwiska.
        if (hasField("member_name")) {
            if (typeof body.member_name !== "string") {
                return NextResponse.json(
                    { error: "Imie i nazwisko musi byc tekstem." },
                    { status: 400 }
                );
            }

            const memberName = body.member_name.trim();

            if (
                memberName.length < 2 ||
                memberName.length > 100
            ) {
                return NextResponse.json(
                    { error: "Imie i nazwisko musi miec od 2 do 100 znakow." },
                    { status: 400 }
                );
            }

            changes.member_name = memberName;
        }

        // 6. Walidacja powodu nieobecnosci.
        if (hasField("reason")) {
            const value = body.reason;

            if (value !== null && typeof value !== "string") {
                return NextResponse.json(
                    { error: "Powod musi byc tekstem lub null." },
                    { status: 400 }
                );
            }

            const reason =
                typeof value === "string"
                    ? value.trim() || null
                    : null;

            if (reason !== null && reason.length > 2000) {
                return NextResponse.json(
                    { error: "Powod moze miec maksymalnie 2000 znakow." },
                    { status: 400 }
                );
            }

            changes.reason = reason;
        }

        // 7. Walidacja opcjonalnej zmiany wydarzenia.
        if (hasField("event_id")) {
            if (
                typeof body.event_id !== "string" ||
                !uuidRegex.test(body.event_id)
            ) {
                return NextResponse.json(
                    { error: "Nieprawidlowy identyfikator wydarzenia." },
                    { status: 400 }
                );
            }

            changes.event_id = body.event_id;
        }

        // 8. Sprawdzamy, czy zgloszenie istnieje
        // i jest widoczne dla zalogowanego uzytkownika.
        const { data: existing, error: readError } =
            await supabase
                .from("absences")
                .select("id, event_id")
                .eq("id", id)
                .maybeSingle();

        if (readError) {
            console.error(
                "Blad odczytu nieobecnosci:",
                readError.message
            );

            return NextResponse.json(
                { error: "Nie udalo sie odczytac nieobecnosci." },
                { status: 500 }
            );
        }

        if (!existing) {
            return NextResponse.json(
                { error: "Nie znaleziono nieobecnosci." },
                { status: 404 }
            );
        }

        // 9. Potwierdzamy wlasciciela aktualnego wydarzenia.
        const { data: currentEvent, error: currentError } =
            await supabase
                .from("events")
                .select("id")
                .eq("id", existing.event_id)
                .eq("team_id", user.id)
                .maybeSingle();

        if (currentError) {
            console.error(
                "Blad sprawdzania wlasciciela:",
                currentError.message
            );

            return NextResponse.json(
                { error: "Nie udalo sie sprawdzic wydarzenia." },
                { status: 500 }
            );
        }

        if (!currentEvent) {
            return NextResponse.json(
                { error: "Nie znaleziono nieobecnosci." },
                { status: 404 }
            );
        }

        // 10. Przy zmianie event_id sprawdzamy,
        // czy nowe wydarzenie nalezy do tego zespolu.
        if (changes.event_id !== undefined) {
            const { data: targetEvent, error: targetError } =
                await supabase
                    .from("events")
                    .select("id")
                    .eq("id", changes.event_id)
                    .eq("team_id", user.id)
                    .maybeSingle();

            if (targetError) {
                console.error(
                    "Blad sprawdzania nowego wydarzenia:",
                    targetError.message
                );

                return NextResponse.json(
                    { error: "Nie udalo sie sprawdzic wydarzenia." },
                    { status: 500 }
                );
            }

            if (!targetEvent) {
                return NextResponse.json(
                    { error: "Nie znaleziono wydarzenia." },
                    { status: 404 }
                );
            }
        }

        // 11. Aktualizujemy rekord.
        const { data: updated, error: updateError } =
            await supabase
                .from("absences")
                .update(changes)
                .eq("id", id)
                .select(
                    "id, event_id, member_name, reason, created_at"
                )
                .maybeSingle();

        if (updateError) {
            console.error(
                "Blad aktualizacji nieobecnosci:",
                updateError.message
            );

            if (
                updateError.code === "23514" ||
                updateError.code === "23503"
            ) {
                return NextResponse.json(
                    { error: "Dane naruszaja ograniczenia bazy." },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: "Nie udalo sie zaktualizowac nieobecnosci." },
                { status: 500 }
            );
        }

        if (!updated) {
            return NextResponse.json(
                { error: "Nie znaleziono nieobecnosci." },
                { status: 404 }
            );
        }

        // 12. Zwracamy zaktualizowany rekord.
        return NextResponse.json(
            { data: updated },
            { status: 200 }
        );

    } catch (error) {
        console.error("Blad PATCH /api/absences/[id]:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}


// DELETE /api/absences/[id]
// Usuwa nieobecnosc nalezaca do zalogowanego zespolu.

export async function DELETE(
    _request: Request,
    { params }: RouteContext
) {
    await connection();

    try {
        // 1. Odczytujemy UUID nieobecnosci.
        const { id } = await params;

        const uuidRegex =
            /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            return NextResponse.json(
                { error: "Nieprawidlowy identyfikator nieobecnosci." },
                { status: 400 }
            );
        }

        // 2. Sprawdzamy aktywna sesje.
        const supabase = await createClient();

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

        // 3. Szukamy zgloszenia.
        // RLS ukrywa rekordy innych zespolow.
        const { data: absence, error: readError } =
            await supabase
                .from("absences")
                .select("id, event_id")
                .eq("id", id)
                .maybeSingle();

        if (readError) {
            console.error(
                "Blad odczytu nieobecnosci:",
                readError.message
            );

            return NextResponse.json(
                { error: "Nie udalo sie odczytac nieobecnosci." },
                { status: 500 }
            );
        }

        if (!absence) {
            return NextResponse.json(
                { error: "Nie znaleziono nieobecnosci." },
                { status: 404 }
            );
        }

        // 4. Potwierdzamy wlasciciela wydarzenia.
        const { data: event, error: eventError } =
            await supabase
                .from("events")
                .select("id")
                .eq("id", absence.event_id)
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
                { error: "Nie znaleziono nieobecnosci." },
                { status: 404 }
            );
        }

        // 5. Usuwamy wskazane zgloszenie.
        // Polityka RLS dodatkowo kontroluje DELETE.
        const { data: deleted, error: deleteError } =
            await supabase
                .from("absences")
                .delete()
                .eq("id", id)
                .eq("event_id", absence.event_id)
                .select("id")
                .maybeSingle();

        if (deleteError) {
            console.error(
                "Blad usuwania nieobecnosci:",
                deleteError.message
            );

            return NextResponse.json(
                { error: "Nie udalo sie usunac nieobecnosci." },
                { status: 500 }
            );
        }

        if (!deleted) {
            return NextResponse.json(
                { error: "Nie znaleziono nieobecnosci." },
                { status: 404 }
            );
        }

        // 6. Potwierdzamy usuniecie bez tresci odpowiedzi.
        return new Response(null, { status: 204 });

    } catch (error) {
        console.error("Blad DELETE /api/absences/[id]:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}

