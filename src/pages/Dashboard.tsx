import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, UtensilsCrossed, Tags, Download, Loader, Upload, ImagePlus } from 'lucide-react';
import { getAvailableLanguages, downloadDbFile, downloadJsonForLanguage, importJson, importDrinkImages, importCategoryImages, importDishImages, importBrewMethodImages, downloadAllImages } from '../services/api';

export function Dashboard() {
  const [languages, setLanguages] = useState<{ code: string }[]>([]);
  const [selectedLangs, setSelectedLangs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'db' | 'json' | null>(null);
  const [importing, setImporting] = useState(false);
  const [importingImages, setImportingImages] = useState(false);
  const [importingCategoryImages, setImportingCategoryImages] = useState(false);
  const [importingDishImages, setImportingDishImages] = useState(false);
  const [importingBrewMethodImages, setImportingBrewMethodImages] = useState(false);
  const [downloadingAllImages, setDownloadingAllImages] = useState(false);
  const [importLang, setImportLang] = useState('en');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imagesInputRef = useRef<HTMLInputElement>(null);
  const categoryImagesInputRef = useRef<HTMLInputElement>(null);
  const dishImagesInputRef = useRef<HTMLInputElement>(null);
  const brewMethodImagesInputRef = useRef<HTMLInputElement>(null);

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
  const handleImportImagesClick = () => imagesInputRef.current?.click();
  const handleImportCategoryImagesClick = () => categoryImagesInputRef.current?.click();
  const handleImportDishImagesClick = () => dishImagesInputRef.current?.click();
  const handleImportBrewMethodImagesClick = () => brewMethodImagesInputRef.current?.click();

  const handleBrewMethodImagesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setImportingBrewMethodImages(true);
    try {
      const { saved, total } = await importBrewMethodImages(files);
      alert(`Imported ${saved} of ${total} images. Use filenames brew_<id>.png`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to import brew method images');
    } finally {
      setImportingBrewMethodImages(false);
      e.target.value = '';
    }
  };

  const handleDishImagesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setImportingDishImages(true);
    try {
      const { saved, total } = await importDishImages(files);
      alert(`Imported ${saved} of ${total} images. Use filenames dish_<id>.png`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to import dish images');
    } finally {
      setImportingDishImages(false);
      e.target.value = '';
    }
  };

  const handleDownloadAllImages = async () => {
    setDownloadingAllImages(true);
    try {
      await downloadAllImages();
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to download images');
    } finally {
      setDownloadingAllImages(false);
    }
  };

  const handleCategoryImagesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setImportingCategoryImages(true);
    try {
      const { saved, total } = await importCategoryImages(files);
      alert(`Imported ${saved} of ${total} images. Use filenames category_<id>.png`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to import category images');
    } finally {
      setImportingCategoryImages(false);
      e.target.value = '';
    }
  };

  const handleImagesChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setImportingImages(true);
    try {
      const { saved, total } = await importDrinkImages(files);
      alert(`Imported ${saved} of ${total} images. Use filenames drink_<id>.jpg`);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to import images');
    } finally {
      setImportingImages(false);
      e.target.value = '';
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
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
      <div className="dashboard-block dashboard-json">
        <h3>JSON</h3>
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
          <h4>Languages (for export)</h4>
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
      </div>
      <div className="dashboard-block dashboard-images">
        <h3>Images</h3>
        <div className="dashboard-actions">
          <input
            ref={imagesInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            className="dashboard-file-input"
            onChange={handleImagesChange}
            disabled={importingImages}
          />
          <button
            type="button"
            onClick={handleImportImagesClick}
            disabled={importingImages}
            className="btn-secondary"
          >
            {importingImages ? <Loader size={16} className="spinner" /> : <ImagePlus size={16} />}
            Import drink images
          </button>
          <input
            ref={categoryImagesInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            className="dashboard-file-input"
            onChange={handleCategoryImagesChange}
            disabled={importingCategoryImages}
          />
          <button
            type="button"
            onClick={handleImportCategoryImagesClick}
            disabled={importingCategoryImages}
            className="btn-secondary"
          >
            {importingCategoryImages ? <Loader size={16} className="spinner" /> : <ImagePlus size={16} />}
            Import category images
          </button>
          <input
            ref={dishImagesInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            className="dashboard-file-input"
            onChange={handleDishImagesChange}
            disabled={importingDishImages}
          />
          <button
            type="button"
            onClick={handleImportDishImagesClick}
            disabled={importingDishImages}
            className="btn-secondary"
          >
            {importingDishImages ? <Loader size={16} className="spinner" /> : <ImagePlus size={16} />}
            Import dish images
          </button>
          <input
            ref={brewMethodImagesInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            multiple
            className="dashboard-file-input"
            onChange={handleBrewMethodImagesChange}
            disabled={importingBrewMethodImages}
          />
          <button
            type="button"
            onClick={handleImportBrewMethodImagesClick}
            disabled={importingBrewMethodImages}
            className="btn-secondary"
          >
            {importingBrewMethodImages ? <Loader size={16} className="spinner" /> : <ImagePlus size={16} />}
            Import brew method images
          </button>
          <button
            type="button"
            onClick={handleDownloadAllImages}
            disabled={downloadingAllImages}
            className="btn-secondary"
          >
            {downloadingAllImages ? <Loader size={16} className="spinner" /> : <Download size={16} />}
            Download all images
          </button>
        </div>
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
        <Link to="/brew-methods" className="dashboard-card">
          <Coffee size={32} />
          <span>Brew methods</span>
          <p>Coffee brewing methods</p>
        </Link>
      </div>
    </div>
  );
}
