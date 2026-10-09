import { useState } from "react";
import "./App.css";
import UploadZone from "./components/UploadZone";
import Gallery from "./components/Gallery";

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="app">
      <header>
        <h1>lumen</h1>
        <p className="muted">MinIO-backed image gallery — upload once, browse anywhere.</p>
      </header>
      <main>
        <UploadZone onUploaded={() => setRefreshKey((k) => k + 1)} />
        <Gallery refreshKey={refreshKey} />
      </main>
      <footer className="muted">
        Images are stored in MinIO (S3-compatible) and served via presigned URLs.
      </footer>
    </div>
  );
}
