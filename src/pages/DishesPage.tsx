import React, { useState, useEffect } from 'react';
import { Dish } from '../types';
import { getAllDishes, saveDish, deleteDish } from '../services/api';
import { Plus, Edit, Trash2, Download } from 'lucide-react';

export function DishesPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Dish | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Dish>({ id: '', title: '', description: '', volume: '' });

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

  const handleSubmit = async (e: React.FormEvent) => {
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

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify({ dishes, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dishes-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
        <button type="button" onClick={handleExportJson} disabled={dishes.length === 0} className="btn-primary">
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
