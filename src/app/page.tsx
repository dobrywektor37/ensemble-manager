
export default function Home() {
  return (
      <main className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8">
            <div className="card shadow-sm">
              <div className="card-body p-4">
              <span className="badge text-bg-primary mb-3">
                Ensemble Manager
              </span>

                <h1 className="h2">
                  Panel zespołu muzycznego
                </h1>

                <p className="text-secondary">
                  System zarządzania próbami, koncertami
                  i zgłoszeniami nieobecności.
                </p>

                <div className="alert alert-info">
                  Aplikacja została pomyślnie uruchomiona.
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
  );
}
