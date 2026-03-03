import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { ItemCategory } from '../types';
import { getAllCategories, saveCategory, deleteCategory, getCategoryImageUrl, uploadCategoryPhoto } from '../services/api';
import { Plus, Edit, Trash2, Upload, Loader } from 'lucide-react';

const CATEGORY_PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88"><rect width="88" height="88" fill="#e8e8e8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="11" font-family="sans-serif">No photo</text></svg>'
);

export function CategoriesPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ItemCategory | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: '', title: '' });
  const [photoKey, setPhotoKey] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllCategories()
      .then(setCategories)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editing) setForm({ id: editing.id, title: editing.title });
    else setForm({ id: '', title: '' });
  }, [editing]);

  useEffect(() => {
    if (showForm) window.scrollTo(0, 0);
  }, [showForm]);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form.id) return;
    if (file.type !== 'image/jpeg') {
      alert('Only JPG is supported.');
      e.target.value = '';
      return;
    }
    setUploadingPhoto(true);
    try {
      await uploadCategoryPhoto(form.id, file);
      setPhotoKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await saveCategory(form);
      const next = await getAllCategories();
      setCategories(next);
      setShowForm(false);
      setEditing(undefined);
    } catch (err) {
      console.error(err);
      alert('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete');
    }
  };

  return (
    <div className="page-content page-categories">
      <div className="toolbar">
        <button
          onClick={() => {
            setEditing(undefined);
            setForm({ id: '', title: '' });
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} /> Add category
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <form onSubmit={handleSubmit} className="drink-form">
            <div className="form-group">
              <label>ID</label>
              <input
                value={form.id}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                required
                disabled={!!editing}
              />
            </div>
            <div className="form-group">
              <label>Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            {form.id && (
              <div className="form-group form-group-photo">
                <label>Photo</label>
                <div className="drink-form-photo">
                  <img
                    src={getCategoryImageUrl(form.id) + (photoKey ? `?t=${photoKey}` : '')}
                    alt=""
                    className="drink-form-photo-preview"
                    onError={(e) => { e.currentTarget.src = CATEGORY_PLACEHOLDER; }}
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
            <div className="form-actions">
              <button type="submit" className="btn-primary">
                Save
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditing(undefined); }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : (
        <div className="category-list">
          {categories.length === 0 ? (
            <div className="empty-state">No categories. Add your first one.</div>
          ) : (
            categories.map((c) => (
              <div key={c.id} className="category-card">
                <img
                  src={getCategoryImageUrl(c.id)}
                  alt=""
                  className="category-card-image"
                  onError={(e) => { e.currentTarget.src = CATEGORY_PLACEHOLDER; }}
                />
                <div className="dish-card-main">
                  <span className="dish-id">{c.id}</span>
                  <h3 className="dish-title">{c.title}</h3>
                  <span className="category-count">Drinks: {c.drinksCount}</span>
                </div>
                <div className="drink-card-actions">
                  <button type="button" onClick={() => { setEditing(c); setShowForm(true); }} className="btn-icon" title="Edit">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(c.id)} className="btn-icon btn-danger" title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
