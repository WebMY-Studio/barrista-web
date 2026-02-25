import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { sanitizeString } from './sanitize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
const dbPath = join(dataDir, 'barrista_en.db');
const importPath = join(__dirname, '..', 'import', 'dishes.json');

if (!fs.existsSync(importPath)) {
  console.error('Файл не найден: import/dishes.json');
  process.exit(1);
}

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS dishes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    volume TEXT NOT NULL
  )
`);

const raw = fs.readFileSync(importPath, 'utf8');
let items;
try {
  items = JSON.parse(raw);
} catch (err) {
  console.error('Ошибка парсинга JSON:', err.message);
  process.exit(1);
}

if (!Array.isArray(items)) {
  console.error('В файле должен быть массив посуды');
  process.exit(1);
}

db.exec('DELETE FROM dishes');

const stmt = db.prepare(`
  INSERT INTO dishes (id, title, description, volume)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    description = excluded.description,
    volume = excluded.volume
`);

let count = 0;
for (const d of items) {
  stmt.run(
    sanitizeString(d.id ?? ''),
    sanitizeString(d.title ?? ''),
    sanitizeString(d.description ?? ''),
    sanitizeString(d.volume ?? '')
  );
  count++;
}

console.log(`Очищена таблица dishes, импортировано: ${count}`);
db.close();
