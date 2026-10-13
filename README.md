# StudyFlow — System Zarządzania Szkołą Online z Korepetytorami

**StudyFlow** to kompleksowa aplikacja internetowa przeznaczona do organizacji korepetycji i zarządzania szkołą online. Platforma łączy uczniów, korepetytorów oraz administratorów, zapewniając wygodne rezerwowanie lekcji, śledzenie postępów, ocenianie zajęć oraz generowanie raportów finansowych.

## 🛠️ Stos technologiczny

- **Backend**: NestJS, TypeScript, Prisma ORM, PostgreSQL, JWT, Bcrypt
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios

## 📋 Wymagania wstępne

Przed uruchomieniem projektu upewnij się, że masz zainstalowane:

1. **Node.js** w wersji `v18` lub nowszej oraz menedżer pakietów `npm`
2. Bazę danych **PostgreSQL** (lokalnie lub w kontenerze Docker)
3. **Git**

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

3. Utwórz plik `.env` w katalogu `studyflow-backend` i skonfiguruj połączenie z PostgreSQL oraz sekret JWT:

   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/studyflow_db?schema=public"
   JWT_SECRET="super_secret_jwt_key_studyflow"
   PORT=3000
   ```

   W razie potrzeby zastąp nazwę użytkownika, hasło i port bazy PostgreSQL własnymi wartościami.

4. Wykonaj migracje Prisma i zasil bazę danymi testowymi:

   ```bash
   npx prisma migrate dev
   npx prisma db seed
   ```

5. Uruchom backend w trybie deweloperskim:

   ```bash
   npm run start:dev
   ```

   Backend będzie dostępny pod adresem `http://localhost:3000`.

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
   VITE_API_URL=http://localhost:3000
   ```

4. Uruchom aplikację:

   ```bash
   npm run dev
   ```

   Frontend będzie dostępny pod adresem `http://localhost:5173`.

## 🔐 Konta testowe

| Rola | Email | Hasło |
|---|---|---|
| 👑 Administrator | `admin@studyflow.pl` | `haslo123` |
| 🎓 Korepetytor | `tutor@studyflow.pl` | `haslo123` |
| 📚 Uczeń | `student@studyflow.pl` | `haslo123` |

## 🌿 Wprowadzanie zmian

Jeśli chcesz wprowadzać zmiany w projekcie, utwórz osobny branch zamiast pracować bezpośrednio na głównej gałęzi:

```bash
git switch -c nazwa-twojego-brancha
```
