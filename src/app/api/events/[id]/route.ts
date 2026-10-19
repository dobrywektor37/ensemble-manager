
import { connection, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
    params: Promise<{ id: string }>;
};

// GET /api/events/[id]
// Pobiera pojedyncze wydarzenie zalogowanego zespolu.
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
                { error: "Nieprawidlowy identyfikator wydarzenia." },
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

        // 5. Pobieramy wydarzenie nalezace do zespolu.
        const { data: event, error } = await supabase
            .from("events")
            .select(
                "id, team_id, title, type, starts_at, ends_at, location, description, created_at"
            )
            .eq("id", id)
            .eq("team_id", user.id)
            .maybeSingle();

        if (error) {
            console.error("Blad pobierania wydarzenia:", error.message);

            return NextResponse.json(
                { error: "Nie udalo sie pobrac wydarzenia." },
                { status: 500 }
            );
        }

        // 6. Brak rekordu lub brak dostepu do wydarzenia.
        if (!event) {
            return NextResponse.json(
                { error: "Nie znaleziono wydarzenia." },
                { status: 404 }
            );
        }

        // 7. Zwracamy znalezione wydarzenie.
        return NextResponse.json(
            { data: event },
            { status: 200 }
        );
    } catch (error) {
        console.error("Blad GET /api/events/[id]:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}

type PatchContext = {
    params: Promise<{ id: string }>;
};

// PATCH /api/events/[id]
// Aktualizuje wydarzenie zalogowanego zespolu.
export async function PATCH(
    request: Request,
    { params }: PatchContext
) {
    await connection();

    try {
        // 1. Pobieramy identyfikator wydarzenia.
        const { id } = await params;

        const uuidRegex =
            /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            return NextResponse.json(
                { error: "Nieprawidlowy identyfikator wydarzenia." },
                { status: 400 }
            );
        }

        // 2. Weryfikujemy zalogowanego uzytkownika.
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

        // 4. Sprawdzamy dozwolone pola.
        const allowedFields = [
            "title",
            "type",
            "starts_at",
            "ends_at",
            "location",
            "description",
        ];

        if (
            Object.keys(body).length === 0 ||
            Object.keys(body).some(
                (key) => !allowedFields.includes(key)
            )
        ) {
            return NextResponse.json(
                { error: "Brak pol do zmiany lub niedozwolone pola." },
                { status: 400 }
            );
        }

        // 5. Przygotowujemy tylko przeslane zmiany.
        const changes: Record<string, string | null> = {};

        const hasField = (name: string) =>
            Object.prototype.hasOwnProperty.call(body, name);

        if (hasField("title")) {
            if (typeof body.title !== "string") {
                return NextResponse.json(
                    { error: "Tytul musi byc tekstem." },
                    { status: 400 }
                );
            }

            const title = body.title.trim();

            if (title.length < 3 || title.length > 150) {
                return NextResponse.json(
                    { error: "Tytul musi miec od 3 do 150 znakow." },
                    { status: 400 }
                );
            }

            changes.title = title;
        }

        if (hasField("type")) {
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

            changes.type = body.type;
        }

        // 6. Walidujemy daty.
        const validDate = (value: unknown): value is string =>
            typeof value === "string" &&
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
            !Number.isNaN(Date.parse(value));

        for (const field of ["starts_at", "ends_at"]) {
            if (hasField(field)) {
                if (!validDate(body[field])) {
                    return NextResponse.json(
                        { error: "Niepoprawny format daty." },
                        { status: 400 }
                    );
                }

                changes[field] = body[field];
            }
        }

        // 7. Walidujemy lokalizacje i opis.
        for (const field of ["location", "description"]) {
            if (hasField(field)) {
                const value = body[field];

                if (value !== null && typeof value !== "string") {
                    return NextResponse.json(
                        { error: `Pole ${field} musi byc tekstem lub null.` },
                        { status: 400 }
                    );
                }

                const text = typeof value === "string"
                    ? value.trim()
                    : null;

                const maxLength =
                    field === "location" ? 200 : 2000;

                if (text !== null && text.length > maxLength) {
                    return NextResponse.json(
                        { error: `Pole ${field} jest za dlugie.` },
                        { status: 400 }
                    );
                }

                changes[field] = text;
            }
        }

        // 8. Pobieramy istniejace wydarzenie.
        const { data: existing, error: readError } =
            await supabase
                .from("events")
                .select("id, starts_at, ends_at")
                .eq("id", id)
                .eq("team_id", user.id)
                .maybeSingle();

        if (readError) {
            console.error("Blad odczytu wydarzenia:", readError.message);

            return NextResponse.json(
                { error: "Nie udalo sie odczytac wydarzenia." },
                { status: 500 }
            );
        }

        if (!existing) {
            return NextResponse.json(
                { error: "Nie znaleziono wydarzenia." },
                { status: 404 }
            );
        }

        // 9. Sprawdzamy kolejnosc dat po zmianach.
        // PATCH moze zmieniac tylko jedna z dwoch dat.
        const startsAt =
            changes.starts_at ?? existing.starts_at;

        const endsAt =
            changes.ends_at ?? existing.ends_at;

        if (Date.parse(endsAt) <= Date.parse(startsAt)) {
            return NextResponse.json(
                { error: "Koniec wydarzenia musi byc po jego rozpoczeciu." },
                { status: 400 }
            );
        }

        // 10. Aktualizujemy rekord w PostgreSQL.
        const { data: updated, error: updateError } =
            await supabase
                .from("events")
                .update(changes)
                .eq("id", id)
                .eq("team_id", user.id)
                .select(
                    "id, team_id, title, type, starts_at, ends_at, location, description, created_at"
                )
                .maybeSingle();

        if (updateError) {
            console.error(
                "Blad aktualizacji wydarzenia:",
                updateError.message
            );

            // Dodatkowe zabezpieczenie na poziomie PostgreSQL.
            if (updateError.code === "23514") {
                return NextResponse.json(
                    { error: "Dane naruszaja ograniczenia bazy." },
                    { status: 400 }
                );
            }

            return NextResponse.json(
                { error: "Nie udalo sie zaktualizowac wydarzenia." },
                { status: 500 }
            );
        }

        if (!updated) {
            return NextResponse.json(
                { error: "Nie znaleziono wydarzenia." },
                { status: 404 }
            );
        }

        // 11. Zwracamy zaktualizowany rekord.
        return NextResponse.json(
            { data: updated },
            { status: 200 }
        );
    } catch (error) {
        console.error("Blad PATCH /api/events/[id]:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}


// DELETE /api/events/[id]
// Usuwa wydarzenie nalezace do zalogowanego zespolu.

export async function DELETE(
    _request: Request,
    { params }: RouteContext
) {
    await connection();

    try {
        // 1. Pobieramy identyfikator wydarzenia.
        const { id } = await params;

        // 2. Sprawdzamy format UUID.
        const uuidRegex =
            /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

        if (!uuidRegex.test(id)) {
            return NextResponse.json(
                { error: "Nieprawidlowy identyfikator wydarzenia." },
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

        // 5. Usuwamy tylko wydarzenie swojego zespolu.
        const { data: deleted, error: deleteError } =
            await supabase
                .from("events")
                .delete()
                .eq("id", id)
                .eq("team_id", user.id)
                .select("id")
                .maybeSingle();

        if (deleteError) {
            console.error(
                "Blad usuwania wydarzenia:",
                deleteError.message
            );

            return NextResponse.json(
                { error: "Nie udalo sie usunac wydarzenia." },
                { status: 500 }
            );
        }

        // 6. Rekord nie istnieje lub nie nalezy do zespolu.
        if (!deleted) {
            return NextResponse.json(
                { error: "Nie znaleziono wydarzenia." },
                { status: 404 }
            );
        }

        // 7. Potwierdzamy usuniecie bez tresci odpowiedzi.
        return new Response(null, { status: 204 });

    } catch (error) {
        console.error("Blad DELETE /api/events/[id]:", error);

        return NextResponse.json(
            { error: "Wewnetrzny blad serwera." },
            { status: 500 }
        );
    }
}
