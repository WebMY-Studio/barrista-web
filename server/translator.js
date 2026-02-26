/**
 * OpenAI API translation (en -> target language). Used by /api/translate.
 * Set OPENAI_API_KEY in .env. Uses gpt-4o-mini with batching for cost efficiency.
 * Optional extra instructions from server/data/translation-prompt-extra.txt (details only; output format is fixed).
 */

import OpenAI from 'openai';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPT_EXTRA_PATH = join(__dirname, 'data', 'translation-prompt-extra.txt');
const MODEL_PATH = join(__dirname, 'data', 'translation-model.txt');

const BATCH_SIZE = 50;

/** Model options for translation (id, label with approximate price/quality). */
export const TRANSLATION_MODEL_OPTIONS = [
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini (~$0.15/1M in, good quality)' },
  { id: 'gpt-4o', label: 'gpt-4o (higher cost, best quality)' },
  { id: 'gpt-4o-2024-08-06', label: 'gpt-4o 2024-08 (higher cost, best quality)' },
  { id: 'gpt-4-turbo', label: 'gpt-4-turbo (high cost, high quality)' },
];

const ALLOWED_MODEL_IDS = new Set(TRANSLATION_MODEL_OPTIONS.map((m) => m.id));
const DEFAULT_MODEL = 'gpt-4o-mini';

function getModel() {
  try {
    if (fs.existsSync(MODEL_PATH)) {
      const id = fs.readFileSync(MODEL_PATH, 'utf8').trim();
      if (ALLOWED_MODEL_IDS.has(id)) return id;
    }
  } catch (_) {}
  return DEFAULT_MODEL;
}

/** Default domain/terminology (safe to extend via prompt extra file). */
const DEFAULT_PROMPT_EXTRA = 'Domain: coffee, drinks, recipes, barista. Keep terminology consistent.';

/** User-added extra (from file). Empty if not set. */
function getPromptExtraFileContent() {
  try {
    if (fs.existsSync(PROMPT_EXTRA_PATH)) {
      return fs.readFileSync(PROMPT_EXTRA_PATH, 'utf8').trim();
    }
  } catch (_) {}
  return '';
}

/** Full extra block: default + optional user extra (so logic is never broken). */
function getPromptExtra() {
  const user = getPromptExtraFileContent();
  return user ? `${DEFAULT_PROMPT_EXTRA}\n\n${user}` : DEFAULT_PROMPT_EXTRA;
}

const LANG_NAMES = {
  ru: 'Russian',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pl: 'Polish',
  pt: 'Portuguese',
  es: 'Spanish',
  tr: 'Turkish',
};

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    throw new Error('OPENAI_API_KEY is not set in .env');
  }
  return new OpenAI({ apiKey: apiKey.trim() });
}

function getLangName(code) {
  return LANG_NAMES[code] || code;
}

/**
 * Translate an array of strings in one or more API calls (batches of BATCH_SIZE).
 * @param {string[]} texts - non-empty strings to translate
 * @param {string} targetLang - language code (ru, es, ...)
 * @returns {Promise<string[]>} same length and order as input
 */
async function translateBatch(texts, targetLang) {
  if (!texts.length) return [];
  const langName = getLangName(targetLang);
  const client = getClient();
  const results = [];
  const promptExtra = getPromptExtra();
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const systemContent =
      `You are a translator. Translate from English to ${langName}. ${promptExtra}\n\nOutput ONLY a valid JSON array of ${batch.length} translated strings, same order as input. No other text, no markdown.`;
    const userContent = JSON.stringify(batch);
    const completion = await client.chat.completions.create({
      model: getModel(),
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: userContent },
      ],
    });
    const content = completion.choices[0]?.message?.content?.trim() || '[]';
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      throw new Error(`OpenAI returned invalid JSON: ${content.slice(0, 200)}`);
    }
    if (!Array.isArray(parsed) || parsed.length !== batch.length) {
      throw new Error(`OpenAI returned ${parsed.length} items, expected ${batch.length}`);
    }
    results.push(...parsed.map((s) => (typeof s === 'string' ? s : String(s))));
  }
  return results;
}

export async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return '';
  const t = text.trim();
  if (!t) return '';
  const [result] = await translateBatch([t], targetLang);
  return result ?? t;
}

export async function translateArray(arr, targetLang) {
  if (!Array.isArray(arr)) return arr;
  const slots = [];
  const strings = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      slots.push({ kind: 'string' });
      strings.push(item);
    } else if (item && typeof item === 'object' && item.name !== undefined) {
      slots.push({ kind: 'name', rest: item });
      strings.push(String(item.name));
    } else {
      slots.push({ kind: 'raw', value: item });
      strings.push(null);
    }
  }
  const toTranslate = strings.filter((s) => s !== null);
  const translated = toTranslate.length ? await translateBatch(toTranslate, targetLang) : [];
  let j = 0;
  return slots.map((slot) => {
    if (slot.kind === 'raw') return slot.value;
    if (slot.kind === 'string') return translated[j++];
    return { ...slot.rest, name: translated[j++] };
  });
}

export async function translateInfo(info, targetLang) {
  if (!info || typeof info !== 'object') return info;
  const texts = [
    String(info.coffee ?? '').trim(),
    String(info.water ?? '').trim(),
    String(info.temperature ?? '').trim(),
    String(info.time ?? '').trim(),
  ];
  if (texts.every((s) => !s)) return info;
  const translated = await translateBatch(texts, targetLang);
  return {
    coffee: translated[0] ?? '',
    water: translated[1] ?? '',
    temperature: translated[2] ?? '',
    time: translated[3] ?? '',
  };
}
