"""
Authentication service.
Handles password hashing, JWT token creation/verification, and user management.
"""

import hashlib
import hmac
import secrets
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import jwt, JWTError
from sqlalchemy.orm import Session

from backend.config import SECRET_KEY, JWT_ALGORITHM, JWT_EXPIRY_MINUTES
from backend.models.user import User, UserRole

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-HMAC-SHA256 with a random salt."""
    salt = secrets.token_hex(16)
    pwd_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    )
    return f"{salt}${pwd_hash.hex()}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a stored hash."""
    try:
        salt, stored_hash = hashed_password.split("$", 1)
        pwd_hash = hashlib.pbkdf2_hmac(
            "sha256", plain_password.encode("utf-8"), salt.encode("utf-8"), 100_000
        )
        return hmac.compare_digest(pwd_hash.hex(), stored_hash)
    except (ValueError, AttributeError):
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a signed JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_EXPIRY_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT access token. Returns payload or None."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Authenticate a user by username and password. Returns User or None."""
    user = db.query(User).filter(User.username == username).first()
    if user and user.is_active and verify_password(password, user.hashed_password):
        logger.info(f"User '{username}' authenticated successfully.")
        return user
    logger.warning(f"Authentication failed for user '{username}'.")
    return None


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get a user by their ID."""
    return db.query(User).filter(User.id == user_id).first()


def create_user(db: Session, username: str, password: str,
                email: Optional[str] = None, full_name: Optional[str] = None,
                role: UserRole = UserRole.VIEWER) -> User:
    """Create a new user account."""
    user = User(
        username=username,
        hashed_password=hash_password(password),
        email=email,
        full_name=full_name,
        role=role,
        is_active=True,
        is_first_login=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info(f"Created user '{username}' with role '{role.value}'.")
    return user


def mark_first_login_complete(db: Session, user: User) -> None:
    """Mark that a user has completed their first login setup."""
    user.is_first_login = False
    db.commit()
