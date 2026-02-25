import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, UtensilsCrossed, Tags, Download, Loader } from 'lucide-react';
import { getAvailableLanguages, downloadDbFile, downloadJsonForLanguage } from '../services/api';

export function Dashboard() {
  const [languages, setLanguages] = useState<{ code: string }[]>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'db' | 'json' | null>(null);

  useEffect(() => {
    getAvailableLanguages()
      .then(setLanguages)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const toggleLang = (code: string) => {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => setSelectedLangs(languages.map((l) => l.code));
  const selectNone = () => setSelectedLangs([]);

  const handleExportDatabases = async () => {
    if (selectedLangs.length === 0) {
      alert('Select at least one language.');
      return;
    }
    setExporting('db');
    try {
      for (const lang of selectedLangs) {
        await downloadDbFile(lang);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to download database(s). Is the server running?');
    } finally {
      setExporting(null);
    }
  };

  const handleExportJsons = async () => {
    if (selectedLangs.length === 0) {
      alert('Select at least one language.');
      return;
    }
    setExporting('json');
    try {
      for (const lang of selectedLangs) {
        await downloadJsonForLanguage(lang);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to export JSON(s). Is the server running?');
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="dashboard">
      <h2>Home</h2>
      <div className="dashboard-actions">
        <button type="button" onClick={() => downloadDbFile()} className="btn-secondary">
          <Download size={16} /> Download main SQLite database (EN)
        </button>
      </div>
      <div className="dashboard-languages">
        <h3>Languages (by existing database)</h3>
        {loading ? (
          <p className="dashboard-loading"><Loader size={16} className="spinner" /> Loading…</p>
        ) : languages.length === 0 ? (
          <p className="form-hint">No language databases found. The main DB (en) appears after first run.</p>
        ) : (
          <>
            <div className="dashboard-lang-actions">
              <button type="button" onClick={selectAll} className="btn-secondary">Select all</button>
              <button type="button" onClick={selectNone} className="btn-secondary">Clear</button>
            </div>
            <div className="dashboard-lang-checkboxes">
              {languages.map((l) => (
                <label key={l.code} className="dashboard-lang-check">
                  <input
                    type="checkbox"
                    checked={selectedLangs.includes(l.code)}
                    onChange={() => toggleLang(l.code)}
                  />
                  <span>{l.code}</span>
                </label>
              ))}
            </div>
            <div className="dashboard-lang-buttons">
              <button
                type="button"
                onClick={handleExportDatabases}
                disabled={exporting !== null || selectedLangs.length === 0}
                className="btn-primary"
              >
                {exporting === 'db' ? <Loader size={16} className="spinner" /> : <Download size={16} />}
                Export selected databases
              </button>
              <button
                type="button"
                onClick={handleExportJsons}
                disabled={exporting !== null || selectedLangs.length === 0}
                className="btn-primary"
              >
                {exporting === 'json' ? <Loader size={16} className="spinner" /> : <Download size={16} />}
                Export JSONs for selected languages
              </button>
            </div>
          </>
        )}
      </div>
      <div className="dashboard-cards">
        <Link to="/drinks" className="dashboard-card">
          <Coffee size={32} />
          <span>Drinks</span>
          <p>Coffee and drink recipes</p>
        </Link>
        <Link to="/dishes" className="dashboard-card">
          <UtensilsCrossed size={32} />
          <span>Dishes</span>
          <p>Dish types and volumes</p>
        </Link>
        <Link to="/categories" className="dashboard-card">
          <Tags size={32} />
          <span>Categories</span>
          <p>Drink categories</p>
        </Link>
      </div>
    </div>
  );
}
