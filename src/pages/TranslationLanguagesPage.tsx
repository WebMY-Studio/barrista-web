import { useState, useEffect } from 'react';
import { getTranslationLanguages, saveTranslationLanguages, type TranslationLanguageOption } from '../services/api';
import { Plus, Trash2, Loader } from 'lucide-react';

export function TranslationLanguagesPage() {
  const [list, setList] = useState<TranslationLanguageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTranslationLanguages()
      .then(setList)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const addRow = () => {
    setList((prev) => [...prev, { code: '', label: '' }]);
  };

  const removeRow = (index: number) => {
    setList((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: 'code' | 'label', value: string) => {
    setList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: field === 'code' ? value.trim().toLowerCase() : value.trim() };
      return next;
    });
  };

  const handleSave = async () => {
    const valid = list.filter((x) => x.code && x.label);
    if (valid.length !== list.length) {
      alert('Each language must have both code and label (English name).');
      return;
    }
    const codes = new Set<string>();
    for (const x of valid) {
      if (codes.has(x.code)) {
        alert(`Duplicate code: ${x.code}`);
        return;
      }
      codes.add(x.code);
    }
    setSaving(true);
    try {
      const saved = await saveTranslationLanguages(valid);
      setList(saved);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content">
        <p><Loader size={20} className="spinner" /> Loading…</p>
      </div>
    );
  }

  return (
    <div className="page-content page-translation-languages">
      <h2>Translation languages</h2>
      <p className="form-hint">
        These languages appear in the Dashboard translation selector. Use English names for labels (e.g. Russian, Spanish).
      </p>
      <div className="translation-languages-toolbar">
        <button type="button" onClick={addRow} className="btn-primary">
          <Plus size={18} /> Add language
        </button>
        <button type="button" onClick={handleSave} disabled={saving || list.length === 0} className="btn-primary">
          {saving ? <Loader size={18} className="spinner" /> : null}
          Save
        </button>
      </div>
      <div className="translation-languages-list">
        {list.length === 0 ? (
          <p className="form-hint">No languages. Click &quot;Add language&quot; then fill code (e.g. ru, es) and label (e.g. Russian, Spanish).</p>
        ) : (
          <table className="translation-languages-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Label (English name)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="text"
                      value={item.code}
                      onChange={(e) => updateRow(index, 'code', e.target.value)}
                      placeholder="e.g. ru"
                      className="translation-lang-code"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => updateRow(index, 'label', e.target.value)}
                      placeholder="e.g. Russian"
                      className="translation-lang-label"
                    />
                  </td>
                  <td>
                    <button type="button" onClick={() => removeRow(index)} className="btn-remove" title="Remove">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
