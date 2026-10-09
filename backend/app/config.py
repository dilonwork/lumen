"""Configuration, driven by environment variables."""
from __future__ import annotations

import os


class Settings:
    minio_endpoint: str = os.environ.get("MINIO_ENDPOINT", "localhost:9000")
    minio_access_key: str = os.environ.get("MINIO_ACCESS_KEY", "minioadmin")
    minio_secret_key: str = os.environ.get("MINIO_SECRET_KEY", "minioadmin123")
    minio_bucket: str = os.environ.get("MINIO_BUCKET", "lumen-images")
    minio_secure: bool = os.environ.get("MINIO_SECURE", "false").lower() == "true"
    # host:port the *browser* uses to reach MinIO (for presigned URLs).
    # Empty = same as MINIO_ENDPOINT. In docker-compose this is localhost:9000.
    minio_public_endpoint: str = os.environ.get("MINIO_PUBLIC_ENDPOINT", "")
    # how long browser image URLs stay valid (seconds)
    presigned_expiry: int = int(os.environ.get("PRESIGNED_EXPIRY", "3600"))


settings = Settings()
