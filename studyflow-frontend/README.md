# StudyFlow — System Zarządzania Szkołą Online z Korepetytorami

**StudyFlow** to kompleksowa aplikacja internetowa przeznaczona do organizacji korepetycji i zarządzania szkołą online. Platforma łączy uczniów, korepetytorów oraz administratorów, zapewniając wygodne rezerwowanie lekcji, śledzenie postępów, ocenianie zajęć oraz generowanie raportów finansowych.

## 🛠️ Stos technologiczny

- **Backend**: NestJS, TypeScript, Prisma ORM, SQLite, JWT cookies, Swagger, Bcrypt
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios, TanStack Query, Vitest

## 📋 Wymagania wstępne

Przed uruchomieniem projektu upewnij się, że masz zainstalowane:

1. **Node.js** w wersji `v24.15` lub nowszej oraz menedżer pakietów `npm`
2. **Git**

SQLite jest bazą plikową — nie wymaga instalowania ani uruchamiania PostgreSQL, Dockera ani osobnego serwera bazy danych. Zmiana z PostgreSQL nie przenosi automatycznie istniejących danych; lokalna baza SQLite zaczyna jako nowa baza.

## 🚀 Uruchomienie projektu

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/marta522/StudyFlow.git
cd StudyFlow
```

### 2. Skonfiguruj i uruchom backend

1. Przejdź do katalogu backendu:

   ```bash
   cd studyflow-backend
   ```

2. Zainstaluj zależności:

   ```bash
   npm install
   ```

3. Skopiuj `studyflow-backend/.env.example` do pliku `.env`:

   PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS/Linux:

   ```bash
   cp .env.example .env
   ```

   Zmień `JWT_SECRET` na unikalną wartość i ustaw `CORS_ORIGINS` na adresy
   frontendu. SMTP jest potrzebne tylko do wysyłania linków resetujących hasło.
   Plik bazy danych zostanie utworzony w `studyflow-backend/prisma/dev.db`.

4. Zastosuj migracje:

   ```bash
   npx prisma migrate deploy
   ```

5. Opcjonalnie zasil nową bazę danymi demonstracyjnymi. Seed usuwa istniejące dane, dlatego uruchamiaj go tylko na nowej bazie albo wtedy, gdy chcesz ją zresetować:

   ```powershell
   $env:SEED_DEMO_RESET = "true"
   npx prisma db seed
   Remove-Item Env:SEED_DEMO_RESET
   ```

   macOS/Linux:

   ```bash
   SEED_DEMO_RESET=true npx prisma db seed
   ```

6. Uruchom backend w trybie deweloperskim:

   ```bash
   npm run start:dev
   ```

   API backendu będzie dostępne pod adresem `http://localhost:3000/api`.

   Odzyskiwanie hasła wymaga poprawnej konfiguracji SMTP. Link resetujący jest
   jednorazowy i wygasa po 30 minutach. Instrukcję tworzenia i odtwarzania kopii
   bazy znajdziesz w `studyflow-backend/README.md`.

### 3. Skonfiguruj i uruchom frontend

Otwórz nowe okno terminala i, z katalogu głównego repozytorium, wykonaj:

1. Przejdź do katalogu frontendu:

   ```bash
   cd studyflow-frontend
   ```

2. Zainstaluj zależności:

   ```bash
   npm install
   ```

3. Opcjonalnie utwórz plik `.env` w katalogu `studyflow-frontend`, aby wskazać adres API:

   ```env
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

4. Uruchom aplikację:

   ```bash
   npm run dev
   ```

   Frontend będzie dostępny pod adresem `http://localhost:5173`.

## 🔐 Konta testowe

Podstawowe konta są tworzone przez seed demonstracyjny. Dodatkowe konta
korepetytorów i uczniów pojawiają się po uruchomieniu addytywnego skryptu danych
demo opisanego w `studyflow-backend/README.md`.

| Rola             | Email                  | Hasło      |
| ---------------- | ---------------------- | ---------- |
| 👑 Administrator | `admin@studyflow.pl`   | `haslo123` |
| 🎓 Korepetytor   | `tutor@studyflow.pl`   | `haslo123` |
| 📚 Uczeń         | `student@studyflow.pl` | `haslo123` |

Seed tworzy także konto `dariusz@studyflow.pl`, ucznia `anna@studyflow.pl`
oraz przykładowe dane lekcji. Rozszerzony zestaw danych dodaje konta
`demo.tutor01@studyflow.local`–`demo.tutor05@studyflow.local` i
`demo.student01@studyflow.local`–`demo.student10@studyflow.local`, a także
przedmioty, historię lekcji oraz powiązane dane.

Wszystkie powyższe loginy i hasło są przeznaczone wyłącznie do lokalnych testów.
Nie używaj ich w środowisku produkcyjnym. Zwykły seed usuwa dotychczasowe dane;
rozszerzony zestaw demo można dopisać bez resetowania lokalnej bazy.

## 🌿 Wprowadzanie zmian

Jeśli chcesz wprowadzać zmiany w projekcie, utwórz osobny branch zamiast pracować bezpośrednio na głównej gałęzi:

```bash
git switch -c nazwa-twojego-brancha
```

## 🔐 Bezpieczeństwo i wdrożenie

Sesja jest przechowywana w cookie `httpOnly`, `SameSite=Lax` i — w produkcji —
`Secure`. Frontend wysyła żądania z credentials; backend wymaga tokenu CSRF w
nagłówku przy żądaniach zmieniających dane. Wdrożenie powinno używać HTTPS, a
frontend i API powinny być w tej samej witrynie (same-site), z dokładnymi
adresami frontendu w `CORS_ORIGINS`.

Jeśli SMTP-hasło lub `JWT_SECRET` mogły znaleźć się w udostępnionym archiwum,
traktuj je jako ujawnione:

1. Zmień/odwołaj hasło aplikacji u dostawcy SMTP, zaktualizuj `SMTP_PASSWORD` w
   sekretach środowiska i uruchom ponownie wszystkie instancje backendu.
2. Wygeneruj nowy sekret poleceniem
   `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`,
   ustaw go jako `JWT_SECRET` w każdym środowisku i uruchom ponownie backend.
   Stare sesje przestaną działać, użytkownicy będą musieli zalogować się ponownie.
3. Nie umieszczaj sekretów w ZIP-ie. Przed wysłaniem sprawdź jego zawartość;
   wyklucz `.env`, `dist/`, `.git/`, `prisma/*.db` i pliki pomocnicze. Dla
   archiwum zatwierdzonej wersji repozytorium użyj:

   ```powershell
   git archive --format=zip --output=StudyFlow.zip HEAD
   ```

   Polecenie nie dołącza lokalnych, ignorowanych plików ani katalogu `.git`.

Przy wdrożeniu za Nginx/Render ustaw `TRUST_PROXY` na liczbę zaufanych proxy lub
ich adres/range. Pozostaw `loopback` dla lokalnego uruchomienia; nie ustawiaj
bez potrzeby `true` ani zaufania do niezaufanych proxy, bo rate limiting
korzysta z adresu klienta.

Dokumentacja Swagger jest dostępna pod `/api/docs`. Ceny i raporty finansowe
przechowują całe grosze; migracja przelicza istniejące wartości z dwóch miejsc
po przecinku. Testy frontend uruchamiaj przez `npm test`.
