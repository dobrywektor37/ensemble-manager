
"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type DeleteAbsenceButtonProps = {
    absenceId: string;
    memberName: string;
    eventTitle: string;
};

export default function DeleteAbsenceButton({
                                                absenceId,
                                                memberName,
                                                eventTitle,
                                            }: DeleteAbsenceButtonProps) {
    const router = useRouter();

    const dialogRef = useRef<HTMLDialogElement>(null);
    const dialogTitleId = useId();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [deleted, setDeleted] = useState(false);

    // Otwieramy okno potwierdzenia.
    function openConfirmation() {
        if (loading || deleted) {
            return;
        }

        setError("");
        dialogRef.current?.showModal();
    }

    // Anulowanie nie wykonuje zadania DELETE.
    function cancelDeletion() {
        if (!loading) {
            dialogRef.current?.close();
        }
    }

    // Wlasciwe usuwanie wybranego zgloszenia.
    async function handleDelete() {
        if (loading || deleted) {
            return;
        }

        setError("");
        setLoading(true);

        try {
            const response = await fetch(
                `/api/absences/${absenceId}`,
                {
                    method: "DELETE",
                    credentials: "same-origin",
                }
            );

            // API powinno zwrocic 204 No Content.
            if (response.status !== 204) {
                const result: unknown = await response
                    .json()
                    .catch(() => null);

                let message =
                    "Nie udało się usunąć nieobecności.";

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

            // Sukces: zamykamy okno i odswiezamy dane.
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
                aria-label={`Usuń nieobecność: ${memberName}`}
            >
                Usuń
            </button>

            <dialog
                ref={dialogRef}
                aria-labelledby={dialogTitleId}
                aria-describedby={`${dialogTitleId}-description`}
                onCancel={(event) => {
                    if (loading) {
                        event.preventDefault();
                    }
                }}
                className="p-4 shadow-lg"
                style={{
                    backgroundColor: "#161619",
                    color: "#f5f5f5",
                    border: "1px solid #e81737",
                    borderRadius: 0,
                    width: "100%",
                    maxWidth: "min(92vw, 480px)",
                }}
            >
                <h2
                    id={dialogTitleId}
                    className="h4 fw-bold mb-3"
                >
                    Usunąć nieobecność?
                </h2>

                <p
                    id={`${dialogTitleId}-description`}
                    className="text-body-secondary mb-3"
                >
                    Czy na pewno chcesz trwale usunąć
                    poniższe zgłoszenie?
                </p>

                <div className="border p-3 mb-3">
                    <p className="fw-bold mb-2">
                        {memberName}
                    </p>

                    <p className="text-body-secondary mb-0">
                        Wydarzenie: {eventTitle}
                    </p>
                </div>

                <div
                    className="alert alert-danger"
                    role="note"
                >
                    Ta operacja jest nieodwracalna.
                    Usunięte zostanie wyłącznie wskazane
                    zgłoszenie nieobecności.
                    Samo wydarzenie pozostanie bez zmian.
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
                            : "Tak, usuń nieobecność"}
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
