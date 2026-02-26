/**
 * MyMemory API translation (en -> target language). Used by /api/translate.
 */

const MAX_CHUNK = 450;
const DELAY_MS = 350;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function translateText(text, targetLang) {
  if (!text || typeof text !== 'string') return '';
  const t = text.trim();
  if (!t) return '';
  const langpair = `en|${targetLang}`;
  const chunks = [];
  for (let i = 0; i < t.length; i += MAX_CHUNK) {
    chunks.push(t.slice(i, i + MAX_CHUNK));
  }
  const MYMEMORY_LIMIT_MARKERS = ['MYMEMORY WARNING', 'YOU USED ALL AVAILABLE FREE', 'NEXT AVAILABLE IN'];
  const out = [];
  for (const chunk of chunks) {
    await sleep(DELAY_MS);
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=${langpair}`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data?.responseData?.translatedText ?? chunk;
    const isLimitError = typeof translated === 'string' && MYMEMORY_LIMIT_MARKERS.some((m) => translated.toUpperCase().includes(m));
    if (isLimitError) {
      throw new Error('MyMemory daily free translation limit reached. Try again later or visit https://mymemory.translated.net/doc/usagelimits.php');
    }
    out.push(translated);
  }
  return out.join('');
}

export async function translateArray(arr, targetLang) {
  if (!Array.isArray(arr)) return arr;
  const out = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      out.push(await translateText(item, targetLang));
    } else if (item && typeof item === 'object' && item.name !== undefined) {
      out.push({
        ...item,
        name: await translateText(String(item.name), targetLang),
      });
    } else {
      out.push(item);
    }
    await sleep(DELAY_MS);
  }
  return out;
}

export async function translateInfo(info, targetLang) {
  if (!info || typeof info !== 'object') return info;
  const coffee = await translateText(info.coffee ?? '', targetLang);
  await sleep(DELAY_MS);
  const water = await translateText(info.water ?? '', targetLang);
  await sleep(DELAY_MS);
  const temperature = await translateText(info.temperature ?? '', targetLang);
  await sleep(DELAY_MS);
  const time = await translateText(info.time ?? '', targetLang);
  return { coffee, water, temperature, time };
}
