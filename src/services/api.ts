import { Drink, Dish, ItemCategory } from '../types';
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

const getBase = () =>
  import.meta.env.DEV ? (import.meta.env.VITE_API_URL || 'http://localhost:3001') : '';

export interface LanguageOption {
  code: string;
}

export async function getAvailableLanguages(): Promise<LanguageOption[]> {
  const res = await fetchApi('/api/languages');
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
