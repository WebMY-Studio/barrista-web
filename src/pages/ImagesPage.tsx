import { useState, useEffect } from 'react';
import { listImages, deleteImage, getImageUrl } from '../services/api';
import { Trash2, Loader } from 'lucide-react';

export function ImagesPage() {
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    listImages()
      .then((data) => setImages(data.images || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;
    setDeleting(filename);
    try {
      await deleteImage(filename);
      setImages((prev) => prev.filter((f) => f !== filename));
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(null);
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
    <div className="page-content page-images">
      <h2>Images</h2>
      <p className="form-hint">
        All images from <code>server/data/images/</code>. Delete to remove from the server.
      </p>
      {images.length === 0 ? (
        <p className="form-hint">No images.</p>
      ) : (
        <ul className="images-list">
          {images.map((filename) => (
            <li key={filename} className="images-list-item">
              <img
                src={getImageUrl(filename)}
                alt=""
                className="images-list-preview"
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <span className="images-list-name">{filename}</span>
              <button
                type="button"
                onClick={() => handleDelete(filename)}
                disabled={deleting !== null}
                className="btn-secondary images-list-delete"
                title="Delete"
              >
                {deleting === filename ? <Loader size={16} className="spinner" /> : <Trash2 size={16} />}
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
