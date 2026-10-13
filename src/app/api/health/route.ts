
import { NextResponse } from "next/server";

export async function GET() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
        return NextResponse.json(
            { status: "error", message: "Brak konfiguracji Supabase" },
            { status: 500 }
        );
    }

    try {
        const response = await fetch(
            new URL("/auth/v1/health", url),
            {
                headers: { apikey: key },
                cache: "no-store",
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { status: "error", message: "Supabase nie odpowiada poprawnie" },
                { status: 502 }
            );
        }

        return NextResponse.json({
            status: "ok",
            supabase: "connected",
        });
    } catch {
        return NextResponse.json(
            { status: "error", message: "Nie można połączyć się z Supabase" },
            { status: 503 }
        );
    }
}
