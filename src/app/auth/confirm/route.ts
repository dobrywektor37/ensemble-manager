
import { connection, NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET /auth/confirm
// Weryfikuje jednorazowy link odzyskiwania hasla.

export async function GET(request: NextRequest) {
    // Nie wykonujemy tej operacji podczas prerenderingu.
    await connection();

    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");

    const successUrl = new URL(
        "/account/update-password",
        request.url
    );

    const errorUrl = new URL(
        "/account/update-password?error=invalid_link",
        request.url
    );

    // Akceptujemy wylacznie linki odzyskiwania hasla.
    if (!tokenHash || type !== "recovery") {
        return NextResponse.redirect(errorUrl);
    }

    const supabase = await createClient();

    // Supabase sprawdza waznosc i jednorazowosc tokenu.
    const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
    });

    if (error) {
        return NextResponse.redirect(errorUrl);
    }

    // Sesja zostala zapisana przez klienta Supabase SSR.
    // Przekierowanie nie zawiera juz tokenu.
    return NextResponse.redirect(successUrl);
}
