"""MinIO access layer (S3-compatible, via boto3).

All MinIO interaction lives here so the API routes stay thin.
Object names are prefixed with a uuid to avoid collisions; the original
filename is kept in the object's metadata and returned by the API.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import datetime, timezone

import boto3
from botocore.client import Config as BotoConfig

from .config import settings


@dataclass
class StoredImage:
    object_name: str
    filename: str
    size: int
    content_type: str
    last_modified: str
    url: str  # presigned GET url for the browser


class ImageStore:
    def __init__(
        self,
        endpoint: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        bucket: str | None = None,
        secure: bool | None = None,
        presigned_expiry: int | None = None,
        public_endpoint: str | None = None,
    ) -> None:
        self.bucket = bucket or settings.minio_bucket
        self.presigned_expiry = presigned_expiry or settings.presigned_expiry
        use_secure = secure if secure is not None else settings.minio_secure
        scheme = "https" if use_secure else "http"
        internal = endpoint or settings.minio_endpoint
        public = public_endpoint or settings.minio_public_endpoint or internal
        common = dict(
            aws_access_key_id=access_key or settings.minio_access_key,
            aws_secret_access_key=secret_key or settings.minio_secret_key,
            config=BotoConfig(signature_version="s3v4"),
            region_name="us-east-1",
        )
        self._client = boto3.client("s3", endpoint_url=f"{scheme}://{internal}", **common)
        # separate client just for signing browser-facing URLs (different host)
        self._public_client = boto3.client(
            "s3", endpoint_url=f"{scheme}://{public}", **common
        )

    # -- setup -----------------------------------------------------------
    def ensure_bucket(self) -> None:
        buckets = [b["Name"] for b in self._client.list_buckets().get("Buckets", [])]
        if self.bucket not in buckets:
            self._client.create_bucket(Bucket=self.bucket)

    # -- write -----------------------------------------------------------
    def upload(self, data: bytes, filename: str, content_type: str) -> StoredImage:
        safe_name = "".join(
            c for c in filename if c.isalnum() or c in ("-", "_", ".", " ")
        ).strip() or "image"
        object_name = f"{uuid.uuid4().hex}-{safe_name}"
        self._client.put_object(
            Bucket=self.bucket,
            Key=object_name,
            Body=data,
            ContentType=content_type,
            Metadata={"filename": safe_name},
        )
        return self._describe(object_name, len(data), content_type, safe_name)

    # -- read ------------------------------------------------------------
    def list(self, query: str = "") -> list[StoredImage]:
        paginator = self._client.get_paginator("list_objects_v2")
        images: list[StoredImage] = []
        q = query.strip().lower()
        for page in paginator.paginate(Bucket=self.bucket):
            for obj in page.get("Contents", []):
                head = self._client.head_object(Bucket=self.bucket, Key=obj["Key"])
                filename = head.get("Metadata", {}).get("filename", obj["Key"])
                content_type = head.get("ContentType", "")
                if q and q not in filename.lower() and q not in obj["Key"].lower():
                    continue
                images.append(
                    self._describe(
                        obj["Key"],
                        obj["Size"],
                        content_type,
                        filename,
                        obj["LastModified"],
                    )
                )
        # newest first
        images.sort(key=lambda i: i.last_modified, reverse=True)
        return images

    # -- helpers ---------------------------------------------------------
    def _presigned_url(self, object_name: str) -> str:
        return self._public_client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": object_name},
            ExpiresIn=self.presigned_expiry,
        )

    def _describe(
        self,
        object_name: str,
        size: int,
        content_type: str,
        filename: str,
        last_modified: datetime | None = None,
    ) -> StoredImage:
        lm = last_modified or datetime.now(timezone.utc)
        return StoredImage(
            object_name=object_name,
            filename=filename,
            size=size,
            content_type=content_type,
            last_modified=lm.isoformat(),
            url=self._presigned_url(object_name),
        )


# module-level store used by the API; tests can replace it
store = ImageStore()
