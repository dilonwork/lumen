# lumen

A minimal example of using [MinIO](https://min.io/) (S3-compatible object storage)
as the image backend for a web app: upload images through a FastAPI backend,
browse and search them in a React gallery.

```
┌──────────┐      ┌──────────┐      ┌──────────┐
│  React   │─────▶│ FastAPI  │─────▶│  MinIO   │
│ frontend │      │ backend  │      │  :9000   │
│  :8080   │◀─────│  :8000   │      │  :9001   │
└──────────┘      └──────────┘      └──────────┘
   upload/          presigned URLs    S3 API +
   gallery          for the browser   web console
```

## Quickstart

```bash
docker compose up --build
```

| What | Where |
|---|---|
| Gallery UI | http://localhost:8080 |
| API | http://localhost:8000 (`/api/health`) |
| MinIO console | http://localhost:9001 (minioadmin / minioadmin123) |
| MinIO S3 API | http://localhost:9000 |

Upload some images in the UI, then use the search box to filter by filename.
Every image is stored as an object in the `lumen-images` bucket and served to
the browser via a presigned URL (valid 1 hour).

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/health` | health check |
| `POST` | `/api/images` | upload an image (`multipart/form-data`, field `file`; images only, max 15 MB) |
| `GET` | `/api/images?q=` | list images, newest first; optional filename filter |

## Configuration

Backend (env vars, see `backend/app/config.py`):

| Variable | Default | Purpose |
|---|---|---|
| `MINIO_ENDPOINT` | `localhost:9000` | MinIO host:port as seen by the backend |
| `MINIO_PUBLIC_ENDPOINT` | _(same as above)_ | MinIO host:port as seen by the **browser** (for presigned URLs) |
| `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` | `minioadmin` / `minioadmin123` | credentials |
| `MINIO_BUCKET` | `lumen-images` | bucket name (auto-created on startup) |
| `MINIO_SECURE` | `false` | use https |
| `PRESIGNED_EXPIRY` | `3600` | presigned URL lifetime in seconds |

Frontend build arg: `VITE_API_URL` (default `http://localhost:8000`).

> Why two endpoints? Inside docker-compose the backend reaches MinIO at
> `minio:9000`, but the browser can't resolve that name — it needs
> `localhost:9000`. `MINIO_PUBLIC_ENDPOINT` exists exactly for this split.

## Local dev (without docker)

```bash
# terminal 1 — MinIO
docker run -p 9000:9000 -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin -e MINIO_ROOT_PASSWORD=minioadmin123 \
  minio/minio server /data --console-address ":9001"

# terminal 2 — backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# terminal 3 — frontend
cd frontend && npm install && npm run dev   # http://localhost:5173
```

## Notes

- Object names are `uuid-originalname` so re-uploads never collide; the original
  filename is kept in object metadata and used for search/display.
- This is a learning example: no auth, no persistence beyond the MinIO volume,
  no image processing. Natural next steps: thumbnails, delete, tags.
