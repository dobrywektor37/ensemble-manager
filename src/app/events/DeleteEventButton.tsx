
"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DeleteEventButtonProps = {
    eventId: string;
    eventTitle: string;
};

export default function DeleteEventButton({
                                              eventId,
                                              eventTitle,
                                          }: DeleteEventButtonProps) {
    const router = useRouter();
    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogTitleId = useId();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [deleted, setDeleted] = useState(false);

    // Otwieramy okno potwierdzenia.
    function openConfirmation() {
        setError("");
        dialogRef.current?.showModal();
    }

    // Zamykamy okno bez usuwania.
    function cancelDeletion() {
        if (!loading) {
            dialogRef.current?.close();
        }
    }

    // Usuwamy wydarzenie przez REST API.
    async function handleDelete() {
        if (loading || deleted) {
            return;
        }

        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                `/api/events/${eventId}`,
                {
                    method: "DELETE",
                    credentials: "same-origin",
                }
            );

            // Backend powinien zwrocic 204 No Content.
            if (response.status !== 204) {
                const result: unknown = await response
                    .json()
                    .catch(() => null);

                let message =
                    "Nie udało się usunąć wydarzenia.";

                if (
                    result &&
                    typeof result === "object" &&
                    "error" in result &&
                    typeof result.error === "string"
                ) {
                    message = result.error;
                }

                setError(message);
                return;
            }

            // Sukces - zamykamy okno i odswiezamy
            // liste pobierana z Supabase.
            dialogRef.current?.close();
            setDeleted(true);
            router.refresh();

        } catch {
            setError(
                "Wystąpił problem z połączeniem z serwerem."
            );
        } finally {
            setLoading(false);
        }
    }

    if (deleted) {
        return null;
    }

    return (
        <>
            <button
                type="button"
                className="btn btn-sm btn-outline-danger"
                onClick={openConfirmation}
                aria-label={`Usuń wydarzenie: ${eventTitle}`}
            >
                Usuń
            </button>

            {/* Okno potwierdzenia Black & Red */}
            <dialog
                ref={dialogRef}
                aria-labelledby={dialogTitleId}
                aria-describedby={`${dialogTitleId}-description`}
                onCancel={(event) => {
                    if (loading) {
                        event.preventDefault();
                    }
                }}
                style={{
                    backgroundColor: "#161619",
                    color: "#f5f5f5",
                    border: "1px solid #e81737",
                    borderRadius: 0,
                    width: "100%",
                    maxWidth: "min(92vw, 480px)",
                }}
                className="p-4 shadow-lg"
            >
                <h2
                    id={dialogTitleId}
                    className="h4 fw-bold mb-3"
                >
                    Usunąć wydarzenie?
                </h2>

                <p
                    id={`${dialogTitleId}-description`}
                    className="text-body-secondary mb-3"
                >
                    Czy na pewno chcesz trwale usunąć
                    to wydarzenie?
                </p>

                <p className="fw-bold mb-3">
                    {eventTitle}
                </p>

                <div
                    className="alert alert-danger"
                    role="note"
                >
                    Ta operacja jest nieodwracalna.
                    Usunięte zostaną również
                    wszystkie nieobecności
                    przypisane do tego wydarzenia.
                </div>

                {error && (
                    <div
                        className="alert alert-danger"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                <div className="d-flex flex-column flex-sm-row gap-2">
                    <button
                        type="button"
                        className="btn btn-danger"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        {loading
                            ? "Usuwanie..."
                            : "Tak, usuń wydarzenie"}
                    </button>

                    <button
                        type="button"
                        className="btn btn-outline-light"
                        onClick={cancelDeletion}
                        disabled={loading}
                    >
                        Anuluj
                    </button>
                </div>
            </dialog>
        </>
    );
}
