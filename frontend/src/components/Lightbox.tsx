import { useEffect } from "react";
import type { ImageItem } from "../types";

interface Props {
  img: ImageItem;
  meta: string;
  onClose: () => void;
}

export default function Lightbox({ img, meta, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="lightbox" onClick={onClose}>
      <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
        <img src={img.url} alt={img.filename} />
        <div className="lightbox-meta">
          <strong>{img.filename}</strong>
          <span className="muted">{meta}</span>
        </div>
        <button className="close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
