# StudyFlow — System Zarządzania Szkołą Online z Korepetytorami

**StudyFlow** to aplikacja internetowa do organizacji korepetycji i zarządzania szkołą online. Łączy uczniów, korepetytorów i administratorów, umożliwiając rezerwowanie lekcji, śledzenie postępów, ocenianie zajęć oraz generowanie raportów finansowych.

## 🛠️ Stos technologiczny

- **Backend:** NestJS, TypeScript, Prisma ORM, SQLite, JWT, Bcrypt
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios

## 📋 Wymagania wstępne

- **Node.js** w wersji `v18` lub nowszej oraz **npm**
- **Git**

Projekt używa SQLite, czyli bazy przechowywanej w lokalnym pliku. Nie musisz instalować ani uruchamiać PostgreSQL, Dockera ani osobnego serwera bazy danych.

> Baza SQLite zaczyna jako nowa baza. Istniejące dane z PostgreSQL nie są przenoszone automatycznie.

## 🚀 Uruchomienie projektu

### 1. Sklonuj repozytorium

W terminalu wykonaj:

```powershell
git clone https://github.com/marta522/StudyFlow.git
cd StudyFlow
```

### 2. Skonfiguruj i uruchom backend

#### Przygotuj backend

W pierwszym oknie terminala przejdź do katalogu backendu i zainstaluj zależności:

```powershell
cd studyflow-backend
npm install
```

Utwórz w katalogu `studyflow-backend` plik `.env`. Możesz otworzyć Notatnik poleceniem:

```powershell
notepad .env
```

Wklej do pliku poniższą konfigurację. Zastąp przykładowy `JWT_SECRET` własnym sekretnym kluczem:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="wpisz-wlasny-sekretny-klucz"
PORT=3000
```

Plik bazy danych zostanie utworzony w `studyflow-backend/prisma/dev.db`.

#### Utwórz bazę i opcjonalnie dodaj konta testowe

Zastosuj migrację tworzącą tabele:

```powershell
npx prisma migrate deploy
```

Jeśli chcesz zalogować się na konta testowe, opcjonalnie uruchom seed:

```powershell
$env:SEED_DEMO_RESET = "true"
npx prisma db seed
Remove-Item Env:SEED_DEMO_RESET
```

> Seed usuwa dane z lokalnej bazy przed dodaniem danych demonstracyjnych. Uruchamiaj go tylko przy pierwszej konfiguracji albo wtedy, gdy chcesz zresetować bazę.

#### Uruchom backend

W tym samym terminalu uruchom serwer:

```powershell
npm run start:dev
```

Backend będzie dostępny pod adresem `http://localhost:3000`. Pozostaw ten terminal otwarty.

### 3. Zainstaluj i uruchom frontend

Otwórz **drugie okno terminala**. Z katalogu głównego projektu wykonaj:

```powershell
cd studyflow-frontend
npm install
npm run dev
```

Frontend będzie dostępny pod adresem `http://localhost:5173`. Otwórz ten adres w przeglądarce. Pozostaw również drugi terminal otwarty.

Jeśli frontend wymaga wskazania adresu API, utwórz plik `.env` w katalogu `studyflow-frontend`:

```env
VITE_API_URL=http://localhost:3000
```

Po zmianie `.env` uruchom ponownie serwer Vite.

## 🔐 Konta testowe

Konta są dostępne po uruchomieniu opcjonalnego seeda demonstracyjnego:

| Rola | Email | Hasło |
|---|---|---|
| 👑 Administrator | `admin@studyflow.pl` | `haslo123` |
| 🎓 Korepetytor | `tutor@studyflow.pl` | `haslo123` |
| 📚 Uczeń | `student@studyflow.pl` | `haslo123` |

## 🌿 Wprowadzanie zmian

Przed wprowadzaniem zmian utwórz osobny branch zamiast pracować bezpośrednio na głównej gałęzi:

```powershell
git switch -c nazwa-twojego-brancha
```
