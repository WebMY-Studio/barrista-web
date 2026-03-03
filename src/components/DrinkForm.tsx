import { useState, useEffect, useRef, type FC, type FormEvent, type ChangeEvent } from 'react';
import { Drink, Ingredient } from '../types';
import { Plus, X, Save, Upload, Loader } from 'lucide-react';
import { getDrinkImageUrl, uploadDrinkPhoto, getAvailableLanguages, getDrinkInLanguage, type LanguageOption } from '../services/api';

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

const PHOTO_PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120"><rect width="120" height="120" fill="#e8e8e8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="12" font-family="sans-serif">No photo</text></svg>'
);

export const DrinkForm: FC<DrinkFormProps> = ({ drink, availableCategories, availableDishes, onSave, onCancel }) => {
  const [photoKey, setPhotoKey] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [viewLangs, setViewLangs] = useState<LanguageOption[]>([]);
  const [viewLang, setViewLang] = useState<string>('en');
  const [viewDrink, setViewDrink] = useState<Drink | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState<string | null>(null);

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

  useEffect(() => {
    getAvailableLanguages()
      .then((langs) => setViewLangs(langs.length ? langs : [{ code: 'en' }]))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!formData.id || !viewLang) {
      setViewDrink(null);
      setViewError(null);
      return;
    }
    setViewLoading(true);
    setViewError(null);
    getDrinkInLanguage(formData.id, viewLang)
      .then((d) => {
        if (!d) {
          setViewDrink(null);
          setViewError('No translation for this drink in selected language.');
        } else {
          setViewDrink(d);
          setViewError(null);
        }
      })
      .catch((err) => {
        console.error(err);
        setViewDrink(null);
        setViewError(err instanceof Error ? err.message : 'Failed to load translation');
      })
      .finally(() => setViewLoading(false));
  }, [formData.id, viewLang]);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.id) {
      formData.id = `drink-${Date.now()}`;
    }
    onSave(formData);
  };

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !formData.id) return;
    if (file.type !== 'image/jpeg') {
      alert('Only JPG is supported.');
      e.target.value = '';
      return;
    }
    setUploadingPhoto(true);
    try {
      await uploadDrinkPhoto(formData.id, file);
      setPhotoKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="drink-form">
      <div className="form-group">
        <label>View language:</label>
        <select
          value={viewLang}
          onChange={(e) => setViewLang(e.target.value)}
          className="dashboard-translations-select"
        >
          {viewLangs.length === 0 ? (
            <option value="en">en</option>
          ) : (
            viewLangs.map((l) => (
              <option key={l.code} value={l.code}>{l.code}</option>
            ))
          )}
        </select>
      </div>

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

      {formData.id && (
        <div className="form-group form-group-photo">
          <label>Photo:</label>
          <div className="drink-form-photo">
            <img
              src={getDrinkImageUrl(formData.id) + (photoKey ? `?t=${photoKey}` : '')}
              alt=""
              className="drink-form-photo-preview"
              onError={(e) => { e.currentTarget.src = PHOTO_PLACEHOLDER; }}
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg"
              className="drink-form-photo-input"
              onChange={handlePhotoChange}
              disabled={uploadingPhoto}
            />
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="btn-secondary drink-form-photo-btn"
            >
              {uploadingPhoto ? <Loader size={16} className="spinner" /> : <Upload size={16} />}
              {uploadingPhoto ? 'Uploading…' : 'Upload photo'}
            </button>
          </div>
        </div>
      )}

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

      {formData.id && (
        <div className="form-group">
          <label>Preview in selected language:</label>
          <div className="drink-translation-preview">
            {viewLoading ? (
              <span><Loader size={16} className="spinner" /> Loading…</span>
            ) : viewError ? (
              <span className="form-hint">{viewError}</span>
            ) : viewDrink ? (
              <div>
                <div><strong>Title:</strong> {viewDrink.title}</div>
                {viewDrink.ingredients?.length > 0 && (
                  <div>
                    <strong>Ingredients:</strong>
                    <ul>
                      {viewDrink.ingredients.map((ing, i) => (
                        <li key={i}>{ing.title} {ing.volume && `(${ing.volume})`}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {viewDrink.instructions?.length > 0 && (
                  <div>
                    <strong>Instructions:</strong>
                    <ol>
                      {viewDrink.instructions.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <span className="form-hint">Select a language to preview translation.</span>
            )}
          </div>
        </div>
      )}

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
