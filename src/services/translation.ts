import { Drink, DrinkTranslation } from '../types';

const TRANSLATION_API_URL = 'https://api.example.com/translate'; // Замените на ваш API

export async function translateDrink(
  drink: Drink,
  targetLanguages: string[]
): Promise<Record<string, DrinkTranslation>> {
  const translations: Record<string, DrinkTranslation> = {};

  for (const lang of targetLanguages) {
    try {
      // Переводим название
      const translatedTitle = await translateText(drink.title, lang);
      
      // Переводим инструкции
      const translatedInstructions = await Promise.all(
        drink.instructions.map(instruction => translateText(instruction, lang))
      );
      
      // Переводим ингредиенты
      const translatedIngredients = await Promise.all(
        drink.ingredients.map(async (ingredient) => ({
          title: await translateText(ingredient.title, lang),
          volume: ingredient.volume, // Объем обычно не переводится
        }))
      );

      translations[lang] = {
        title: translatedTitle,
        instructions: translatedInstructions,
        ingredients: translatedIngredients,
      };
    } catch (error) {
      console.error(`Ошибка перевода на ${lang}:`, error);
      throw error;
    }
  }

  return translations;
}

async function translateText(text: string, targetLang: string): Promise<string> {
  // Пример использования API перевода
  // Замените на ваш реальный API
  const response = await fetch(TRANSLATION_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      targetLang,
    }),
  });

  if (!response.ok) {
    throw new Error(`Translation failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.translatedText || text;
}

// Альтернативная функция для мок-перевода (для тестирования)
export async function mockTranslateDrink(
  drink: Drink,
  targetLanguages: string[]
): Promise<Record<string, DrinkTranslation>> {
  const translations: Record<string, DrinkTranslation> = {};

  for (const lang of targetLanguages) {
    translations[lang] = {
      title: `${drink.title} [${lang}]`,
      instructions: drink.instructions.map(inst => `${inst} [${lang}]`),
      ingredients: drink.ingredients.map(ing => ({
        title: `${ing.title} [${lang}]`,
        volume: ing.volume,
      })),
    };
  }

  return translations;
}
