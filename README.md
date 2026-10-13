# StudyFlow — System Zarządzania Szkołą Online z Korepetytorami

**StudyFlow** to kompleksowa aplikacja internetowa przeznaczona do organizacji korepetycji i zarządzania szkołą online. Platforma łączy uczniów, korepetytorów oraz administratorów, zapewniając wygodne rezerwowanie lekcji, śledzenie postępów, ocenianie zajęć oraz generowanie raportów finansowych.

## 🛠️ Stos technologiczny

- **Backend**: NestJS, TypeScript, Prisma ORM, SQLite, JWT, Bcrypt
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide Icons, Axios

## 📋 Wymagania wstępne

Przed uruchomieniem projektu upewnij się, że masz zainstalowane:

1. **Node.js** w wersji `v18` lub nowszej oraz menedżer pakietów `npm`
2. **Git**

SQLite jest bazą plikową — nie wymaga instalowania ani uruchamiania PostgreSQL, Dockera ani osobnego serwera bazy danych. Zmiana z PostgreSQL nie przenosi automatycznie istniejących danych; lokalna baza SQLite zaczyna jako nowa baza.

## 🚀 Uruchomienie projektu

### 1. Sklonuj repozytorium

```bash
git clone https://github.com/marta522/StudyFlow.git
cd StudyFlow
