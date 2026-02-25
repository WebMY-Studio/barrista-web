# ☕ Barrista Admin

Admin panel for managing coffee and drink recipes.

## Features

- ✅ **Login with username and password** (JWT, protected routes)
- ✅ Full drink management (CRUD)
- ✅ Convenient form for adding/editing drinks
- ✅ Management of ingredients, instructions, and categories
- ✅ Translate drinks via API into multiple languages
- ✅ Export data to JSON
- ✅ **SQLite** database (files in `server/data/`: `barrista_en.db`, etc.) — easy to export and back up
- ✅ “Download SQLite database” button — download the DB file from the admin UI
- ✅ Modern, responsive design

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables. Copy the example and edit:
```bash
cp server/.env.example .env
```
In `.env` set:
- `ADMIN_USER` — login (case-insensitive)
- `ADMIN_PASSWORD` — password
- `JWT_SECRET` — secret for JWT signing (use a long random string in production)

Optional: `JWT_EXPIRES_IN` (default `7d`).

3. Start the app (API and frontend run together):
```bash
npm run dev
```

4. Open in the browser:
   - Frontend: **http://localhost:5173**
   - API: **http://localhost:3001**

On first visit you will need to log in (credentials from `.env`).

## Data structure

### Drink
```typescript
{
  id: string;
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  dishId: string;
  portionsAmount: number;
  categories: string[];
}
```

### Ingredient
```typescript
{
  title: string;
  volume: string;
}
```

### Category
```typescript
{
  id: string;
  title: string;
}
```
Stored in the `categories` table. A drink’s `categories` field is an array of category ids.

### Dish
```typescript
{
  id: string;
  title: string;
  description: string;
  volume: string;
}
```
Stored in the `dishes` table. A drink’s `dishId` is the id of one dish.

## Usage

### Login
Use the login and password from `.env`. Username is case-insensitive (e.g. `Webmy` and `webmy` are the same).

### Adding a drink
1. Click “Add drink”
2. Fill in all form fields
3. Add ingredients, instructions, and categories
4. Click “Save”

### Translations and multi-language

Languages are tied to separate DB files in `server/data/`:
- Main DB (English): `barrista_en.db`
- Other languages: `barrista_ru.db`, `barrista_es.db`, etc. (language code in the filename).

On the Dashboard, the language list is built from these files. You can:
- **Download main SQLite database (EN)** — download the main DB
- Select one or more languages and click **Export selected databases** — download `barrista_XX.db` for each selected language
- **Export JSONs for selected languages** — download JSON export for each selected language (drinks, dishes, categories).

To add a new language (e.g. `ru`), create and fill `server/data/barrista_ru.db` with the same tables (`drinks`, `dishes`, `categories`). Options:
- Import from your own JSON/scripts
- Use the translation API: call `translateDrink` from `src/services/translation.ts`, which translates drink title, instructions, and ingredient names via an external API; then write the translated data into the new DB (script or separate tool).

Translation API setup is in `src/services/translation.ts`: set `TRANSLATION_API_URL` and adjust `translateText` to match your API. Expected POST body: `{ "text": "Text", "targetLang": "en" }`, response: `{ "translatedText": "Translated text" }`. For testing without a real API you can use `mockTranslateDrink`.

### Export
- On the Dashboard: download the main DB (EN), selected language DBs, or JSON per selected language.
- In the drinks section: export the drink list to JSON.
- Categories and dishes: each section has its own JSON export.

## Build and single-entry run

```bash
npm run build
npm run start
```

Open **http://localhost:3001** — both the admin UI and API are served from one port. SQLite DB: `server/data/barrista_en.db` (and other `barrista_XX.db` files per language).

## Deploy on Railway

1. Push the repo to GitHub and open [Railway](https://railway.app).
2. **New Project** → **Deploy from GitHub repo** → choose this repo.
3. Railway will detect the **Dockerfile** and build the image (frontend is built inside the image, then the Node server serves it and the API).
4. In the service **Variables** tab, set:
   - `ADMIN_USER` — login
   - `ADMIN_PASSWORD` — password
   - `JWT_SECRET` — long random string for JWT
   - Optionally: `JWT_EXPIRES_IN` (default `7d`).
5. In **Settings** → **Networking** → **Generate Domain** to get a public URL.
6. Open the generated URL — you get the admin UI and API on the same origin (no `VITE_API_URL` needed).

The app uses `PORT` set by Railway. SQLite files live in `server/data`; if Railway provides a persistent disk for the service, data will survive restarts.

## Tech stack

- React 18, TypeScript, Vite, Lucide React, React Router
- Backend: Node.js, Express, **SQLite** (better-sqlite3), JWT, dotenv
