import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { Dish } from '../types';
import { getAllDishes, saveDish, deleteDish, getDishImageUrl, uploadDishPhoto } from '../services/api';
import { Plus, Edit, Trash2, Upload, Loader } from 'lucide-react';

const DISH_PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88"><rect width="88" height="88" fill="#e8e8e8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="11" font-family="sans-serif">No photo</text></svg>'
);

export function DishesPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Dish | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Dish>({ id: '', title: '', description: '', volume: '' });
  const [photoKey, setPhotoKey] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllDishes()
      .then(setDishes)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editing) setForm(editing);
    else setForm({ id: '', title: '', description: '', volume: '' });
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
      await uploadDishPhoto(form.id, file);
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
      await saveDish(form);
      if (editing) {
        setDishes(dishes.map((d) => (d.id === form.id ? form : d)));
      } else {
        setDishes([...dishes, form]);
      }
      setShowForm(false);
      setEditing(undefined);
    } catch (err) {
      console.error(err);
      alert('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this dish?')) return;
    try {
      await deleteDish(id);
      setDishes(dishes.filter((d) => d.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete');
    }
  };

  return (
    <div className="page-content page-dishes">
      <div className="toolbar">
        <button
          onClick={() => {
            setEditing(undefined);
            setForm({ id: '', title: '', description: '', volume: '' });
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} /> Add dish
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
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label>Volume</label>
              <input
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
              />
            </div>
            {form.id && (
              <div className="form-group form-group-photo">
                <label>Photo</label>
                <div className="drink-form-photo">
                  <img
                    src={getDishImageUrl(form.id) + (photoKey ? `?t=${photoKey}` : '')}
                    alt=""
                    className="drink-form-photo-preview"
                    onError={(e) => { e.currentTarget.src = DISH_PLACEHOLDER; }}
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
                onClick={() => {
                  setShowForm(false);
                  setEditing(undefined);
                }}
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
        <div className="dish-list">
          {dishes.length === 0 ? (
            <div className="empty-state">No dishes. Add your first one.</div>
          ) : (
            dishes.map((d) => (
              <div key={d.id} className="dish-card">
                <img
                  src={getDishImageUrl(d.id)}
                  alt=""
                  className="dish-card-image"
                  onError={(e) => { e.currentTarget.src = DISH_PLACEHOLDER; }}
                />
                <div className="dish-card-main">
                  <span className="dish-id">{d.id}</span>
                  <h3 className="dish-title">{d.title}</h3>
                  {d.volume && <span className="dish-volume">{d.volume}</span>}
                  {d.description && <p className="dish-desc">{d.description}</p>}
                </div>
                <div className="drink-card-actions">
                  <button onClick={() => { setEditing(d); setShowForm(true); }} className="btn-icon" title="Edit" type="button">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(d.id)} className="btn-icon btn-danger" title="Delete">
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
