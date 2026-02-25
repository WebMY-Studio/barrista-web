/** Фигурные/фантомные кавычки и нулевые символы — заменяем на обычные или убираем */
const ZERO_WIDTH = /[\u200B-\u200D\uFEFF\u2060]/g;

export function sanitizeString(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/\u201C|\u201D|\u201E|\u201F|\u00AB|\u00BB/g, '"')  // " " „ ‟ « »
    .replace(/\u2018|\u2019|\u2039|\u203A/g, "'")               // ' ' ‹ ›
    .replace(ZERO_WIDTH, '')
    .replace(/^\s*["']+|["']+\s*$/g, '')  // обрезка обрамляющих кавычек
    .trim();
}

export function sanitizeDrink(d) {
  return {
    id: sanitizeString(d.id),
    title: sanitizeString(d.title),
    ingredients: (d.ingredients || []).map((ing) => ({
      title: sanitizeString(ing.title),
      volume: sanitizeString(ing.volume),
    })),
    instructions: (d.instructions || []).map((s) => sanitizeString(s)),
    dishId: sanitizeString(d.dishId),
    portionsAmount: typeof d.portionsAmount === 'number' ? d.portionsAmount : 1,
    categories: (d.categories || []).map((s) => sanitizeString(s)),
  };
}
