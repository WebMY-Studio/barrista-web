import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import archiver from 'archiver';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { sanitizeDrink } from './sanitize.js';
import { translateText, translateArray, translateInfo, TRANSLATION_MODEL_OPTIONS } from './translator.js';

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

const imagesDir = join(dataDir, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
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

const TRANSLATION_LANGUAGES_PATH = join(dataDir, 'translation-languages.json');

let translationProgress = null;
/** Set by POST /api/translation-stop: { saveResults: boolean }. Checked by translate handler. */
let translationStopRequested = null;

function TranslationStopError(saveResults) {
  this.saveResults = saveResults;
  this.name = 'TranslationStopError';
}

const DEFAULT_TRANSLATION_LANGUAGES = [
  { code: 'ru', label: 'Russian' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'it', label: 'Italian' },
  { code: 'pl', label: 'Polish' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'es', label: 'Spanish' },
  { code: 'tr', label: 'Turkish' },
];

function getTranslationLanguages() {
  if (!fs.existsSync(TRANSLATION_LANGUAGES_PATH)) return DEFAULT_TRANSLATION_LANGUAGES;
  try {
    const raw = fs.readFileSync(TRANSLATION_LANGUAGES_PATH, 'utf8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : DEFAULT_TRANSLATION_LANGUAGES;
  } catch {
    return DEFAULT_TRANSLATION_LANGUAGES;
  }
}

function saveTranslationLanguages(list) {
  const arr = Array.isArray(list) ? list : [];
  fs.writeFileSync(TRANSLATION_LANGUAGES_PATH, JSON.stringify(arr, null, 2), 'utf8');
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
db.exec(`
  CREATE TABLE IF NOT EXISTS brew_methods (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    info TEXT NOT NULL,
    how_to_prepare TEXT NOT NULL,
    pro_tips TEXT NOT NULL,
    common_mistakes TEXT NOT NULL
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

// Serve drink images (no auth; img src from same origin)
app.use('/uploads', express.static(imagesDir));

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

app.post('/api/drinks/:id/photo', upload.single('photo'), (req, res) => {
  const rawId = req.params.id || '';
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) {
    return res.status(400).json({ error: 'Invalid drink id' });
  }
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'No photo uploaded' });
  }
  const filename = `drink_${id}.jpg`;
  const filepath = join(imagesDir, filename);
  try {
    fs.writeFileSync(filepath, req.file.buffer);
    res.json({ ok: true, filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const drinkImageNameRe = /^drink_([a-zA-Z0-9_.-]+)\.(jpg|jpeg|png)$/i;
app.post('/api/import-drink-images', upload.array('images', 100), (req, res) => {
  const files = req.files || [];
  let saved = 0;
  for (const f of files) {
    const m = f.originalname && f.originalname.match(drinkImageNameRe);
    if (!m) continue;
    const filename = `drink_${m[1]}.jpg`;
    const filepath = join(imagesDir, filename);
    try {
      fs.writeFileSync(filepath, f.buffer);
      saved++;
    } catch (err) {
      console.error('Save image:', filename, err.message);
    }
  }
  res.json({ ok: true, saved, total: files.length });
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

app.post('/api/dishes/:id/photo', upload.single('photo'), (req, res) => {
  const rawId = req.params.id || '';
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return res.status(400).json({ error: 'Invalid dish id' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No photo uploaded' });
  const filename = `dish_${id}.png`;
  try {
    fs.writeFileSync(join(imagesDir, filename), req.file.buffer);
    res.json({ ok: true, filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const dishImageNameRe = /^dish_([a-zA-Z0-9_.-]+)\.(jpg|jpeg|png)$/i;
app.post('/api/import-dish-images', upload.array('images', 100), (req, res) => {
  const files = req.files || [];
  let saved = 0;
  for (const f of files) {
    const m = f.originalname && f.originalname.match(dishImageNameRe);
    if (!m) continue;
    const filename = `dish_${m[1]}.png`;
    try {
      fs.writeFileSync(join(imagesDir, filename), f.buffer);
      saved++;
    } catch (err) {
      console.error('Save image:', filename, err.message);
    }
  }
  res.json({ ok: true, saved, total: files.length });
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

app.post('/api/categories/:id/photo', upload.single('photo'), (req, res) => {
  const rawId = req.params.id || '';
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return res.status(400).json({ error: 'Invalid category id' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No photo uploaded' });
  const filename = `category_${id}.png`;
  try {
    fs.writeFileSync(join(imagesDir, filename), req.file.buffer);
    res.json({ ok: true, filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/brew-methods', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM brew_methods').all();
    res.json(rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      info: JSON.parse(r.info || '{}'),
      howToPrepare: JSON.parse(r.how_to_prepare || '[]'),
      proTips: JSON.parse(r.pro_tips || '[]'),
      commonMistakes: JSON.parse(r.common_mistakes || '[]'),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/brew-methods', (req, res) => {
  try {
    const d = req.body;
    const info = d.info && typeof d.info === 'object' ? d.info : {};
    const stmt = db.prepare(`
      INSERT INTO brew_methods (id, title, description, info, how_to_prepare, pro_tips, common_mistakes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        info = excluded.info,
        how_to_prepare = excluded.how_to_prepare,
        pro_tips = excluded.pro_tips,
        common_mistakes = excluded.common_mistakes
    `);
    stmt.run(
      d.id || '',
      d.title || '',
      d.description || '',
      JSON.stringify({ coffee: info.coffee ?? '', water: info.water ?? '', temperature: info.temperature ?? '', time: info.time ?? '' }),
      JSON.stringify(Array.isArray(d.howToPrepare) ? d.howToPrepare : []),
      JSON.stringify(Array.isArray(d.proTips) ? d.proTips : []),
      JSON.stringify(Array.isArray(d.commonMistakes) ? d.commonMistakes : [])
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/brew-methods/:id', (req, res) => {
  try {
    const stmt = db.prepare('DELETE FROM brew_methods WHERE id = ?');
    const result = stmt.run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/brew-methods/:id/photo', upload.single('photo'), (req, res) => {
  const rawId = req.params.id || '';
  const id = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!id) return res.status(400).json({ error: 'Invalid brew method id' });
  if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'No photo uploaded' });
  const filename = `brew_${id}.png`;
  try {
    fs.writeFileSync(join(imagesDir, filename), req.file.buffer);
    res.json({ ok: true, filename });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const brewMethodImageNameRe = /^brew_([a-zA-Z0-9_.-]+)\.(jpg|jpeg|png)$/i;
app.post('/api/import-brew-method-images', upload.array('images', 100), (req, res) => {
  const files = req.files || [];
  let saved = 0;
  for (const f of files) {
    const m = f.originalname && f.originalname.match(brewMethodImageNameRe);
    if (!m) continue;
    const filename = `brew_${m[1]}.png`;
    try {
      fs.writeFileSync(join(imagesDir, filename), f.buffer);
      saved++;
    } catch (err) {
      console.error('Save image:', filename, err.message);
    }
  }
  res.json({ ok: true, saved, total: files.length });
});

const categoryImageNameRe = /^category_([a-zA-Z0-9_.-]+)\.(jpg|jpeg|png)$/i;
app.post('/api/import-category-images', upload.array('images', 100), (req, res) => {
  const files = req.files || [];
  let saved = 0;
  for (const f of files) {
    const m = f.originalname && f.originalname.match(categoryImageNameRe);
    if (!m) continue;
    const filename = `category_${m[1]}.png`;
    try {
      fs.writeFileSync(join(imagesDir, filename), f.buffer);
      saved++;
    } catch (err) {
      console.error('Save image:', filename, err.message);
    }
  }
  res.json({ ok: true, saved, total: files.length });
});

app.get('/api/download-all-images', (req, res) => {
  const files = fs.readdirSync(imagesDir).filter((f) => {
    const p = join(imagesDir, f);
    return fs.statSync(p).isFile();
  });
  if (files.length === 0) {
    return res.status(404).json({ error: 'No images to download' });
  }
  res.attachment('barrista-images.zip');
  res.setHeader('Content-Type', 'application/zip');
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', (err) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  });
  archive.pipe(res);
  for (const name of files) {
    archive.file(join(imagesDir, name), { name });
  }
  archive.finalize();
});


function ensureTables(db) {
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
  db.exec(`
    CREATE TABLE IF NOT EXISTS brew_methods (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      info TEXT NOT NULL,
      how_to_prepare TEXT NOT NULL,
      pro_tips TEXT NOT NULL,
      common_mistakes TEXT NOT NULL
    )
  `);
}

app.get('/api/translation-progress', (req, res) => {
  try {
    res.json(translationProgress);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/translation-stop', (req, res) => {
  try {
    const saveResults = Boolean(req.body && req.body.saveResults);
    if (translationProgress && !translationProgress.done) {
      translationStopRequested = { saveResults };
      res.json({ ok: true });
    } else {
      res.json({ ok: false, error: 'No translation in progress' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/translate', async (req, res) => {
  const { lang, brewMethods, drinks, categories, dishes, overrideExisting } = req.body || {};
  const targetLang = typeof lang === 'string' ? lang.trim().toLowerCase() : '';
  const allowedCodes = getTranslationLanguages().map((x) => x.code);
  if (!targetLang || !allowedCodes.includes(targetLang)) {
    return res.status(400).json({ error: 'Invalid or missing lang. Configure languages in Translation languages.' });
  }
  const doBrew = !!brewMethods;
  const doDrinks = !!drinks;
  const doCategories = !!categories;
  const doDishes = !!dishes;
  if (!doBrew && !doDrinks && !doCategories && !doDishes) {
    return res.status(400).json({ error: 'Select at least one: brewMethods, drinks, categories, dishes' });
  }
  const sourcePath = getDbPathForLang('en');
  if (!fs.existsSync(sourcePath)) {
    return res.status(400).json({ error: 'Source database (en) not found' });
  }
  const RATES_SEC_PER_ITEM = { categories: 0.76, dishes: 3.3, drinks: 2.4, brew_methods: 10.7 };
  const BLOCK_LABELS = { categories: 'Categories', dishes: 'Dishes', drinks: 'Drinks', brew_methods: 'Brew methods' };

  translationProgress = { step: 'starting', current: 0, total: 0, logLines: [], etaSeconds: null, lastId: null, lastItemMs: null };
  let sourceDb;
  let targetDb;
  try {
    sourceDb = new Database(sourcePath);
    const targetPath = getDbPathForLang(targetLang);
    targetDb = new Database(targetPath);
    ensureTables(targetDb);

    const maybeStop = () => {
      if (translationStopRequested) {
        const save = translationStopRequested.saveResults;
        translationStopRequested = null;
        throw new TranslationStopError(save);
      }
    };

    const counts = { categories: 0, dishes: 0, drinks: 0, brewMethods: 0 };
    const blockResults = {};

    const setProgress = (step, current, total, extra = {}) => {
      const skipped = extra.skipped !== undefined ? extra.skipped : (translationProgress.skipped ?? 0);
      const toProcess = Math.max(0, total - skipped);
      const remaining = Math.max(0, toProcess - current);
      const etaSeconds = toProcess > 0 && RATES_SEC_PER_ITEM[step] != null ? Math.round(remaining * RATES_SEC_PER_ITEM[step]) : null;
      translationProgress = {
        ...translationProgress,
        step,
        current,
        total,
        skipped,
        etaSeconds,
        lastId: extra.lastId !== undefined ? extra.lastId : translationProgress.lastId,
        lastItemMs: extra.lastItemMs !== undefined ? extra.lastItemMs : translationProgress.lastItemMs,
        counts: { ...counts },
      };
    };

    const pushBlockLog = (name, stats) => {
      const label = BLOCK_LABELS[name] || name;
      const durationStr = stats.durationMs >= 1000 ? `${(stats.durationMs / 1000).toFixed(1)}s` : `${stats.durationMs}ms`;
      translationProgress.logLines = translationProgress.logLines || [];
      translationProgress.logLines.push(
        `${label}: Translated: ${stats.translated}. Error: ${stats.error}. Skipped: ${stats.skipped}. (${durationStr})`
      );
    };

    const runBlock = async (name, fn) => {
      const stats = { translated: 0, skipped: 0, error: 0, durationMs: 0 };
      const t0 = Date.now();
      try {
        await fn(stats);
      } finally {
        stats.durationMs = Date.now() - t0;
        blockResults[name] = stats;
        pushBlockLog(name, stats);
      }
    };

    if (doCategories) {
      targetDb.exec('BEGIN');
      maybeStop();
      const rows = sourceDb.prepare('SELECT * FROM categories').all();
      if (overrideExisting) targetDb.exec('DELETE FROM categories');
      const existingIds = overrideExisting ? new Set() : new Set((targetDb.prepare('SELECT id FROM categories').all()).map((r) => r.id));
      const insCat = targetDb.prepare('INSERT OR REPLACE INTO categories (id, title) VALUES (?, ?)');
      setProgress('categories', 0, rows.length, { skipped: 0 });
      await runBlock('categories', async (stats) => {
        for (const r of rows) {
          maybeStop();
          if (!overrideExisting && existingIds.has(r.id)) {
            stats.skipped++;
            setProgress('categories', counts.categories, rows.length, { skipped: stats.skipped });
            continue;
          }
          const t0 = Date.now();
          try {
            const title = await translateText(r.title, targetLang);
            insCat.run(r.id, title);
            stats.translated++;
            counts.categories++;
            setProgress('categories', counts.categories, rows.length, { lastId: r.id, lastItemMs: Date.now() - t0, skipped: stats.skipped });
          } catch (e) {
            stats.error++;
            console.error('Category translate error:', r.id, e.message);
            setProgress('categories', counts.categories, rows.length, { lastId: r.id, lastItemMs: Date.now() - t0, skipped: stats.skipped });
          }
        }
      });
      targetDb.exec('COMMIT');
      maybeStop();
    }

    if (doDishes) {
      targetDb.exec('BEGIN');
      maybeStop();
      const rows = sourceDb.prepare('SELECT * FROM dishes').all();
      if (overrideExisting) targetDb.exec('DELETE FROM dishes');
      const existingIds = overrideExisting ? new Set() : new Set((targetDb.prepare('SELECT id FROM dishes').all()).map((r) => r.id));
      const insDish = targetDb.prepare('INSERT OR REPLACE INTO dishes (id, title, description, volume) VALUES (?, ?, ?, ?)');
      setProgress('dishes', 0, rows.length, { skipped: 0 });
      await runBlock('dishes', async (stats) => {
        for (const r of rows) {
          maybeStop();
          if (!overrideExisting && existingIds.has(r.id)) {
            stats.skipped++;
            setProgress('dishes', counts.dishes, rows.length, { skipped: stats.skipped });
            continue;
          }
          const t0 = Date.now();
          try {
            const title = await translateText(r.title, targetLang);
            const description = await translateText(r.description || '', targetLang);
            const volume = await translateText(r.volume || '', targetLang);
            insDish.run(r.id, title, description, volume);
            stats.translated++;
            counts.dishes++;
            setProgress('dishes', counts.dishes, rows.length, { lastId: r.id, lastItemMs: Date.now() - t0, skipped: stats.skipped });
          } catch (e) {
            stats.error++;
            console.error('Dish translate error:', r.id, e.message);
            setProgress('dishes', counts.dishes, rows.length, { lastId: r.id, lastItemMs: Date.now() - t0, skipped: stats.skipped });
          }
        }
      });
      targetDb.exec('COMMIT');
      maybeStop();
    }

    if (doDrinks) {
      targetDb.exec('BEGIN');
      maybeStop();
      const rows = sourceDb.prepare('SELECT * FROM drinks').all();
      if (overrideExisting) targetDb.exec('DELETE FROM drinks');
      const existingIds = overrideExisting ? new Set() : new Set((targetDb.prepare('SELECT id FROM drinks').all()).map((r) => r.id));
      const insDrink = targetDb.prepare(`
        INSERT OR REPLACE INTO drinks (id, title, ingredients, instructions, dish_id, portions_amount, categories)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      setProgress('drinks', 0, rows.length, { skipped: 0 });
      await runBlock('drinks', async (stats) => {
        for (const r of rows) {
          maybeStop();
          if (!overrideExisting && existingIds.has(r.id)) {
            stats.skipped++;
            setProgress('drinks', counts.drinks, rows.length, { skipped: stats.skipped });
            continue;
          }
          const t0 = Date.now();
          try {
            const title = await translateText(r.title, targetLang);
            const ingredients = JSON.parse(r.ingredients || '[]');
            const ingredientsT = await translateArray(ingredients, targetLang);
            const instructions = JSON.parse(r.instructions || '[]');
            const instructionsT = await translateArray(instructions, targetLang);
            insDrink.run(r.id, title, JSON.stringify(ingredientsT), JSON.stringify(instructionsT), r.dish_id, r.portions_amount, r.categories);
            stats.translated++;
            counts.drinks++;
            setProgress('drinks', counts.drinks, rows.length, { lastId: r.id, lastItemMs: Date.now() - t0, skipped: stats.skipped });
          } catch (e) {
            stats.error++;
            console.error('Drink translate error:', r.id, e.message);
            setProgress('drinks', counts.drinks, rows.length, { lastId: r.id, lastItemMs: Date.now() - t0, skipped: stats.skipped });
          }
        }
      });
      targetDb.exec('COMMIT');
      maybeStop();
    }

    if (doBrew) {
      targetDb.exec('BEGIN');
      maybeStop();
      const rows = sourceDb.prepare('SELECT * FROM brew_methods').all();
      if (overrideExisting) targetDb.exec('DELETE FROM brew_methods');
      const existingIds = overrideExisting ? new Set() : new Set((targetDb.prepare('SELECT id FROM brew_methods').all()).map((r) => r.id));
      const insBrew = targetDb.prepare(`
        INSERT OR REPLACE INTO brew_methods (id, title, description, info, how_to_prepare, pro_tips, common_mistakes)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      setProgress('brew_methods', 0, rows.length, { skipped: 0 });
      await runBlock('brew_methods', async (stats) => {
        for (const r of rows) {
          maybeStop();
          if (!overrideExisting && existingIds.has(r.id)) {
            stats.skipped++;
            setProgress('brew_methods', counts.brewMethods, rows.length, { skipped: stats.skipped });
            continue;
          }
          const t0 = Date.now();
          try {
            const title = await translateText(r.title, targetLang);
            const description = await translateText(r.description || '', targetLang);
            const info = JSON.parse(r.info || '{}');
            const infoT = await translateInfo(info, targetLang);
            const howToPrepare = JSON.parse(r.how_to_prepare || '[]');
            const howT = await translateArray(howToPrepare, targetLang);
            const proTips = JSON.parse(r.pro_tips || '[]');
            const proT = await translateArray(proTips, targetLang);
            const commonMistakes = JSON.parse(r.common_mistakes || '[]');
            const commonT = await translateArray(commonMistakes, targetLang);
            insBrew.run(r.id, title, description, JSON.stringify(infoT), JSON.stringify(howT), JSON.stringify(proT), JSON.stringify(commonT));
            stats.translated++;
            counts.brewMethods++;
            setProgress('brew_methods', counts.brewMethods, rows.length, { lastId: r.id, lastItemMs: Date.now() - t0, skipped: stats.skipped });
          } catch (e) {
            stats.error++;
            console.error('Brew method translate error:', r.id, e.message);
            setProgress('brew_methods', counts.brewMethods, rows.length, { lastId: r.id, lastItemMs: Date.now() - t0, skipped: stats.skipped });
          }
        }
      });
      targetDb.exec('COMMIT');
    }

    const finalLogLines = translationProgress.logLines || [];
    translationProgress = { ...translationProgress, done: true, counts };
    sourceDb.close();
    targetDb.close();
    res.json({ ok: true, lang: targetLang, counts, blockResults, logLines: finalLogLines });
  } catch (err) {
    if (err instanceof TranslationStopError) {
      if (targetDb) {
        try {
          targetDb.exec(err.saveResults ? 'COMMIT' : 'ROLLBACK');
        } catch (_) {}
        targetDb.close();
      }
      if (sourceDb) sourceDb.close();
      translationProgress = { ...translationProgress, done: true, cancelled: true, saved: err.saveResults, counts: translationProgress?.counts };
      return res.json({ cancelled: true, saved: err.saveResults, counts: translationProgress?.counts });
    }
    console.error(err);
    translationProgress = null;
    if (targetDb) {
      try {
        targetDb.exec('ROLLBACK');
      } catch (_) {}
      targetDb.close();
    }
    if (sourceDb) sourceDb.close();
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

function getIdsFromTable(db, table) {
  try {
    const rows = db.prepare(`SELECT id FROM ${table}`).all();
    return new Set(rows.map((r) => r.id));
  } catch {
    return new Set();
  }
}

app.get('/api/check-translation-integrity', (req, res) => {
  try {
    const enPath = getDbPathForLang('en');
    if (!fs.existsSync(enPath)) {
      return res.json({ log: 'Main database (en) not found. Nothing to compare.' });
    }
    const enDb = new Database(enPath);
    ensureTables(enDb);
    const enCategories = getIdsFromTable(enDb, 'categories');
    const enDishes = getIdsFromTable(enDb, 'dishes');
    const enDrinks = getIdsFromTable(enDb, 'drinks');
    const enBrewMethods = getIdsFromTable(enDb, 'brew_methods');
    enDb.close();

    const allLangs = getAvailableLanguages().filter((l) => fs.existsSync(getDbPathForLang(l.code)));
    const translatedLangs = allLangs.filter((l) => l.code !== 'en').sort((a, b) => a.code.localeCompare(b.code));
    if (translatedLangs.length === 0) {
      return res.json({ log: 'No translated databases found (only en or no DBs).' });
    }

    const lines = [];
    let allGood = true;
    for (const { code } of translatedLangs) {
      const path = getDbPathForLang(code);
      const db = new Database(path);
      ensureTables(db);
      const cat = getIdsFromTable(db, 'categories');
      const dish = getIdsFromTable(db, 'dishes');
      const drink = getIdsFromTable(db, 'drinks');
      const brew = getIdsFromTable(db, 'brew_methods');
      db.close();

      const missingCat = [...enCategories].filter((id) => !cat.has(id));
      const missingDish = [...enDishes].filter((id) => !dish.has(id));
      const missingDrink = [...enDrinks].filter((id) => !drink.has(id));
      const missingBrew = [...enBrewMethods].filter((id) => !brew.has(id));
      if (missingCat.length || missingDish.length || missingDrink.length || missingBrew.length) {
        allGood = false;
        lines.push(`barrista_${code}.db:`);
        if (missingCat.length) lines.push(`  missing categories: ${missingCat.join(', ')}`);
        if (missingDish.length) lines.push(`  missing dishes: ${missingDish.join(', ')}`);
        if (missingDrink.length) lines.push(`  missing drinks: ${missingDrink.join(', ')}`);
        if (missingBrew.length) lines.push(`  missing brew_methods: ${missingBrew.join(', ')}`);
        lines.push('');
      }
    }
    const log = allGood ? 'All good' : lines.join('\n').trim();
    res.json({ log });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/translation-languages', (req, res) => {
  try {
    res.json(getTranslationLanguages());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/translation-languages', (req, res) => {
  const list = req.body;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: 'Body must be an array of { code, label }' });
  }
  const valid = list.every((x) => x && typeof x.code === 'string' && typeof x.label === 'string');
  if (!valid) {
    return res.status(400).json({ error: 'Each item must have code and label (strings)' });
  }
  try {
    const normalized = list.map((x) => ({ code: String(x.code).trim().toLowerCase(), label: String(x.label).trim() })).filter((x) => x.code);
    saveTranslationLanguages(normalized);
    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const TRANSLATION_PROMPT_EXTRA_PATH = join(dataDir, 'translation-prompt-extra.txt');
const TRANSLATION_MODEL_PATH = join(dataDir, 'translation-model.txt');

function getTranslationPromptExtra() {
  try {
    if (fs.existsSync(TRANSLATION_PROMPT_EXTRA_PATH)) {
      return fs.readFileSync(TRANSLATION_PROMPT_EXTRA_PATH, 'utf8').trim();
    }
  } catch (_) {}
  return '';
}

app.get('/api/translation-prompt-extra', (req, res) => {
  try {
    res.json({ extra: getTranslationPromptExtra() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/translation-prompt-extra', (req, res) => {
  const extra = req.body && typeof req.body.extra === 'string' ? req.body.extra : '';
  try {
    fs.writeFileSync(TRANSLATION_PROMPT_EXTRA_PATH, extra.trim(), 'utf8');
    res.json({ extra: getTranslationPromptExtra() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

function getTranslationModel() {
  try {
    if (fs.existsSync(TRANSLATION_MODEL_PATH)) {
      const id = fs.readFileSync(TRANSLATION_MODEL_PATH, 'utf8').trim();
      if (TRANSLATION_MODEL_OPTIONS.some((m) => m.id === id)) return id;
    }
  } catch (_) {}
  return 'gpt-4o-mini';
}

app.get('/api/translation-model', (req, res) => {
  try {
    res.json({ model: getTranslationModel(), options: TRANSLATION_MODEL_OPTIONS });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/translation-model', (req, res) => {
  const model = req.body && typeof req.body.model === 'string' ? req.body.model.trim() : '';
  if (!TRANSLATION_MODEL_OPTIONS.some((m) => m.id === model)) {
    return res.status(400).json({ error: 'Invalid model id' });
  }
  try {
    fs.writeFileSync(TRANSLATION_MODEL_PATH, model, 'utf8');
    res.json({ model: getTranslationModel() });
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

app.delete('/api/databases/:lang', (req, res) => {
  const lang = (req.params.lang || '').trim().toLowerCase();
  if (!lang || lang === 'en') {
    return res.status(400).json({ error: 'Cannot delete main database (en)' });
  }
  const path = getDbPathForLang(lang);
  if (!fs.existsSync(path)) {
    return res.status(404).json({ error: 'Database not found' });
  }
  try {
    fs.unlinkSync(path);
    res.json({ ok: true, lang });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
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
  const brewMethods = Array.isArray(data.brewMethods) ? data.brewMethods : [];
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
    importDb.exec(`
      CREATE TABLE IF NOT EXISTS brew_methods (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        info TEXT NOT NULL,
        how_to_prepare TEXT NOT NULL,
        pro_tips TEXT NOT NULL,
        common_mistakes TEXT NOT NULL
      )
    `);
    importDb.exec('DELETE FROM drinks');
    importDb.exec('DELETE FROM dishes');
    importDb.exec('DELETE FROM categories');
    importDb.exec('DELETE FROM brew_methods');
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
    const insBrew = importDb.prepare(`
      INSERT OR REPLACE INTO brew_methods (id, title, description, info, how_to_prepare, pro_tips, common_mistakes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const b of brewMethods) {
      const id = String(b.id ?? '').trim();
      if (!id) continue;
      const info = b.info && typeof b.info === 'object' ? b.info : {};
      insBrew.run(
        id,
        b.title ?? '',
        b.description ?? '',
        JSON.stringify({ coffee: info.coffee ?? '', water: info.water ?? '', temperature: info.temperature ?? '', time: info.time ?? '' }),
        JSON.stringify(Array.isArray(b.howToPrepare) ? b.howToPrepare : []),
        JSON.stringify(Array.isArray(b.proTips) ? b.proTips : []),
        JSON.stringify(Array.isArray(b.commonMistakes) ? b.commonMistakes : [])
      );
    }
    importDb.close();
    res.json({ ok: true, lang, imported: { drinks: drinks.length, dishes: dishes.length, categories: categories.length, brewMethods: brewMethods.length } });
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
    otherDb.exec(`
      CREATE TABLE IF NOT EXISTS brew_methods (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        info TEXT NOT NULL,
        how_to_prepare TEXT NOT NULL,
        pro_tips TEXT NOT NULL,
        common_mistakes TEXT NOT NULL
      )
    `);
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
    const brewRows = otherDb.prepare('SELECT * FROM brew_methods').all();
    const brewMethods = brewRows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description || '',
      info: JSON.parse(r.info || '{}'),
      howToPrepare: JSON.parse(r.how_to_prepare || '[]'),
      proTips: JSON.parse(r.pro_tips || '[]'),
      commonMistakes: JSON.parse(r.common_mistakes || '[]'),
    }));
    otherDb.close();
    res.json({ drinks, dishes, categories, brewMethods, language: lang || 'en', exportedAt: new Date().toISOString() });
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
