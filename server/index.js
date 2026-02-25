import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { sanitizeDrink } from './sanitize.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
const MAIN_DB = 'barrista_en.db';
const dbPath = join(dataDir, MAIN_DB);

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Migrate old barrista.db to barrista_en.db once
const oldPath = join(dataDir, 'barrista.db');
if (fs.existsSync(oldPath) && !fs.existsSync(dbPath)) {
  fs.renameSync(oldPath, dbPath);
}

/** Main DB = English (barrista_en.db). Other languages = barrista_ru.db, barrista_es.db */
function getDbPathForLang(lang) {
  if (!lang || lang === 'en') return join(dataDir, MAIN_DB);
  return join(dataDir, `barrista_${lang}.db`);
}

/** List available languages from existing DB files (barrista_XX.db) */
function getAvailableLanguages() {
  if (!fs.existsSync(dataDir)) return [];
  const files = fs.readdirSync(dataDir);
  const langs = [];
  files.forEach((f) => {
    const m = f.match(/^barrista_([a-z]{2,})\.db$/);
    if (m) langs.push({ code: m[1] });
  });
  return langs.sort((a, b) => a.code.localeCompare(b.code));
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS drinks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    dish_id TEXT NOT NULL,
    portions_amount INTEGER NOT NULL,
    categories TEXT NOT NULL
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS dishes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    volume TEXT NOT NULL
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL
  )
`);

const app = express();
app.use(cors());
app.use(express.json());

function authMiddleware(req, res, next) {
  if (req.originalUrl === '/api/login' && req.method === 'POST') return next();
  const auth = req.headers.authorization;
  const token = auth && auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized' });
  }
}

app.use('/api', authMiddleware);

app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  if (username && String(username).toLowerCase() === String(ADMIN_USER).toLowerCase() && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ token });
  }
  res.status(401).json({ error: 'Invalid username or password' });
});

app.get('/api/drinks', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM drinks').all();
    const drinks = rows.map((row) =>
      sanitizeDrink({
        id: row.id,
        title: row.title,
        ingredients: JSON.parse(row.ingredients),
        instructions: JSON.parse(row.instructions),
        dishId: row.dish_id,
        portionsAmount: row.portions_amount,
        categories: JSON.parse(row.categories),
      })
    );
    res.json(drinks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drinks', (req, res) => {
  try {
    const d = sanitizeDrink(req.body);
    const stmt = db.prepare(`
      INSERT INTO drinks (id, title, ingredients, instructions, dish_id, portions_amount, categories)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        ingredients = excluded.ingredients,
        instructions = excluded.instructions,
        dish_id = excluded.dish_id,
        portions_amount = excluded.portions_amount,
        categories = excluded.categories
    `);
    stmt.run(
      d.id,
      d.title,
      JSON.stringify(d.ingredients || []),
      JSON.stringify(d.instructions || []),
      d.dishId || '',
      d.portionsAmount ?? 1,
      JSON.stringify(d.categories || [])
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/drinks/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM drinks WHERE id = ?');
    const result = stmt.run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/dishes', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM dishes').all();
    res.json(rows.map((r) => ({ id: r.id, title: r.title, description: r.description, volume: r.volume })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/dishes', (req, res) => {
  try {
    const d = req.body;
    const stmt = db.prepare('INSERT INTO dishes (id, title, description, volume) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, volume = excluded.volume');
    stmt.run(d.id || '', d.title || '', d.description || '', d.volume || '');
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/dishes/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM dishes WHERE id = ?');
    const result = stmt.run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categories').all();
    const drinks = db.prepare('SELECT id, categories FROM drinks').all();
    const countByCat = {};
    rows.forEach((r) => { countByCat[r.id] = 0; });
    drinks.forEach((row) => {
      const cats = JSON.parse(row.categories || '[]');
      cats.forEach((cid) => { if (countByCat[cid] !== undefined) countByCat[cid]++; });
    });
    res.json(rows.map((r) => ({ id: r.id, title: r.title, drinksCount: countByCat[r.id] || 0 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const d = req.body;
    const stmt = db.prepare('INSERT INTO categories (id, title) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET title = excluded.title');
    stmt.run(d.id || '', d.title || '');
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM categories WHERE id = ?');
    const result = stmt.run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/languages', (req, res) => {
  try {
    const list = getAvailableLanguages().filter((l) => fs.existsSync(getDbPathForLang(l.code)));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export-db', (req, res) => {
  const lang = req.query.lang;
  const path = getDbPathForLang(lang);
  if (!fs.existsSync(path)) {
    return res.status(404).send('Database file not found');
  }
  const filename = lang && lang !== 'en' ? `barrista_${lang}.db` : 'barrista_en.db';
  res.download(path, filename, (err) => {
    if (err) console.error(err);
  });
});

app.post('/api/import-json', upload.single('file'), (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  let data;
  try {
    data = JSON.parse(req.file.buffer.toString('utf8'));
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  const drinks = Array.isArray(data.drinks) ? data.drinks : [];
  const dishes = Array.isArray(data.dishes) ? data.dishes : [];
  const categories = Array.isArray(data.categories) ? data.categories : [];
  let lang = (req.body && req.body.lang) ? String(req.body.lang).trim().toLowerCase() : (data.language || 'en');
  if (!/^[a-z]{2,}$/.test(lang)) lang = 'en';
  const targetPath = getDbPathForLang(lang);
  try {
    const importDb = new Database(targetPath);
    importDb.exec(`
      CREATE TABLE IF NOT EXISTS drinks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        ingredients TEXT NOT NULL,
        instructions TEXT NOT NULL,
        dish_id TEXT NOT NULL,
        portions_amount INTEGER NOT NULL,
        categories TEXT NOT NULL
      )
    `);
    importDb.exec(`
      CREATE TABLE IF NOT EXISTS dishes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        volume TEXT NOT NULL
      )
    `);
    importDb.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL
      )
    `);
    importDb.exec('DELETE FROM drinks');
    importDb.exec('DELETE FROM dishes');
    importDb.exec('DELETE FROM categories');
    const insCat = importDb.prepare('INSERT OR REPLACE INTO categories (id, title) VALUES (?, ?)');
    for (const c of categories) {
      const id = String(c.id ?? '').trim() || undefined;
      const title = String(c.title ?? '').trim();
      if (id) insCat.run(id, title);
    }
    const insDish = importDb.prepare('INSERT OR REPLACE INTO dishes (id, title, description, volume) VALUES (?, ?, ?, ?)');
    for (const d of dishes) {
      const id = String(d.id ?? '').trim();
      if (id) insDish.run(id, d.title ?? '', d.description ?? '', d.volume ?? '');
    }
    const insDrink = importDb.prepare(`
      INSERT OR REPLACE INTO drinks (id, title, ingredients, instructions, dish_id, portions_amount, categories)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const d of drinks) {
      const clean = sanitizeDrink(d);
      if (clean.id) {
        insDrink.run(
          clean.id,
          clean.title,
          JSON.stringify(clean.ingredients || []),
          JSON.stringify(clean.instructions || []),
          clean.dishId || '',
          clean.portionsAmount ?? 1,
          JSON.stringify(clean.categories || [])
        );
      }
    }
    importDb.close();
    res.json({ ok: true, lang, imported: { drinks: drinks.length, dishes: dishes.length, categories: categories.length } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/export-json', (req, res) => {
  const lang = req.query.lang;
  const path = getDbPathForLang(lang);
  if (!fs.existsSync(path)) {
    return res.status(404).json({ error: 'Database not found for this language' });
  }
  try {
    const otherDb = new Database(path);
    const drinksRows = otherDb.prepare('SELECT * FROM drinks').all();
    const drinks = drinksRows.map((row) =>
      sanitizeDrink({
        id: row.id,
        title: row.title,
        ingredients: JSON.parse(row.ingredients || '[]'),
        instructions: JSON.parse(row.instructions || '[]'),
        dishId: row.dish_id,
        portionsAmount: row.portions_amount,
        categories: JSON.parse(row.categories || '[]'),
      })
    );
    const dishesRows = otherDb.prepare('SELECT * FROM dishes').all();
    const dishes = dishesRows.map((r) => ({ id: r.id, title: r.title, description: r.description, volume: r.volume }));
    const catRows = otherDb.prepare('SELECT * FROM categories').all();
    const countByCat = {};
    catRows.forEach((r) => { countByCat[r.id] = 0; });
    drinksRows.forEach((row) => {
      const cats = JSON.parse(row.categories || '[]');
      cats.forEach((cid) => { if (countByCat[cid] !== undefined) countByCat[cid]++; });
    });
    const categories = catRows.map((r) => ({ id: r.id, title: r.title, drinksCount: countByCat[r.id] || 0 }));
    otherDb.close();
    res.json({ drinks, dishes, categories, language: lang || 'en', exportedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const distPath = join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
