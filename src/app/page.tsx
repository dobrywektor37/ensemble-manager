
import Link from "next/link";

const features = [
  {
    title: "Próby",
    description:
        "Planuj próby zespołu i zarządzaj terminami spotkań.",
    icon: "🎼",
  },
  {
    title: "Koncerty",
    description:
        "Organizuj koncerty i przechowuj informacje o wydarzeniach.",
    icon: "🎤",
  },
  {
    title: "Nieobecności",
    description:
        "Zbieraj zgłoszenia nieobecności na próbach i koncertach.",
    icon: "📅",
  },
];

export default function Home() {
  return (
      <main className="container py-4 py-md-5">

        {/* Nagłówek */}
        <header className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-5">
        <span className="fs-4 fw-bold">
          Ensemble Manager
        </span>

          <Link
              href="/login"
              className="btn btn-outline-light"
          >
            Zaloguj się
          </Link>
        </header>

        {/* Sekcja powitalna */}
          <section className="text-center py-4 py-md-5 em-hero">
        <span className="badge text-bg-primary mb-3">
          Zarządzanie zespołem muzycznym
        </span>

          <h1 className="display-5 fw-bold mb-4">
            Twój zespół.
            <br />
            Wszystko w jednym miejscu.
          </h1>

          <p className="lead text-secondary mx-auto mb-4"
             style={{ maxWidth: "650px" }}>
            Planuj próby, organizuj koncerty i zarządzaj
            zgłoszeniami nieobecności w jednej aplikacji.
          </p>

          <Link
              href="/login"
              className="btn btn-primary btn-lg"
          >
            Przejdź do logowania
          </Link>
        </section>

        {/* Kafelki funkcjonalności */}
        <section className="row g-4 mt-4">
          {features.map((feature) => (
              <div
                  className="col-12 col-md-4"
                  key={feature.title}
              >
                <div className="card h-100 shadow-sm">
                  <div className="card-body p-4">

                    <div className="fs-2 mb-3">
                      {feature.icon}
                    </div>

                    <h2 className="h5 fw-semibold">
                      {feature.title}
                    </h2>

                    <p className="text-secondary mb-0">
                      {feature.description}
                    </p>

                  </div>
                </div>
              </div>
          ))}
        </section>

        <footer className="text-center text-secondary small mt-5">
          Ensemble Manager
        </footer>
      </main>
  );
}
