import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, UtensilsCrossed, Tags, Download, Loader, Upload } from 'lucide-react';
import { getAvailableLanguages, downloadDbFile, downloadJsonForLanguage, importJson } from '../services/api';

export function Dashboard() {
  const [languages, setLanguages] = useState<{ code: string }[]>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'db' | 'json' | null>(null);
  const [importing, setImporting] = useState(false);
  const [importLang, setImportLang] = useState('en');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      await importJson(file, importLang);
      await getAvailableLanguages().then(setLanguages);
      e.target.value = '';
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to import JSON');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="dashboard">
      <h2>Home</h2>
      <div className="dashboard-actions">
        <label className="dashboard-import-lang">
          Import as:
          <select
            value={importLang}
            onChange={(e) => setImportLang(e.target.value)}
            disabled={importing}
          >
            <option value="en">Main (en)</option>
            {languages.filter((l) => l.code !== 'en').map((l) => (
              <option key={l.code} value={l.code}>{l.code}</option>
            ))}
          </select>
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="dashboard-file-input"
          onChange={handleFileChange}
          disabled={importing}
        />
        <button
          type="button"
          onClick={handleImportClick}
          disabled={importing}
          className="btn-secondary"
        >
          {importing ? <Loader size={16} className="spinner" /> : <Upload size={16} />}
          Import JSON
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
                Export JSON for selected languages
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
