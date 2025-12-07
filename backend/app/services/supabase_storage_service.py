"""Supabase Storage service for file uploads."""

import base64
import logging
import uuid
from pathlib import Path

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class SupabaseStorageService:
    """Service for uploading and managing files in Supabase Storage."""

    ALLOWED_EXTENSIONS = {".mp3", ".m4a", ".wav"}
    ALLOWED_MIME_TYPES = {"audio/mpeg", "audio/mp4", "audio/wav", "audio/x-m4a"}
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

    def __init__(self):
        self.base_url = f"{settings.SUPABASE_URL}/storage/v1"
        self.bucket = settings.SUPABASE_BUCKET_NAME

    @property
    def headers(self) -> dict[str, str]:
        """Get auth headers for Supabase API."""
        return {
            "apikey": settings.SUPABASE_SERVICE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_KEY}",
        }

    async def upload_voice_sample(
        self,
        user_id: str,
        assistant_id: str,
        file_data: bytes,
        filename: str,
        content_type: str,
    ) -> str:
        """
        Upload voice sample and return public URL.

        Args:
            user_id: ID of the user uploading the file
            assistant_id: ID of the assistant this voice belongs to
            file_data: Raw file bytes
            filename: Original filename
            content_type: MIME type of the file

        Returns:
            Public URL to the uploaded file

        Raises:
            ValueError: If file type or size is invalid
            httpx.HTTPError: If upload fails
        """
        # Validate file extension
        ext = Path(filename).suffix.lower()
        if ext not in self.ALLOWED_EXTENSIONS:
            raise ValueError(
                f"Invalid file type '{ext}'. Allowed: {', '.join(self.ALLOWED_EXTENSIONS)}"
            )

        # Validate file size
        if len(file_data) > self.MAX_FILE_SIZE:
            raise ValueError(
                f"File too large. Maximum size: {self.MAX_FILE_SIZE // 1024 // 1024}MB"
            )

        # Generate unique storage path
        file_id = uuid.uuid4().hex
        storage_path = f"{user_id}/{assistant_id}/{file_id}{ext}"

        logger.info(f"Uploading voice sample: {storage_path} ({len(file_data)} bytes)")

        # Upload to Supabase Storage
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/object/{self.bucket}/{storage_path}",
                headers={**self.headers, "Content-Type": content_type},
                content=file_data,
                timeout=60.0,
            )
            response.raise_for_status()

        # Return public URL
        public_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{self.bucket}/{storage_path}"
        logger.info(f"Voice sample uploaded: {public_url}")

        return public_url

    async def delete_voice_sample(self, file_url: str) -> bool:
        """
        Delete a voice sample by URL.

        Args:
            file_url: Full URL to the file in Supabase Storage

        Returns:
            True if deleted successfully, False otherwise
        """
        # Extract storage path from URL
        # URL format: {SUPABASE_URL}/storage/v1/object/public/{bucket}/{path}
        try:
            path = file_url.split(f"{self.bucket}/")[-1]
        except Exception:
            logger.error(f"Could not parse file URL: {file_url}")
            return False

        logger.info(f"Deleting voice sample: {path}")

        async with httpx.AsyncClient() as client:
            response = await client.delete(
                f"{self.base_url}/object/{self.bucket}/{path}",
                headers=self.headers,
                timeout=30.0,
            )

            if response.status_code == 200:
                logger.info(f"Voice sample deleted: {path}")
                return True
            else:
                logger.error(
                    f"Failed to delete voice sample: {response.status_code} - {response.text}"
                )
                return False

    async def get_file_as_base64(self, file_url: str) -> str:
        """
        Download file and return as base64 string for xAI API.

        Args:
            file_url: Full URL to the file

        Returns:
            Base64-encoded file content
        """
        logger.debug(f"Downloading voice sample: {file_url}")

        async with httpx.AsyncClient() as client:
            response = await client.get(file_url, timeout=30.0)
            response.raise_for_status()
            return base64.b64encode(response.content).decode()


# Singleton instance
supabase_storage_service = SupabaseStorageService()
