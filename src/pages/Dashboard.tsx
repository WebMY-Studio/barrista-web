import { useState, useEffect, useRef, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Coffee, UtensilsCrossed, Tags, Download, Loader, Upload, ImagePlus, Trash2 } from 'lucide-react';
import { getAvailableLanguages, downloadDbFile, downloadJsonForLanguage, importJson, importDrinkImages, importCategoryImages, importDishImages, importBrewMethodImages, downloadAllImages, startTranslation, stopTranslation, getTranslationLanguages, getTranslationProgress, checkTranslationIntegrity, deleteDatabase, getTranslationPromptExtra, saveTranslationPromptExtra, getTranslationModel, saveTranslationModel, type TranslationLanguageOption, type TranslationProgress } from '../services/api';

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
  const [selectedTranslationLangs, setSelectedTranslationLangs] = useState<string[]>([]);
  const [currentTranslationLang, setCurrentTranslationLang] = useState<string | null>(null);
  const [translationBrewMethods, setTranslationBrewMethods] = useState(true);
  const [translationDrinks, setTranslationDrinks] = useState(true);
  const [translationCategories, setTranslationCategories] = useState(true);
  const [translationDishes, setTranslationDishes] = useState(true);
  const [translationOverride, setTranslationOverride] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationLanguages, setTranslationLanguages] = useState<TranslationLanguageOption[]>([]);
  const [translationProgress, setTranslationProgress] = useState<TranslationProgress | null>(null);
  const [translationRunLog, setTranslationRunLog] = useState<string>('');
  const [integrityLog, setIntegrityLog] = useState<string | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [deleteLangs, setDeleteLangs] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [promptExtra, setPromptExtra] = useState('');
  const [promptExtraSaving, setPromptExtraSaving] = useState(false);
  const [translationModel, setTranslationModel] = useState('');
  const [translationModelOptions, setTranslationModelOptions] = useState<{ id: string; label: string }[]>([]);
  const [stopTranslationSaveResults, setStopTranslationSaveResults] = useState(true);
  const [stoppingTranslation, setStoppingTranslation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const translationProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const translationLogLineCountRef = useRef(0);
  const translationTargetsInitializedRef = useRef(false);
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

  // On mount: if a translation is already running (e.g. after refresh), show progress and Stop button
  useEffect(() => {
    let cancelled = false;
    getTranslationProgress()
      .then((p) => {
        if (cancelled || !p || p.done) return;
        setTranslating(true);
        setTranslationProgress(p);
        if (p.logLines?.length) {
          translationLogLineCountRef.current = p.logLines.length;
          setTranslationRunLog((prev) => (prev ? prev : `Translation in progress (reconnected).\n${(p.logLines ?? []).join('\n')}`));
        } else {
          setTranslationRunLog('Translation in progress (reconnected).');
        }
        translationProgressIntervalRef.current = setInterval(async () => {
          try {
            const next = await getTranslationProgress();
            if (next) {
              setTranslationProgress(next);
              if (next.logLines && next.logLines.length > translationLogLineCountRef.current) {
                const newLines = next.logLines.slice(translationLogLineCountRef.current);
                translationLogLineCountRef.current = next.logLines.length;
                setTranslationRunLog((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + newLines.join('\n'));
              }
              if (next.done) {
                if (translationProgressIntervalRef.current) {
                  clearInterval(translationProgressIntervalRef.current);
                  translationProgressIntervalRef.current = null;
                }
                setTranslating(false);
                setStoppingTranslation(false);
                if (next.logLines && next.logLines.length > translationLogLineCountRef.current) {
                  const newLines = next.logLines.slice(translationLogLineCountRef.current);
                  translationLogLineCountRef.current = next.logLines.length;
                  setTranslationRunLog((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + newLines.join('\n'));
                }
                const suffix = next.cancelled
                  ? (next.saved ? 'Stopped. Results saved to DB.' : 'Stopped. Changes discarded.')
                  : 'Done.';
                setTranslationRunLog((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + suffix);
              }
            }
          } catch {
            // ignore
          }
        }, 1500);
      })
      .catch((err) => console.error(err));
    return () => {
      cancelled = true;
      if (translationProgressIntervalRef.current) {
        clearInterval(translationProgressIntervalRef.current);
        translationProgressIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    getTranslationPromptExtra()
      .then(({ extra }) => setPromptExtra(extra))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    getTranslationModel()
      .then(({ model, options }) => {
        setTranslationModelOptions(options);
        const valid = options.some((m) => m.id === model);
        setTranslationModel(valid ? model : options[0]?.id ?? '');
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (translationLanguages.length === 0) return;
    // Ensure single-select value is valid (used only as fallback / legacy)
    if (!translationLanguages.some((l) => l.code === translationLang)) {
      setTranslationLang(translationLanguages[0].code);
    }
    // Initialize multi-select targets only once on first load
    if (!translationTargetsInitializedRef.current) {
      setSelectedTranslationLangs(translationLanguages.map((l) => l.code));
      translationTargetsInitializedRef.current = true;
    }
  }, [translationLanguages, translationLang]);

  const toggleLang = (code: string) => {
    setSelectedLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const selectAll = () => setSelectedLangs(languages.map((l) => l.code));
  const selectNone = () => setSelectedLangs([]);

  const toggleTranslationTargetLang = (code: string) => {
    setSelectedTranslationLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const checkIntegrityForSelected = async (): Promise<{ ok: boolean; log: string }> => {
    const { log } = await checkTranslationIntegrity();
    if (log === 'All good') return { ok: true, log };
    const translatedSelected = selectedLangs.filter((c) => c !== 'en');
    if (translatedSelected.length === 0) return { ok: true, log };
    const hasViolation = translatedSelected.some((code) => log.includes(`barrista_${code}.db:`));
    return { ok: !hasViolation, log };
  };

  const handleExportDatabases = async () => {
    if (selectedLangs.length === 0) {
      alert('Select at least one language.');
      return;
    }
    const integrity = await checkIntegrityForSelected();
    if (!integrity.ok) {
      alert(`Integrity check failed for selected DB(s). Export blocked.\n\n${integrity.log}`);
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
    const integrity = await checkIntegrityForSelected();
    if (!integrity.ok) {
      alert(`Integrity check failed for selected DB(s). Export blocked.\n\n${integrity.log}`);
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
      alert(`Imported ${saved} of ${total} images. Use filenames brew_<id>.jpg`);
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
      alert(`Imported ${saved} of ${total} images. Use filenames dish_<id>.jpg`);
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
      alert(`Imported ${saved} of ${total} images. Use filenames category_<id>.jpg`);
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
    if (selectedTranslationLangs.length === 0) {
      alert('Select at least one target language.');
      return;
    }
    if (!translationBrewMethods && !translationDrinks && !translationCategories && !translationDishes) {
      alert('Select at least one: Brew methods, Drinks, Categories, Dishes');
      return;
    }
    setTranslationProgress(null);
    setTranslating(true);
    setStoppingTranslation(false);
    setCurrentTranslationLang(null);
    const entities = [
      translationBrewMethods && 'brew_methods',
      translationDrinks && 'drinks',
      translationCategories && 'categories',
      translationDishes && 'dishes',
    ].filter(Boolean) as string[];
    const logStart = [
      `Translation started at ${new Date().toISOString()}`,
      `Target languages: ${selectedTranslationLangs.join(', ')}`,
      `Override existing: ${translationOverride}`,
      `Entities: ${entities.join(', ')}`,
      '',
    ].join('\n');
    setTranslationRunLog(logStart);
    translationLogLineCountRef.current = 0;

    translationProgressIntervalRef.current = setInterval(async () => {
      try {
        const p = await getTranslationProgress();
        if (p) {
          setTranslationProgress(p);
          if (p.logLines && p.logLines.length > translationLogLineCountRef.current) {
            const newLines = p.logLines.slice(translationLogLineCountRef.current);
            translationLogLineCountRef.current = p.logLines.length;
            setTranslationRunLog((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + newLines.join('\n'));
          }
        }
      } catch {
        // ignore
      }
    }, 1500);
    try {
      const result = await startTranslation({
        langs: selectedTranslationLangs,
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
      setTranslationProgress((prev) => ({
        ...prev,
        done: true,
        cancelled: result.cancelled,
        saved: result.saved,
        counts: result.counts,
      }));
      if (result.logLines && result.logLines.length > 0) {
        const from = Math.min(translationLogLineCountRef.current, result.logLines.length);
        const newLines = result.logLines.slice(from);
        if (newLines.length > 0) {
          setTranslationRunLog((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + newLines.join('\n'));
        }
        translationLogLineCountRef.current = result.logLines.length;
      }
      await getAvailableLanguages().then(setLanguages);
      const endMsg = result.cancelled
        ? (result.saved ? 'Stopped. Results saved to DB.' : 'Stopped. Changes discarded.')
        : 'Done.';
      setTranslationRunLog((prev) => prev + (prev.endsWith('\n') ? '' : '\n') + endMsg);
    } catch (err) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'Translation failed';
      setTranslationRunLog((prev) => prev + `Error: ${errMsg}`);
    } finally {
      if (translationProgressIntervalRef.current) {
        clearInterval(translationProgressIntervalRef.current);
        translationProgressIntervalRef.current = null;
      }
      setTranslating(false);
      setCurrentTranslationLang(null);
    }
  };

  const handleStopTranslation = async () => {
    setStoppingTranslation(true);
    try {
      const r = await stopTranslation(stopTranslationSaveResults);
      if (!r.ok) {
        setStoppingTranslation(false);
        alert(r.error || 'Failed to stop');
      }
    } catch (err) {
      console.error(err);
      setStoppingTranslation(false);
      alert(err instanceof Error ? err.message : 'Failed to stop');
    }
  };

  const handleCheckIntegrity = async () => {
    setIntegrityLoading(true);
    setIntegrityLog(null);
    try {
      const { log } = await checkTranslationIntegrity();
      setIntegrityLog(log);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setIntegrityLoading(false);
    }
  };

  const translatedLangs = languages.filter((l) => l.code !== 'en');

  const handleSavePromptExtra = async () => {
    setPromptExtraSaving(true);
    try {
      const { extra } = await saveTranslationPromptExtra(promptExtra);
      setPromptExtra(extra);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setPromptExtraSaving(false);
    }
  };

  const toggleDeleteLang = (code: string) => {
    setDeleteLangs((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleDeleteDatabase = async () => {
    if (deleteLangs.length === 0) return;
    if (!confirm(`Delete ${deleteLangs.length} database(s): ${deleteLangs.map((c) => `barrista_${c}.db`).join(', ')}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      for (const lang of deleteLangs) {
        await deleteDatabase(lang);
      }
      await getAvailableLanguages().then(setLanguages);
      setDeleteLangs([]);
      setIntegrityLog(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete database(s)');
    } finally {
      setDeleting(false);
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
              {translatedLangs.length > 0 && (
                <div className="dashboard-delete-db">
                  <span className="dashboard-delete-db-label">Delete translated DB:</span>
                  <div className="dashboard-delete-db-checkboxes">
                    {translatedLangs.map((l) => (
                      <label key={l.code} className="dashboard-lang-check">
                        <input
                          type="checkbox"
                          checked={deleteLangs.includes(l.code)}
                          onChange={() => toggleDeleteLang(l.code)}
                          disabled={deleting}
                        />
                        <span>barrista_{l.code}.db</span>
                      </label>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleDeleteDatabase}
                    disabled={deleting || deleteLangs.length === 0}
                    className="btn-secondary"
                  >
                    {deleting ? <Loader size={16} className="spinner" /> : <Trash2 size={16} />}
                    Delete
                  </button>
                </div>
              )}
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
        <div className="dashboard-prompt-extra">
          <label className="dashboard-prompt-extra-label">
            Extra instructions for translation (appended to default domain/terminology; output format is fixed):
          </label>
          <textarea
            value={promptExtra}
            onChange={(e) => setPromptExtra(e.target.value)}
            placeholder="e.g. Use formal tone. Prefer 'espresso' not 'expresso'. Keep measurement units as-is."
            rows={3}
            className="dashboard-prompt-extra-textarea"
          />
          <button
            type="button"
            onClick={handleSavePromptExtra}
            disabled={promptExtraSaving}
            className="btn-secondary"
          >
            {promptExtraSaving ? <Loader size={16} className="spinner" /> : null}
            Save prompt extra
          </button>
        </div>
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
            Model:
            <select
              value={translationModel}
              onChange={async (e) => {
                const v = e.target.value;
                if (!v) return;
                setTranslationModel(v);
                try {
                  await saveTranslationModel(v);
                } catch (err) {
                  console.error(err);
                  getTranslationModel().then(({ model }) => setTranslationModel(model));
                }
              }}
              disabled={translating || translationModelOptions.length === 0}
              className="dashboard-translations-select dashboard-translations-model-select"
            >
              {translationModelOptions.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>
          <div className="dashboard-translations-lang-multi">
            <div className="dashboard-translations-lang-multi-label">Target languages:</div>
            <div className="dashboard-translations-lang-multi-list">
              {translationLanguages.length === 0 ? (
                <span className="form-hint">No translation languages configured.</span>
              ) : (
                translationLanguages.map((l) => (
                  <label key={l.code} className="dashboard-lang-check">
                    <input
                      type="checkbox"
                      checked={selectedTranslationLangs.includes(l.code)}
                      onChange={() => toggleTranslationTargetLang(l.code)}
                      disabled={translating}
                    />
                    <span>{l.label}</span>
                  </label>
                ))
              )}
            </div>
          </div>
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
        {translationRunLog && (
          <div className="dashboard-integrity-log dashboard-translation-run-log">
            <pre className="dashboard-integrity-pre">{translationRunLog}</pre>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob([translationRunLog], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `translation-run-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn-secondary"
            >
              <Download size={16} /> Download log
            </button>
          </div>
        )}
        {(translating || translationProgress) && (
          <div className="dashboard-translations-row dashboard-translation-progress-row">
            <span className="dashboard-translation-progress">
              {translationProgress?.done ? (
                <>
                  {translationProgress.cancelled
                    ? (translationProgress.saved ? 'Stopped. Results saved to DB. ' : 'Stopped. Changes discarded. ')
                    : 'Done. '}
                  {(translationProgress?.currentLang ?? currentTranslationLang) ? `Language: ${translationProgress?.currentLang ?? currentTranslationLang}. ` : null}
                  Categories: {translationProgress.counts?.categories ?? 0}, Dishes: {translationProgress.counts?.dishes ?? 0}, Drinks: {translationProgress.counts?.drinks ?? 0}, Brew methods: {translationProgress.counts?.brewMethods ?? 0}
                </>
              ) : translationProgress?.step ? (
                <>
                  {(translationProgress?.currentLang ?? currentTranslationLang) ? `Language: ${translationProgress?.currentLang ?? currentTranslationLang} · ` : null}
                  Translating: {translationProgress.step === 'categories' ? 'Categories' : translationProgress.step === 'dishes' ? 'Dishes' : translationProgress.step === 'drinks' ? 'Drinks' : 'Brew methods'}{' '}
                  {translationProgress.current ?? 0}/{(translationProgress.total ?? 0) - (translationProgress.skipped ?? 0)}
                  {translationProgress.lastId != null && (
                    <> — {translationProgress.lastId} ({translationProgress.lastItemMs != null ? (translationProgress.lastItemMs >= 1000 ? `${(translationProgress.lastItemMs / 1000).toFixed(1)}s` : `${translationProgress.lastItemMs}ms`) : '?'})</>
                  )}
                  {translationProgress.etaSeconds != null && translationProgress.etaSeconds > 0 && <> · ETA: ~{translationProgress.etaSeconds}s</>}
                </>
              ) : (
                <>Starting…</>
              )}
            </span>
          </div>
        )}
        <div className="dashboard-translations-row dashboard-translations-actions">
          <button
            type="button"
            onClick={handleStartTranslation}
            disabled={translating || translationLanguages.length === 0 || (!translationBrewMethods && !translationDrinks && !translationCategories && !translationDishes)}
            className="btn-primary"
          >
            {translating && !stoppingTranslation ? <Loader size={16} className="spinner" /> : null}
            Start translation
          </button>
          {(translating || (translationProgress && !translationProgress.done)) && (
            <>
              <button
                type="button"
                onClick={handleStopTranslation}
                disabled={stoppingTranslation}
                className="btn-secondary"
                style={{ marginLeft: '0.5rem' }}
              >
                {stoppingTranslation ? <Loader size={16} className="spinner" /> : null}
                Stop translation
              </button>
              <label className="dashboard-lang-check" style={{ marginLeft: '0.5rem' }}>
                <input
                  type="checkbox"
                  checked={stopTranslationSaveResults}
                  onChange={(e) => setStopTranslationSaveResults(e.target.checked)}
                  disabled={stoppingTranslation}
                />
                <span>Save current results to DB (incl. partial block)</span>
              </label>
            </>
          )}
        </div>
      </div>
      <div className="dashboard-cards">
        <Link to="drinks" className="dashboard-card">
          <Coffee size={32} />
          <span>Drinks</span>
          <p>Coffee and drink recipes</p>
        </Link>
        <Link to="dishes" className="dashboard-card">
          <UtensilsCrossed size={32} />
          <span>Dishes</span>
          <p>Dish types and volumes</p>
        </Link>
        <Link to="categories" className="dashboard-card">
          <Tags size={32} />
          <span>Categories</span>
          <p>Drink categories</p>
        </Link>
        <Link to="brew-methods" className="dashboard-card">
          <Coffee size={32} />
          <span>Brew methods</span>
          <p>Coffee brewing methods</p>
        </Link>
      </div>
    </div>
  );
}
