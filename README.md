# ☕ Barrista Admin

Admin panel for managing coffee and drink recipes, dishes, categories, and brew methods. Supports multiple languages with translation via OpenAI API.

## Features

- **Login** — username and password (JWT, protected routes)
- **Drinks** — full CRUD, ingredients, instructions, categories, dish, photo
- **Dishes** — CRUD, description, volume, photo
- **Categories** — CRUD, photo
- **Brew methods** — CRUD (title, description, main info, how to prepare, pro tips, common mistakes), photo
- **Multi-language** — separate SQLite DB per language (`barrista_en.db`, `barrista_ru.db`, etc.)
- **Translations** — translate from English to other languages via **OpenAI API** (gpt-4o-mini, batched for cost efficiency); configurable language list and “override existing” or merge
- **Dashboard**
  - **JSON** — import JSON (as any configured language), export DB or JSON for selected languages, **check translation integrity** (compare translated DBs with en), **delete translated DB**
  - **Images** — import drink/category/dish/brew method images (by filename convention), download all images as ZIP
  - **Translations** — select entities (brew methods, drinks, categories, dishes), target language, override or merge, **Start translation** with progress
- **Translation languages** — separate tab to configure which languages appear in the translation selector (code + English label)
- **SQLite** — all data in `server/data/`; easy backup and deploy with a volume

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment. Copy the example and edit:
```bash
cp server/.env.example .env
```
Or create `.env` in the project root. Set:
- `ADMIN_USER` — login (case-insensitive)
- `ADMIN_PASSWORD` — password
- `JWT_SECRET` — secret for JWT (use a long random string in production)
- `OPENAI_API_KEY` — **required for translations** (Dashboard → Start translation). Get a key at [OpenAI API](https://platform.openai.com/api-keys).

Optional: `JWT_EXPIRES_IN` (default `7d`).

3. Start the app (API and frontend together):
```bash
npm run dev
```

4. Open in the browser:
   - Frontend: **http://localhost:5173**
   - API: **http://localhost:3001**

Log in with credentials from `.env`.

## Data structure

### Drink
- `id`, `title`, `ingredients` (array of `{ name, amount?, unit? }`), `instructions` (array of strings), `dishId`, `portionsAmount`, `categories` (array of category ids).

### Dish
- `id`, `title`, `description`, `volume`.

### Category
- `id`, `title`. A drink’s `categories` is an array of category ids.

### Brew method
- `id`, `title`, `description`, `info` (`coffee`, `water`, `temperature`, `time`), `howToPrepare`, `proTips`, `commonMistakes` (arrays of strings).

## Usage

### Dashboard

- **JSON**
  - **Import as** — choose language (Main en or any from Translation languages), then **Import JSON** to create/overwrite `barrista_<lang>.db`.
  - **Languages (for export)** — checkboxes for existing DBs; **Export selected databases** (download `.db` files) or **Export JSON for selected languages**.
  - **Check translation integrity** — compares each translated DB with `barrista_en.db`; report shows “All good” or missing entities per DB; log is shown and downloaded as `.txt`.
  - **Delete translated DB** — select a non‑en language and delete its DB file (en cannot be deleted).

- **Images**
  - Import by filename: `drink_<id>.jpg`, `category_<id>.png`, `dish_<id>.png`, `brew_<id>.png`. **Download all images** saves a ZIP of `server/data/images/`.

- **Translations**
  - Check which to translate: Brew methods, Drinks, Categories, Dishes.
  - Choose **Language** (from Translation languages tab).
  - **Override existing** — if checked, target tables are cleared and refilled; if unchecked, only missing entities are added.
  - **Start translation** — runs OpenAI translation from `barrista_en.db` into the selected language; progress is shown next to the button. Requires `OPENAI_API_KEY` in `.env`.

### Translation languages (tab)

- Add/edit/remove languages (code + English label). This list is used in the Dashboard translation selector and in the JSON “Import as” dropdown. Save to `server/data/translation-languages.json`.

### Export

- Dashboard: download DB or JSON for selected languages.
- Drinks / Dishes / Categories / Brew methods: each section has its own management and data; export is via Dashboard JSON per language.

## Build and run (single port)

```bash
npm run build
npm run start
```

Open **http://localhost:3001** — admin UI and API from one port. Data in `server/data/` (SQLite files and images).

## Deploy (e.g. Railway)

1. Push to GitHub and create a project on [Railway](https://railway.app); deploy from the repo (Dockerfile builds frontend and runs the Node server).
2. **Variables**: set `ADMIN_USER`, `ADMIN_PASSWORD`, `JWT_SECRET`, and **`OPENAI_API_KEY`** (for translations).
3. **Persistent volume** — mount a volume at **`/app/server/data`** so DBs and images survive redeploys.
4. Generate a domain in Settings → Networking.

The app uses `PORT` from the platform. With the volume mounted, `barrista_*.db` and images persist.

## Scripts

- `npm run dev` — API + Vite dev server
- `npm run build` — TypeScript + Vite build
- `npm run start` — run production server
- `npm run sanitize-db` — sanitize main DB (see script)
- `npm run import-dishes` / `import-categories` — import from JSON in repo
- `npm run translate-db-es` — CLI script to build `barrista_es.db` from en (uses same OpenAI translator if `OPENAI_API_KEY` is set)

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Lucide React, React Router
- **Backend:** Node.js, Express, SQLite (better-sqlite3), JWT, dotenv, **OpenAI** (translations), multer, archiver
