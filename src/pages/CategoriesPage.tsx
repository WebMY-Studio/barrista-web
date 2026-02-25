import React, { useState, useEffect } from 'react';
import { ItemCategory } from '../types';
import { getAllCategories, saveCategory, deleteCategory } from '../services/api';
import { Plus, Edit, Trash2, Download } from 'lucide-react';

export function CategoriesPage() {
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ItemCategory | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ id: '', title: '' });

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

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ categories, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
        <button type="button" onClick={handleExportJson} disabled={categories.length === 0} className="btn-primary">
          <Download size={16} /> Export JSON
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
