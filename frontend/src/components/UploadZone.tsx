import { useCallback, useRef, useState } from "react";
import { uploadImage } from "../api";
import type { ImageItem } from "../types";

interface Props {
  onUploaded: (img: ImageItem) => void;
}

interface Pending {
  id: string;
  file: File;
  preview: string;
  progress: number;
  error?: string;
}

let seq = 0;

export default function UploadZone({ onUploaded }: Props) {
  const [items, setItems] = useState<Pending[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startUpload = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const id = `p${seq++}`;
      const preview = URL.createObjectURL(file);
      setItems((prev) => [...prev, { id, file, preview, progress: 0 }]);
      uploadImage(file, (pct) =>
        setItems((prev) => prev.map((p) => (p.id === id ? { ...p, progress: pct } : p))),
      )
        .then((img) => {
          onUploaded(img);
          setItems((prev) => prev.filter((p) => p.id !== id));
          URL.revokeObjectURL(preview);
        })
        .catch((err: Error) =>
          setItems((prev) =>
            prev.map((p) => (p.id === id ? { ...p, error: err.message } : p)),
          ),
        );
    },
    [onUploaded],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      Array.from(e.dataTransfer.files).forEach(startUpload);
    },
    [startUpload],
  );

  return (
    <section className="panel">
      <h2>Upload to MinIO</h2>
      <div
        className={`dropzone${dragging ? " dragging" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <p>Drag &amp; drop images here, or click to browse</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            Array.from(e.target.files ?? []).forEach(startUpload);
            e.target.value = "";
          }}
        />
      </div>
      {items.length > 0 && (
        <ul className="uploads">
          {items.map((p) => (
            <li key={p.id}>
              <img src={p.preview} alt={p.file.name} />
              <div className="upload-meta">
                <span className="name">{p.file.name}</span>
                {p.error ? (
                  <span className="error">{p.error}</span>
                ) : (
                  <div className="bar">
                    <div className="fill" style={{ width: `${p.progress}%` }} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
