import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { sanitizeDrink } from './sanitize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
const dbPath = join(dataDir, 'barrista_en.db');
const importPath = join(__dirname, '..', 'import', 'drinks.json');

if (!fs.existsSync(importPath)) {
  console.error('Файл не найден: import/drinks.json');
  process.exit(1);
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
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

const raw = fs.readFileSync(importPath, 'utf8');
let drinks;
try {
  drinks = JSON.parse(raw);
} catch (err) {
  console.error('Ошибка парсинга JSON:', err.message);
  process.exit(1);
}

if (!Array.isArray(drinks)) {
  console.error('В файле должен быть массив напитков');
  process.exit(1);
}

db.exec('DELETE FROM drinks');

const stmt = db.prepare(`
  INSERT INTO drinks (id, title, ingredients, instructions, dish_id, portions_amount, categories)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let count = 0;
for (const d of drinks) {
  const clean = sanitizeDrink(d);
  stmt.run(
    clean.id || String(count),
    clean.title,
    JSON.stringify(clean.ingredients),
    JSON.stringify(clean.instructions),
    clean.dishId,
    clean.portionsAmount,
    JSON.stringify(clean.categories)
  );
  count++;
}

console.log(`Очищена БД, импортировано напитков (с санитайзом): ${count}`);
db.close();
