import { useState, useEffect, useMemo } from 'react';
import { Drink } from '../types';
import { DrinkForm } from '../components/DrinkForm';
import { DrinkList } from '../components/DrinkList';
import { CategoryChips } from '../components/CategoryChips';
import { Plus } from 'lucide-react';
import { getAllDrinks, getAllCategories, getAllDishes, saveDrink, deleteDrink as deleteDrinkFromDb } from '../services/api';
import { ItemCategory, Dish } from '../types';

export function DrinksPage() {
  const [drinks, setDrinks] = useState<Drink[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDrink, setEditingDrink] = useState<Drink | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [imageFilter, setImageFilter] = useState<'all' | 'no-image'>('all');
  const [drinkIdsWithoutImage, setDrinkIdsWithoutImage] = useState<Set<string>>(new Set());

  const filteredDrinks = useMemo(() => {
    let list = drinks;
    if (selectedCategory) list = list.filter((d) => d.categories.includes(selectedCategory));
    if (imageFilter === 'no-image') list = list.filter((d) => drinkIdsWithoutImage.has(d.id));
    return list;
  }, [drinks, selectedCategory, imageFilter, drinkIdsWithoutImage]);

  const handleImageError = (drinkId: string) => {
    setDrinkIdsWithoutImage((prev) => new Set(prev).add(drinkId));
  };

  useEffect(() => {
    Promise.all([getAllDrinks(), getAllCategories(), getAllDishes()])
      .then(([drinksData, categoriesData, dishesData]) => {
        setDrinks(drinksData);
        setCategories(categoriesData);
        setDishes(dishesData);
      })
      .catch((err) => console.error('Load error:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (drink: Drink) => {
    try {
      await saveDrink(drink);
      if (editingDrink) {
        setDrinks(drinks.map((d) => (d.id === drink.id ? drink : d)));
      } else {
        setDrinks([...drinks, drink]);
      }
      setEditingDrink(undefined);
      setShowForm(false);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      alert('Failed to save drink');
    }
  };

  const handleEdit = (drink: Drink) => {
    setEditingDrink(drink);
    setShowForm(true);
  };

  useEffect(() => {
    if (showForm) window.scrollTo(0, 0);
  }, [showForm]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this drink?')) return;
    try {
      await deleteDrinkFromDb(id);
      setDrinks(drinks.filter((d) => d.id !== id));
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Failed to delete drink');
    }
  };

  const handleCancel = () => {
    setEditingDrink(undefined);
    setShowForm(false);
  };

  return (
    <div className="page-content page-drinks">
      <div className="toolbar">
        <button
          onClick={() => {
            setEditingDrink(undefined);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} /> Add drink
        </button>
      </div>

        {showForm && (
          <div className="form-container">
            <DrinkForm
              drink={editingDrink}
              availableCategories={categories}
              availableDishes={dishes}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}

      {loading ? (
        <div className="loading-state">Loading drinks…</div>
      ) : !showForm ? (
        <>
          <CategoryChips
            categories={categories}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />
          <div className="drink-filters-row">
            <span className="drink-filters-label">Image:</span>
            <button
              type="button"
              className={`chip ${imageFilter === 'all' ? 'chip-active' : ''}`}
              onClick={() => setImageFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`chip ${imageFilter === 'no-image' ? 'chip-active' : ''}`}
              onClick={() => setImageFilter('no-image')}
            >
              No image
            </button>
          </div>
          <DrinkList
            drinks={filteredDrinks}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onImageError={handleImageError}
          />
        </>
      ) : null}
    </div>
  );
}
