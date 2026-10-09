"""lumen API: upload images to MinIO, list/browse them back."""
from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from . import storage
from .config import settings

app = FastAPI(title="lumen API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MAX_UPLOAD_BYTES = 15 * 1024 * 1024


class ImageOut(BaseModel):
    object_name: str
    filename: str
    size: int
    content_type: str
    last_modified: str
    url: str


def _to_out(img: storage.StoredImage) -> ImageOut:
    return ImageOut(
        object_name=img.object_name,
        filename=img.filename,
        size=img.size,
        content_type=img.content_type,
        last_modified=img.last_modified,
        url=img.url,
    )


@app.on_event("startup")
def _startup() -> None:
    storage.store.ensure_bucket()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "bucket": settings.minio_bucket}


@app.post("/api/images", response_model=ImageOut, status_code=201)
async def upload_image(file: UploadFile = File(...)) -> ImageOut:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="only image uploads are accepted")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="file too large (max 15 MB)")
    if not data:
        raise HTTPException(status_code=400, detail="empty file")
    img = storage.store.upload(data, file.filename or "image", file.content_type)
    return _to_out(img)


@app.get("/api/images", response_model=list[ImageOut])
def list_images(q: str = Query(default="", description="filter by filename")) -> list[ImageOut]:
    return [_to_out(img) for img in storage.store.list(query=q)]
