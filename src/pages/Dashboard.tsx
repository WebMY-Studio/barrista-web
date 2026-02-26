import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, UtensilsCrossed, Tags, Download, Loader, Upload, ImagePlus } from 'lucide-react';
import { getAvailableLanguages, downloadDbFile, downloadJsonForLanguage, importJson, importDrinkImages, importCategoryImages, importDishImages, importBrewMethodImages, downloadAllImages, startTranslation, getTranslationLanguages, getTranslationProgress, checkTranslationIntegrity, type TranslationLanguageOption, type TranslationProgress } from '../services/api';

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
  const [translationLang, setTranslationLang] = useState('es');
  const [translationBrewMethods, setTranslationBrewMethods] = useState(true);
  const [translationDrinks, setTranslationDrinks] = useState(true);
  const [translationCategories, setTranslationCategories] = useState(true);
  const [translationDishes, setTranslationDishes] = useState(true);
  const [translationOverride, setTranslationOverride] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationLanguages, setTranslationLanguages] = useState<TranslationLanguageOption[]>([]);
  const [translationProgress, setTranslationProgress] = useState<TranslationProgress | null>(null);
  const [integrityLog, setIntegrityLog] = useState<string | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const translationProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  useEffect(() => {
    getTranslationLanguages()
      .then(setTranslationLanguages)
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (translationLanguages.length > 0 && !translationLanguages.some((l) => l.code === translationLang)) {
      setTranslationLang(translationLanguages[0].code);
    }
  }, [translationLanguages, translationLang]);

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

  const handleStartTranslation = async () => {
    if (!translationBrewMethods && !translationDrinks && !translationCategories && !translationDishes) {
      alert('Select at least one: Brew methods, Drinks, Categories, Dishes');
      return;
    }
    setTranslationProgress(null);
    setTranslating(true);
    translationProgressIntervalRef.current = setInterval(async () => {
      try {
        const p = await getTranslationProgress();
        if (p) setTranslationProgress(p);
      } catch {
        // ignore
      }
    }, 1500);
    try {
      const result = await startTranslation({
        lang: translationLang,
        brewMethods: translationBrewMethods,
        drinks: translationDrinks,
        categories: translationCategories,
        dishes: translationDishes,
        overrideExisting: translationOverride,
      });
      if (translationProgressIntervalRef.current) {
        clearInterval(translationProgressIntervalRef.current);
        translationProgressIntervalRef.current = null;
      }
      setTranslationProgress({ done: true, counts: result.counts });
      await getAvailableLanguages().then(setLanguages);
      const msg = `Translation to ${translationLang} done. Categories: ${result.counts.categories}, Dishes: ${result.counts.dishes}, Drinks: ${result.counts.drinks}, Brew methods: ${result.counts.brewMethods}`;
      alert(msg);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      if (translationProgressIntervalRef.current) {
        clearInterval(translationProgressIntervalRef.current);
        translationProgressIntervalRef.current = null;
      }
      setTranslating(false);
    }
  };

  const handleCheckIntegrity = async () => {
    setIntegrityLoading(true);
    setIntegrityLog(null);
    try {
      const { log } = await checkTranslationIntegrity();
      setIntegrityLog(log);
      const blob = new Blob([log], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'translation-integrity-report.txt';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setIntegrityLoading(false);
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
              {translationLanguages
                .filter((l) => l.code !== 'en')
                .map((l) => (
                  <option key={l.code} value={l.code}>{l.label} ({l.code})</option>
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
                <button
                  type="button"
                  onClick={handleCheckIntegrity}
                  disabled={integrityLoading}
                  className="btn-secondary"
                >
                  {integrityLoading ? <Loader size={16} className="spinner" /> : <Download size={16} />}
                  Check translation integrity
                </button>
              </div>
              {integrityLog !== null && (
                <div className="dashboard-integrity-log">
                  <pre className="dashboard-integrity-pre">{integrityLog}</pre>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([integrityLog], { type: 'text/plain;charset=utf-8' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'translation-integrity-report.txt';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="btn-secondary"
                  >
                    <Download size={16} /> Download log
                  </button>
                </div>
              )}
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
      <div className="dashboard-block dashboard-translations">
        <h3>Translations</h3>
        <div className="dashboard-translations-row">
          <div className="dashboard-translations-checkboxes">
            <label className="dashboard-lang-check">
              <input
                type="checkbox"
                checked={translationBrewMethods}
                onChange={(e) => setTranslationBrewMethods(e.target.checked)}
                disabled={translating}
              />
              <span>Brew methods</span>
            </label>
            <label className="dashboard-lang-check">
              <input
                type="checkbox"
                checked={translationDrinks}
                onChange={(e) => setTranslationDrinks(e.target.checked)}
                disabled={translating}
              />
              <span>Drinks</span>
            </label>
            <label className="dashboard-lang-check">
              <input
                type="checkbox"
                checked={translationCategories}
                onChange={(e) => setTranslationCategories(e.target.checked)}
                disabled={translating}
              />
              <span>Categories</span>
            </label>
            <label className="dashboard-lang-check">
              <input
                type="checkbox"
                checked={translationDishes}
                onChange={(e) => setTranslationDishes(e.target.checked)}
                disabled={translating}
              />
              <span>Dishes</span>
            </label>
          </div>
        </div>
        <div className="dashboard-translations-row">
          <label className="dashboard-translations-lang-label">
            Language:
            <select
              value={translationLang}
              onChange={(e) => setTranslationLang(e.target.value)}
              disabled={translating}
              className="dashboard-translations-select"
            >
              {translationLanguages.length === 0 ? (
                <option value="">—</option>
              ) : (
                translationLanguages.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))
              )}
            </select>
          </label>
          <label className="dashboard-lang-check">
            <input
              type="checkbox"
              checked={translationOverride}
              onChange={(e) => setTranslationOverride(e.target.checked)}
              disabled={translating}
            />
            <span>Override existing</span>
          </label>
        </div>
        <div className="dashboard-translations-row dashboard-translations-actions">
          <button
            type="button"
            onClick={handleStartTranslation}
            disabled={translating || translationLanguages.length === 0 || (!translationBrewMethods && !translationDrinks && !translationCategories && !translationDishes)}
            className="btn-primary"
          >
            {translating ? <Loader size={16} className="spinner" /> : null}
            Start translation
          </button>
          {(translating || translationProgress) && (
            <span className="dashboard-translation-progress">
              {translationProgress?.done ? (
                <>Done. Categories: {translationProgress.counts?.categories ?? 0}, Dishes: {translationProgress.counts?.dishes ?? 0}, Drinks: {translationProgress.counts?.drinks ?? 0}, Brew methods: {translationProgress.counts?.brewMethods ?? 0}</>
              ) : translationProgress?.step ? (
                <>Translating: {translationProgress.step} {translationProgress.current ?? 0}/{translationProgress.total ?? 0}</>
              ) : (
                <>Starting…</>
              )}
            </span>
          )}
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
