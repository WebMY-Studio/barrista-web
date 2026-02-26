import { Drink, Dish, ItemCategory, BrewMethod } from '../types';
import { TOKEN_KEY } from '../constants/auth';

const API_BASE =
  import.meta.env.DEV
    ? (import.meta.env.VITE_API_URL || 'http://localhost:3001')
    : '';

function getAuthHeaders(): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

async function fetchApi(path: string, options?: RequestInit) {
  const url = path.startsWith('http') ? path : `${API_BASE.replace(/\/$/, '')}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...(options?.headers as Record<string, string>),
  };
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res;
}

export async function login(username: string, password: string): Promise<{ token: string }> {
  const base = API_BASE.replace(/\/$/, '');
  const res = await fetch(`${base}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

export async function getAllDrinks(): Promise<Drink[]> {
  const res = await fetchApi('/api/drinks');
  return res.json();
}

export async function saveDrink(drink: Drink): Promise<void> {
  await fetchApi('/api/drinks', {
    method: 'POST',
    body: JSON.stringify(drink),
  });
}

export async function deleteDrink(id: string): Promise<void> {
  await fetchApi(`/api/drinks/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** URL for drink photo (server serves drink_<id>.jpg from /uploads). Use img onError for placeholder. */
export function getDrinkImageUrl(id: string): string {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const path = `/uploads/drink_${encodeURIComponent(id)}.jpg`;
  return base ? `${base}${path}` : path;
}

export async function uploadDrinkPhoto(drinkId: string, file: File): Promise<void> {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const form = new FormData();
  form.append('photo', file);
  const res = await fetch(`${base}/api/drinks/${encodeURIComponent(drinkId)}/photo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
}

/** Import multiple drink images (filenames must be drink_<id>.jpg). */
export async function importDrinkImages(files: File[]): Promise<{ saved: number; total: number }> {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const form = new FormData();
  for (const f of files) form.append('images', f);
  const res = await fetch(`${base}/api/import-drink-images`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Import failed');
  return { saved: data.saved ?? 0, total: data.total ?? 0 };
}

/** Download all drink and category images as a ZIP. */
export async function downloadAllImages(): Promise<void> {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const res = await fetch(`${base}/api/download-all-images`, { headers: getAuthHeaders() });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Download failed');
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'barrista-images.zip';
  a.click();
  URL.revokeObjectURL(url);
}

/** URL for category photo (server serves category_<id>.png from /uploads). Use img onError for placeholder. */
export function getCategoryImageUrl(id: string): string {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const path = `/uploads/category_${encodeURIComponent(id)}.png`;
  return base ? `${base}${path}` : path;
}

export async function uploadCategoryPhoto(categoryId: string, file: File): Promise<void> {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const form = new FormData();
  form.append('photo', file);
  const res = await fetch(`${base}/api/categories/${encodeURIComponent(categoryId)}/photo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
}

/** Import multiple category images (filenames must be category_<id>.png or .jpg). */
export async function importCategoryImages(files: File[]): Promise<{ saved: number; total: number }> {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const form = new FormData();
  for (const f of files) form.append('images', f);
  const res = await fetch(`${base}/api/import-category-images`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Import failed');
  return { saved: data.saved ?? 0, total: data.total ?? 0 };
}

export async function getAllDishes(): Promise<Dish[]> {
  const res = await fetchApi('/api/dishes');
  return res.json();
}

export async function saveDish(dish: Dish): Promise<void> {
  await fetchApi('/api/dishes', { method: 'POST', body: JSON.stringify(dish) });
}

export async function deleteDish(id: string): Promise<void> {
  await fetchApi(`/api/dishes/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** URL for dish photo (server serves dish_<id>.png from /uploads). Use img onError for placeholder. */
export function getDishImageUrl(id: string): string {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const path = `/uploads/dish_${encodeURIComponent(id)}.png`;
  return base ? `${base}${path}` : path;
}

export async function uploadDishPhoto(dishId: string, file: File): Promise<void> {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const form = new FormData();
  form.append('photo', file);
  const res = await fetch(`${base}/api/dishes/${encodeURIComponent(dishId)}/photo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
}

/** Import multiple dish images (filenames must be dish_<id>.png or .jpg). */
export async function importDishImages(files: File[]): Promise<{ saved: number; total: number }> {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const form = new FormData();
  for (const f of files) form.append('images', f);
  const res = await fetch(`${base}/api/import-dish-images`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Import failed');
  return { saved: data.saved ?? 0, total: data.total ?? 0 };
}

export async function getAllCategories(): Promise<ItemCategory[]> {
  const res = await fetchApi('/api/categories');
  return res.json();
}

export async function saveCategory(cat: { id: string; title: string }): Promise<void> {
  await fetchApi('/api/categories', { method: 'POST', body: JSON.stringify(cat) });
}

export async function deleteCategory(id: string): Promise<void> {
  await fetchApi(`/api/categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getAllBrewMethods(): Promise<BrewMethod[]> {
  const res = await fetchApi('/api/brew-methods');
  return res.json();
}

export async function saveBrewMethod(method: BrewMethod): Promise<void> {
  await fetchApi('/api/brew-methods', { method: 'POST', body: JSON.stringify(method) });
}

export async function deleteBrewMethod(id: string): Promise<void> {
  await fetchApi(`/api/brew-methods/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/** URL for brew method photo (server serves brew_<id>.png from /uploads). */
export function getBrewMethodImageUrl(id: string): string {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const path = `/uploads/brew_${encodeURIComponent(id)}.png`;
  return base ? `${base}${path}` : path;
}

export async function uploadBrewMethodPhoto(methodId: string, file: File): Promise<void> {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const form = new FormData();
  form.append('photo', file);
  const res = await fetch(`${base}/api/brew-methods/${encodeURIComponent(methodId)}/photo`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
}

/** Import multiple brew method images (filenames must be brew_<id>.png or .jpg). */
export async function importBrewMethodImages(files: File[]): Promise<{ saved: number; total: number }> {
  const base = (import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '').replace(/\/$/, '');
  const form = new FormData();
  for (const f of files) form.append('images', f);
  const res = await fetch(`${base}/api/import-brew-method-images`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Import failed');
  return { saved: data.saved ?? 0, total: data.total ?? 0 };
}

const getBase = () =>
  import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '';

export interface LanguageOption {
  code: string;
}

export async function getAvailableLanguages(): Promise<LanguageOption[]> {
  const res = await fetchApi('/api/languages');
  return res.json();
}

export type TranslationLanguageOption = { code: string; label: string };

export async function getTranslationLanguages(): Promise<TranslationLanguageOption[]> {
  const res = await fetchApi('/api/translation-languages');
  return res.json();
}

export async function saveTranslationLanguages(list: TranslationLanguageOption[]): Promise<TranslationLanguageOption[]> {
  const res = await fetchApi('/api/translation-languages', {
    method: 'PUT',
    body: JSON.stringify(list),
  });
  return res.json();
}

export async function getTranslationPromptExtra(): Promise<{ extra: string }> {
  const res = await fetchApi('/api/translation-prompt-extra');
  return res.json();
}

export async function saveTranslationPromptExtra(extra: string): Promise<{ extra: string }> {
  const res = await fetchApi('/api/translation-prompt-extra', {
    method: 'PUT',
    body: JSON.stringify({ extra }),
  });
  return res.json();
}

export type TranslationModelOption = { id: string; label: string };

export async function getTranslationModel(): Promise<{ model: string; options: TranslationModelOption[] }> {
  const res = await fetchApi('/api/translation-model');
  return res.json();
}

export async function saveTranslationModel(model: string): Promise<{ model: string }> {
  const res = await fetchApi('/api/translation-model', {
    method: 'PUT',
    body: JSON.stringify({ model }),
  });
  return res.json();
}

export async function downloadDbFile(lang?: string): Promise<void> {
  const base = getBase().replace(/\/$/, '');
  const url = lang ? `${base}/api/export-db?lang=${encodeURIComponent(lang)}` : `${base}/api/export-db`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error('Failed to download database');
  const blob = await res.blob();
  const name = lang && lang !== 'en' ? `barrista_${lang}.db` : 'barrista_en.db';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Delete a translated database (barrista_<lang>.db). Cannot delete en. */
export async function deleteDatabase(lang: string): Promise<void> {
  await fetchApi(`/api/databases/${encodeURIComponent(lang)}`, { method: 'DELETE' });
}

export async function downloadJsonForLanguage(lang: string): Promise<void> {
  const base = getBase().replace(/\/$/, '');
  const url = `${base}/api/export-json?lang=${encodeURIComponent(lang)}`;
  const res = await fetch(url, { headers: getAuthHeaders() });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  if (!res.ok) throw new Error('Failed to export JSON');
  const data = await res.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const name = `barrista_export_${lang}.json`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Upload a JSON export file to import into barrista_<lang>.db (default lang = en). */
export async function importJson(file: File, lang: string = 'en'): Promise<{ ok: boolean; lang: string; imported?: { drinks: number; dishes: number; categories: number } }> {
  const base = getBase().replace(/\/$/, '');
  const form = new FormData();
  form.append('file', file);
  form.append('lang', lang);
  const res = await fetch(`${base}/api/import-json`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: form,
  });
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new Event('auth-logout'));
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Import failed');
  return data;
}

export type TranslationOptions = {
  lang: string;
  brewMethods: boolean;
  drinks: boolean;
  categories: boolean;
  dishes: boolean;
  overrideExisting: boolean;
};

export type BlockStats = { translated: number; skipped: number; error: number; durationMs: number };

export type TranslationResult = {
  ok: boolean;
  lang: string;
  counts: { categories: number; dishes: number; drinks: number; brewMethods: number };
  blockResults?: Record<string, BlockStats>;
  logLines?: string[];
};

export type TranslationProgress = {
  step?: string;
  current?: number;
  total?: number;
  done?: boolean;
  counts?: { categories: number; dishes: number; drinks: number; brewMethods: number };
  logLines?: string[];
  etaSeconds?: number | null;
  lastId?: string | null;
  lastItemMs?: number | null;
};

export async function getTranslationProgress(): Promise<TranslationProgress | null> {
  const res = await fetchApi('/api/translation-progress');
  const data = await res.json();
  return data ?? null;
}

/** Check translated DBs for missing entities vs en. Returns log text. */
export async function checkTranslationIntegrity(): Promise<{ log: string }> {
  const res = await fetchApi('/api/check-translation-integrity');
  return res.json();
}

/** Start translation from en to target language. Creates target DB if missing. */
export async function startTranslation(opts: TranslationOptions): Promise<TranslationResult> {
  const res = await fetchApi('/api/translate', {
    method: 'POST',
    body: JSON.stringify({
      lang: opts.lang,
      brewMethods: opts.brewMethods,
      drinks: opts.drinks,
      categories: opts.categories,
      dishes: opts.dishes,
      overrideExisting: opts.overrideExisting,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Translation failed');
  return data;
}
