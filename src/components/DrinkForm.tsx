import React, { useState, useEffect } from 'react';
import { Drink, Ingredient } from '../types';
import { Plus, X, Save } from 'lucide-react';

interface CategoryOption {
  id: string;
  title: string;
}

interface DishOption {
  id: string;
  title: string;
}

interface DrinkFormProps {
  drink?: Drink;
  availableCategories: CategoryOption[];
  availableDishes: DishOption[];
  onSave: (drink: Drink) => void;
  onCancel: () => void;
}

export const DrinkForm: React.FC<DrinkFormProps> = ({ drink, availableCategories, availableDishes, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Drink>({
    id: drink?.id || '',
    title: drink?.title || '',
    ingredients: drink?.ingredients || [],
    instructions: drink?.instructions || [],
    dishId: drink?.dishId || '',
    portionsAmount: drink?.portionsAmount || 1,
    categories: drink?.categories || [],
  });

  const [newIngredient, setNewIngredient] = useState<Ingredient>({ title: '', volume: '' });
  const [newInstruction, setNewInstruction] = useState('');

  useEffect(() => {
    if (drink) {
      setFormData(drink);
    }
  }, [drink]);

  const handleAddIngredient = () => {
    if (newIngredient.title && newIngredient.volume) {
      setFormData({
        ...formData,
        ingredients: [...formData.ingredients, newIngredient],
      });
      setNewIngredient({ title: '', volume: '' });
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index),
    });
  };

  const handleAddInstruction = () => {
    if (newInstruction.trim()) {
      setFormData({
        ...formData,
        instructions: [...formData.instructions, newInstruction.trim()],
      });
      setNewInstruction('');
    }
  };

  const handleRemoveInstruction = (index: number) => {
    setFormData({
      ...formData,
      instructions: formData.instructions.filter((_, i) => i !== index),
    });
  };

  const toggleCategory = (categoryId: string) => {
    const has = formData.categories.includes(categoryId);
    setFormData({
      ...formData,
      categories: has
        ? formData.categories.filter((c) => c !== categoryId)
        : [...formData.categories, categoryId],
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.id) {
      formData.id = `drink-${Date.now()}`;
    }
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="drink-form">
      <div className="form-group">
        <label>Drink ID:</label>
        <input
          type="text"
          value={formData.id}
          onChange={(e) => setFormData({ ...formData, id: e.target.value })}
          required
          disabled={!!drink}
        />
      </div>

      <div className="form-group">
        <label>Title:</label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label>Dish:</label>
        <select
          value={formData.dishId}
          onChange={(e) => setFormData({ ...formData, dishId: e.target.value })}
          required
        >
          <option value="">— Select dish —</option>
          {formData.dishId && !availableDishes.some((d) => d.id === formData.dishId) && (
            <option value={formData.dishId}>{formData.dishId} (not in list)</option>
          )}
          {availableDishes.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} ({d.id})
            </option>
          ))}
        </select>
        {availableDishes.length === 0 && !formData.dishId && (
          <p className="form-hint">Add dishes in the Dishes section first.</p>
        )}
      </div>

      <div className="form-group">
        <label>Portions:</label>
        <input
          type="number"
          value={formData.portionsAmount}
          onChange={(e) => setFormData({ ...formData, portionsAmount: parseInt(e.target.value) || 1 })}
          min="1"
          required
        />
      </div>

      <div className="form-group">
        <label>Ingredients:</label>
        <div className="ingredients-list">
          {formData.ingredients.map((ingredient, index) => (
            <div key={index} className="ingredient-item">
              <span>{ingredient.title} - {ingredient.volume}</span>
              <button
                type="button"
                onClick={() => handleRemoveIngredient(index)}
                className="btn-remove"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="add-item">
          <input
            type="text"
            placeholder="Ingredient name"
            value={newIngredient.title}
            onChange={(e) => setNewIngredient({ ...newIngredient, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="Volume"
            value={newIngredient.volume}
            onChange={(e) => setNewIngredient({ ...newIngredient, volume: e.target.value })}
          />
          <button type="button" onClick={handleAddIngredient} className="btn-add">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Instructions:</label>
        <div className="instructions-list">
          {formData.instructions.map((instruction, index) => (
            <div key={index} className="instruction-item">
              <span>{index + 1}. {instruction}</span>
              <button
                type="button"
                onClick={() => handleRemoveInstruction(index)}
                className="btn-remove"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="add-item">
          <textarea
            placeholder="New instruction"
            value={newInstruction}
            onChange={(e) => setNewInstruction(e.target.value)}
            rows={2}
          />
          <button type="button" onClick={handleAddInstruction} className="btn-add">
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      <div className="form-group">
        <label>Categories (select from existing):</label>
        <div className="categories-pick-list">
          {availableCategories.length === 0 ? (
            <p className="form-hint">Add categories in the Categories section first.</p>
          ) : (
            availableCategories.map((cat) => {
              const selected = formData.categories.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  className={`category-pick-chip ${selected ? 'category-pick-chip-selected' : ''}`}
                  onClick={() => toggleCategory(cat.id)}
                >
                  {cat.title}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="form-actions">
        <button type="submit" className="btn-primary">
          <Save size={16} /> Save
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
};
