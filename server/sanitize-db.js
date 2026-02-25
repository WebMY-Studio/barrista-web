import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { sanitizeDrink } from './sanitize.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
const dbPath = join(dataDir, 'barrista_en.db');

if (!fs.existsSync(dbPath)) {
  console.error('Database not found: server/data/barrista_en.db');
  process.exit(1);
}

const db = new Database(dbPath);
const rows = db.prepare('SELECT * FROM drinks').all();
const stmt = db.prepare(`
  UPDATE drinks SET
    title = ?, ingredients = ?, instructions = ?, dish_id = ?, portions_amount = ?, categories = ?
  WHERE id = ?
`);

let count = 0;
for (const row of rows) {
  const raw = {
    id: row.id,
    title: row.title,
    ingredients: JSON.parse(row.ingredients),
    instructions: JSON.parse(row.instructions),
    dishId: row.dish_id,
    portionsAmount: row.portions_amount,
    categories: JSON.parse(row.categories),
  };
  const d = sanitizeDrink(raw);
  stmt.run(
    d.title,
    JSON.stringify(d.ingredients),
    JSON.stringify(d.instructions),
    d.dishId,
    d.portionsAmount,
    JSON.stringify(d.categories),
    row.id
  );
  count++;
}

console.log(`Очищено записей: ${count}`);
db.close();
