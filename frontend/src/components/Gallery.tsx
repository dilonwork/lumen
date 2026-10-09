import { useCallback, useEffect, useState } from "react";
import { formatBytes, listImages } from "../api";
import type { ImageItem } from "../types";
import Lightbox from "./Lightbox";

interface Props {
  refreshKey: number;
}

export default function Gallery({ refreshKey }: Props) {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<ImageItem | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError("");
    try {
      setImages(await listImages(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => load(query), 350);
    return () => clearTimeout(t);
  }, [query, load]);

  return (
    <section className="panel">
      <div className="gallery-head">
        <h2>Browse MinIO</h2>
        <input
          className="search"
          placeholder="Search by filename…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {loading && <p className="muted">Loading…</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && images.length === 0 && (
        <p className="muted">No images yet — upload some above.</p>
      )}
      <div className="grid">
        {images.map((img) => (
          <button key={img.object_name} className="thumb" onClick={() => setSelected(img)}>
            <img src={img.url} alt={img.filename} loading="lazy" />
            <span className="thumb-name">{img.filename}</span>
          </button>
        ))}
      </div>
      {selected && (
        <Lightbox
          img={selected}
          onClose={() => setSelected(null)}
          meta={`${formatBytes(selected.size)} · ${selected.content_type}`}
        />
      )}
    </section>
  );
}
