
"use client";

import { useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";


export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(event: SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setLoading(true);

        try {
            const supabase = createClient();

            const { error: authError } =
                await supabase.auth.signInWithPassword({
                    email,
                    password,
                });


            if (authError) {
                setError("Nie udało się zalogować. Sprawdź dane konta.");
                return;
            }


            // Po zalogowaniu przechodzimy do panelu zespołu.
            router.replace("/dashboard");
            router.refresh();
        } catch {
            setError("Wystąpił problem z połączeniem.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="container py-5">
            <div className="row justify-content-center">
                <div className="col-12 col-md-6 col-lg-5">
                    <div className="card shadow-sm">
                        <div className="card-body p-4">
                            <h1 className="h3 mb-3">
                                Ensemble Manager
                            </h1>

                            <p className="text-secondary">
                                Zaloguj się na konto zespołu muzycznego.
                            </p>

                            <form onSubmit={handleLogin}>
                                <div className="mb-3">
                                    <label htmlFor="email" className="form-label">
                                        Adres e-mail
                                    </label>

                                    <input
                                        id="email"
                                        type="email"
                                        className="form-control"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="mb-3">
                                    <label htmlFor="password" className="form-label">
                                        Hasło
                                    </label>

                                    <input
                                        id="password"
                                        type="password"
                                        className="form-control"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                {error && (
                                    <div className="alert alert-danger" role="alert">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary w-100"
                                    disabled={loading}
                                >
                                    {loading ? "Logowanie..." : "Zaloguj się"}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
