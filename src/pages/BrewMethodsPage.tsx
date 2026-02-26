import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { BrewMethod, MainInfo } from '../types';
import { getAllBrewMethods, saveBrewMethod, deleteBrewMethod, getBrewMethodImageUrl, uploadBrewMethodPhoto } from '../services/api';
import { Plus, Edit, Trash2, Upload, Loader, X } from 'lucide-react';

const BREW_PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="88" height="88" viewBox="0 0 88 88"><rect width="88" height="88" fill="#e8e8e8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="11" font-family="sans-serif">No photo</text></svg>'
);

const defaultInfo: MainInfo = { coffee: '', water: '', temperature: '', time: '' };

export function BrewMethodsPage() {
  const [methods, setMethods] = useState<BrewMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<BrewMethod | undefined>();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<BrewMethod>({
    id: '',
    title: '',
    description: '',
    info: { ...defaultInfo },
    howToPrepare: [],
    proTips: [],
    commonMistakes: [],
  });
  const [newStep, setNewStep] = useState('');
  const [newTip, setNewTip] = useState('');
  const [newMistake, setNewMistake] = useState('');
  const [photoKey, setPhotoKey] = useState(0);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getAllBrewMethods()
      .then(setMethods)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (editing) setForm(editing);
    else setForm({
      id: '',
      title: '',
      description: '',
      info: { ...defaultInfo },
      howToPrepare: [],
      proTips: [],
      commonMistakes: [],
    });
  }, [editing]);

  useEffect(() => {
    if (showForm) window.scrollTo(0, 0);
  }, [showForm]);

  const handlePhotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !form.id) return;
    setUploadingPhoto(true);
    try {
      await uploadBrewMethodPhoto(form.id, file);
      setPhotoKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const addList = (key: 'howToPrepare' | 'proTips' | 'commonMistakes', value: string) => {
    if (!value.trim()) return;
    setForm({ ...form, [key]: [...form[key], value.trim()] });
    if (key === 'howToPrepare') setNewStep('');
    if (key === 'proTips') setNewTip('');
    if (key === 'commonMistakes') setNewMistake('');
  };

  const removeList = (key: 'howToPrepare' | 'proTips' | 'commonMistakes', index: number) => {
    setForm({ ...form, [key]: form[key].filter((_, i) => i !== index) });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await saveBrewMethod(form);
      const next = await getAllBrewMethods();
      setMethods(next);
      setShowForm(false);
      setEditing(undefined);
    } catch (err) {
      console.error(err);
      alert('Failed to save');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this brew method?')) return;
    try {
      await deleteBrewMethod(id);
      setMethods(methods.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
      alert('Failed to delete');
    }
  };

  return (
    <div className="page-content page-brew-methods">
      <div className="toolbar">
        <button
          onClick={() => {
            setEditing(undefined);
            setShowForm(true);
          }}
          className="btn-primary"
        >
          <Plus size={18} /> Add brew method
        </button>
      </div>

      {showForm && (
        <div className="form-container">
          <form onSubmit={handleSubmit} className="drink-form brew-method-form">
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
            {form.id && (
              <div className="form-group form-group-photo">
                <label>Photo</label>
                <div className="drink-form-photo">
                  <img
                    src={getBrewMethodImageUrl(form.id) + (photoKey ? `?t=${photoKey}` : '')}
                    alt=""
                    className="drink-form-photo-preview"
                    onError={(e) => { e.currentTarget.src = BREW_PLACEHOLDER; }}
                  />
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
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
              <label>Main info</label>
              <div className="brew-info-grid">
                <input
                  placeholder="Coffee"
                  value={form.info.coffee}
                  onChange={(e) => setForm({ ...form, info: { ...form.info, coffee: e.target.value } })}
                />
                <input
                  placeholder="Water"
                  value={form.info.water}
                  onChange={(e) => setForm({ ...form, info: { ...form.info, water: e.target.value } })}
                />
                <input
                  placeholder="Temperature"
                  value={form.info.temperature}
                  onChange={(e) => setForm({ ...form, info: { ...form.info, temperature: e.target.value } })}
                />
                <input
                  placeholder="Time"
                  value={form.info.time}
                  onChange={(e) => setForm({ ...form, info: { ...form.info, time: e.target.value } })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>How to prepare</label>
              <div className="list-editor">
                {form.howToPrepare.map((step, i) => (
                  <div key={i} className="list-editor-item">
                    <span>{i + 1}. {step}</span>
                    <button type="button" onClick={() => removeList('howToPrepare', i)} className="btn-remove"><X size={14} /></button>
                  </div>
                ))}
                <div className="add-item">
                  <input value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="New step" />
                  <button type="button" onClick={() => addList('howToPrepare', newStep)} className="btn-add">Add</button>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Pro tips</label>
              <div className="list-editor">
                {form.proTips.map((tip, i) => (
                  <div key={i} className="list-editor-item">
                    <span>{tip}</span>
                    <button type="button" onClick={() => removeList('proTips', i)} className="btn-remove"><X size={14} /></button>
                  </div>
                ))}
                <div className="add-item">
                  <input value={newTip} onChange={(e) => setNewTip(e.target.value)} placeholder="New tip" />
                  <button type="button" onClick={() => addList('proTips', newTip)} className="btn-add">Add</button>
                </div>
              </div>
            </div>
            <div className="form-group">
              <label>Common mistakes</label>
              <div className="list-editor">
                {form.commonMistakes.map((m, i) => (
                  <div key={i} className="list-editor-item">
                    <span>{m}</span>
                    <button type="button" onClick={() => removeList('commonMistakes', i)} className="btn-remove"><X size={14} /></button>
                  </div>
                ))}
                <div className="add-item">
                  <input value={newMistake} onChange={(e) => setNewMistake(e.target.value)} placeholder="New mistake" />
                  <button type="button" onClick={() => addList('commonMistakes', newMistake)} className="btn-add">Add</button>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" onClick={() => { setShowForm(false); setEditing(undefined); }} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-state">Loading…</div>
      ) : (
        <div className="brew-methods-list">
          {methods.length === 0 ? (
            <div className="empty-state">No brew methods. Add your first one.</div>
          ) : (
            methods.map((m) => (
              <div key={m.id} className="brew-method-card">
                <img
                  src={getBrewMethodImageUrl(m.id)}
                  alt=""
                  className="brew-method-card-image"
                  onError={(e) => { e.currentTarget.src = BREW_PLACEHOLDER; }}
                />
                <div className="dish-card-main">
                  <span className="dish-id">{m.id}</span>
                  <h3 className="dish-title">{m.title}</h3>
                  {m.description && <p className="brew-method-desc">{m.description.slice(0, 100)}{m.description.length > 100 ? '…' : ''}</p>}
                </div>
                <div className="drink-card-actions">
                  <button type="button" onClick={() => { setEditing(m); setShowForm(true); }} className="btn-icon" title="Edit">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => handleDelete(m.id)} className="btn-icon btn-danger" title="Delete">
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
