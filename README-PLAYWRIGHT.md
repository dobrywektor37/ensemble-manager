# Ensemble Manager — komplet testów Playwright

Wymagane: Node.js, `@playwright/test`, Chromium (`npx.cmd playwright install chromium`).

## Pliki

- `playwright.config.ts` — konfiguracja; jeśli masz już wersję z kroku 12.69, nie musisz jej podmieniać.
- `tests/e2e/health.spec.ts` — E2E-01; jeśli już masz działający plik, nie musisz go podmieniać.
- `tests/e2e/security.spec.ts` — E2E-02 do E2E-04; zastąp cały obecny plik.
- `tests/e2e/public-ui.spec.ts` — E2E-05 do E2E-08; nowy plik.
- `tests/e2e/authenticated.spec.ts` — E2E-09 i E2E-10; nowy plik, testy wymagające kont testowych domyślnie pomijane.
- `.gitignore` — ignoruje dane środowiskowe i raporty Playwright.

## Pierwsze uruchomienie

W katalogu głównym projektu:

```powershell
npx.cmd playwright test
```

Bez danych testowych powinno uruchomić się 8 testów, a 2 dodatkowe zostaną pominięte. Wcześniej potwierdzono jedynie E2E-01, E2E-02 i E2E-03; wszystkie pozostałe należy rzeczywiście uruchomić i zweryfikować.

## Opcjonalne testy CRUD i izolacji zespołów

Należy utworzyć osobne konta TESTOWE A i B w Supabase oraz odpowiadające im rekordy `teams`, NIE wykorzystywać kont z prawdziwymi danymi.

Utwórz lokalny plik `.env.e2e.local` w katalogu głównym (objęty `.gitignore`):

```dotenv
E2E_ALLOW_WRITES=YES
E2E_TEST_EMAIL_A=test-a@example.com
E2E_TEST_PASSWORD_A=UZUPELNIJ_WLASNYM_HASLEM
E2E_TEST_EMAIL_B=test-b@example.com
E2E_TEST_PASSWORD_B=UZUPELNIJ_WLASNYM_HASLEM
```

Podmień przykłady na własne dane. Nigdy nie dodawaj haseł do repozytorium ani nie przesyłaj ich w wiadomościach. Jeśli nie chcesz uruchamiać testów modyfikujących bazę, pomiń plik `.env.e2e.local` lub ustaw `E2E_ALLOW_WRITES=NO`.

```powershell
npx.cmd playwright test
```

Testy modyfikują tylko rekordy utworzone przez siebie i próbują je usunąć po zakończeniu. Przy awarii sieci nie można jednak zagwarantować sprzątnięcia; przed użyciem testów w produkcji potrzebne jest osobne środowisko testowe.
