import type { ImageItem } from "./types";

const API_BASE =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function listImages(query = ""): Promise<ImageItem[]> {
  const url = new URL(`${API_BASE}/api/images`);
  if (query.trim()) url.searchParams.set("q", query.trim());
  const res = await fetch(url);
  if (!res.ok) throw new Error(`list failed: ${res.status}`);
  return res.json();
}

export function uploadImage(
  file: File,
  onProgress: (pct: number) => void,
): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}/api/images`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };
    xhr.onerror = () => reject(new Error("upload failed: network error"));
    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
