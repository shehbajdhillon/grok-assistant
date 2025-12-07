"""WebSocket authentication for Clerk JWT tokens."""

import logging

import httpx
import jwt
from jwt import PyJWKClient

from app.config import settings

logger = logging.getLogger(__name__)

# Clerk JWKS client for JWT verification (with caching)
_jwk_client: PyJWKClient | None = None


def get_jwk_client() -> PyJWKClient:
    """Get or create the JWKS client."""
    global _jwk_client
    if _jwk_client is None:
        _jwk_client = PyJWKClient(settings.clerk_jwks_url, cache_keys=True)
    return _jwk_client


async def _fetch_user_email(clerk_user_id: str) -> str:
    """
    Fetch user email from Clerk API.

    This is called when the email is not included in the JWT claims.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://api.clerk.com/v1/users/{clerk_user_id}",
            headers={"Authorization": f"Bearer {settings.CLERK_SECRET_KEY}"},
        )

        if response.status_code != 200:
            logger.error(f"Failed to fetch user from Clerk: {response.status_code}")
            raise ValueError("Could not verify user")

        user_data = response.json()

        # Get the primary email address
        email_addresses = user_data.get("email_addresses", [])
        primary_email_id = user_data.get("primary_email_address_id")

        for email_obj in email_addresses:
            if email_obj.get("id") == primary_email_id:
                return email_obj.get("email_address")

        # Fallback to first email if no primary set
        if email_addresses:
            return email_addresses[0].get("email_address")

        raise ValueError("User has no email address")


async def verify_websocket_token(token: str) -> dict:
    """
    Verify Clerk JWT for WebSocket connections.

    Unlike HTTP endpoints, WebSocket can't use Depends() for auth,
    so we need a standalone verification function.

    Args:
        token: JWT token string

    Returns:
        dict with clerk_id and email

    Raises:
        ValueError: If token is invalid, expired, or missing required claims
    """
    try:
        jwk_client = get_jwk_client()
        signing_key = jwk_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},
        )

        clerk_id = payload.get("sub")
        if not clerk_id:
            raise ValueError("Invalid token: missing user ID")

        # Try to get email from JWT claims first
        email = payload.get("email")

        # If email not in token, fetch from Clerk API
        if not email:
            email = await _fetch_user_email(clerk_id)

        return {
            "clerk_id": clerk_id,
            "email": email,
        }

    except jwt.ExpiredSignatureError:
        logger.warning("WebSocket token has expired")
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError as e:
        logger.warning(f"Invalid WebSocket token: {e}")
        raise ValueError("Invalid authentication token")
    except Exception as e:
        logger.error(f"WebSocket authentication error: {e}")
        raise ValueError("Authentication failed")
