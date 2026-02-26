export interface Ingredient {
  title: string;
  volume: string;
}

export interface Drink {
  id: string;
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  dishId: string;
  portionsAmount: number;
  categories: string[];
}

export interface DrinkTranslation {
  title: string;
  instructions: string[];
  ingredients: Array<{
    title: string;
    volume: string;
  }>;
}

export interface Dish {
  id: string;
  title: string;
  description: string;
  volume: string;
}

export interface ItemCategory {
  id: string;
  title: string;
  drinksCount: number;
}

export interface MainInfo {
  coffee: string;
  water: string;
  temperature: string;
  time: string;
}

export interface BrewMethod {
  id: string;
  title: string;
  description: string;
  info: MainInfo;
  howToPrepare: string[];
  proTips: string[];
  commonMistakes: string[];
}
