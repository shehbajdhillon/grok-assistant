"""WebSocket authentication for Clerk JWT tokens."""

import logging

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

        return {
            "clerk_id": clerk_id,
            "email": payload.get("email"),
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
