/**
 * Creates barrista_es.db by copying barrista_en.db and translating all text to Spanish.
 * Uses MyMemory API (free, no key). Run: node server/translate-db-to-spanish.js
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, 'data');
const sourcePath = join(dataDir, 'barrista_en.db');
const targetPath = join(dataDir, 'barrista_es.db');

const MAX_CHUNK = 450; // MyMemory ~500 bytes per request
const DELAY_MS = 350;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateText(text) {
  if (!text || typeof text !== 'string') return '';
  const t = text.trim();
  if (!t) return '';
  const chunks = [];
  for (let i = 0; i < t.length; i += MAX_CHUNK) {
    chunks.push(t.slice(i, i + MAX_CHUNK));
  }
  const out = [];
  for (const chunk of chunks) {
    await sleep(DELAY_MS);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=en|es`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      const translated = data?.responseData?.translatedText ?? chunk;
      out.push(translated);
    } catch (err) {
      console.warn('Translate fail, keeping original:', chunk.slice(0, 30) + '...', err.message);
      out.push(chunk);
    }
  }
  return out.join('');
}

async function translateArray(arr) {
  if (!Array.isArray(arr)) return arr;
  const out = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      out.push(await translateText(item));
    } else if (item && typeof item === 'object' && item.name !== undefined) {
      out.push({
        ...item,
        name: await translateText(String(item.name)),
      });
    } else {
      out.push(item);
    }
    await sleep(DELAY_MS);
  }
  return out;
}

async function translateInfo(info) {
  if (!info || typeof info !== 'object') return info;
  const coffee = await translateText(info.coffee ?? '');
  await sleep(DELAY_MS);
  const water = await translateText(info.water ?? '');
  await sleep(DELAY_MS);
  const temperature = await translateText(info.temperature ?? '');
  await sleep(DELAY_MS);
  const time = await translateText(info.time ?? '');
  return { coffee, water, temperature, time };
}

if (!fs.existsSync(sourcePath)) {
  console.error('Source DB not found:', sourcePath);
  process.exit(1);
}

const sourceDb = new Database(sourcePath);

// Ensure tables exist in source
sourceDb.exec(`
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
sourceDb.exec(`
  CREATE TABLE IF NOT EXISTS dishes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    volume TEXT NOT NULL
  )
`);
sourceDb.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL
  )
`);
sourceDb.exec(`
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

if (fs.existsSync(targetPath)) {
  fs.unlinkSync(targetPath);
}

const targetDb = new Database(targetPath);
targetDb.exec(`
  CREATE TABLE drinks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    ingredients TEXT NOT NULL,
    instructions TEXT NOT NULL,
    dish_id TEXT NOT NULL,
    portions_amount INTEGER NOT NULL,
    categories TEXT NOT NULL
  )
`);
targetDb.exec(`
  CREATE TABLE dishes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    volume TEXT NOT NULL
  )
`);
targetDb.exec(`
  CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL
  )
`);
targetDb.exec(`
  CREATE TABLE brew_methods (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    info TEXT NOT NULL,
    how_to_prepare TEXT NOT NULL,
    pro_tips TEXT NOT NULL,
    common_mistakes TEXT NOT NULL
  )
`);

const insCat = targetDb.prepare('INSERT INTO categories (id, title) VALUES (?, ?)');
const insDish = targetDb.prepare('INSERT INTO dishes (id, title, description, volume) VALUES (?, ?, ?, ?)');
const insDrink = targetDb.prepare(`
  INSERT INTO drinks (id, title, ingredients, instructions, dish_id, portions_amount, categories)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const insBrew = targetDb.prepare(`
  INSERT INTO brew_methods (id, title, description, info, how_to_prepare, pro_tips, common_mistakes)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

async function main() {
  console.log('Translating DB to Spanish (en -> es)...');

  const categories = sourceDb.prepare('SELECT * FROM categories').all();
  for (const r of categories) {
    const title = await translateText(r.title);
    insCat.run(r.id, title);
    console.log('  category:', r.id);
  }

  const dishes = sourceDb.prepare('SELECT * FROM dishes').all();
  for (const r of dishes) {
    const title = await translateText(r.title);
    const description = await translateText(r.description || '');
    await sleep(DELAY_MS);
    const volume = await translateText(r.volume || '');
    insDish.run(r.id, title, description, volume);
    console.log('  dish:', r.id);
  }

  const drinks = sourceDb.prepare('SELECT * FROM drinks').all();
  for (const r of drinks) {
    const title = await translateText(r.title);
    const ingredients = JSON.parse(r.ingredients || '[]');
    const ingredientsTranslated = await translateArray(ingredients);
    const instructions = JSON.parse(r.instructions || '[]');
    const instructionsTranslated = await translateArray(instructions);
    insDrink.run(
      r.id,
      title,
      JSON.stringify(ingredientsTranslated),
      JSON.stringify(instructionsTranslated),
      r.dish_id,
      r.portions_amount,
      r.categories
    );
    console.log('  drink:', r.id);
  }

  const brewRows = sourceDb.prepare('SELECT * FROM brew_methods').all();
  for (const r of brewRows) {
    const title = await translateText(r.title);
    const description = await translateText(r.description || '');
    const info = JSON.parse(r.info || '{}');
    const infoTranslated = await translateInfo(info);
    const howToPrepare = JSON.parse(r.how_to_prepare || '[]');
    const howToPrepareTranslated = await translateArray(howToPrepare);
    const proTips = JSON.parse(r.pro_tips || '[]');
    const proTipsTranslated = await translateArray(proTips);
    const commonMistakes = JSON.parse(r.common_mistakes || '[]');
    const commonMistakesTranslated = await translateArray(commonMistakes);
    insBrew.run(
      r.id,
      title,
      description,
      JSON.stringify(infoTranslated),
      JSON.stringify(howToPrepareTranslated),
      JSON.stringify(proTipsTranslated),
      JSON.stringify(commonMistakesTranslated)
    );
    console.log('  brew_method:', r.id);
  }

  sourceDb.close();
  targetDb.close();
  console.log('Done. Created', targetPath);
}

main().catch((err) => {
  console.error(err);
  sourceDb.close();
  targetDb.close();
  process.exit(1);
});
