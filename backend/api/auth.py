"""
Authentication API endpoints.
Handles login, token generation, and user profile retrieval.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.schemas.schemas import LoginRequest, TokenResponse, UserResponse, UserCreate
from backend.services.auth_service import (
    authenticate_user, create_access_token, decode_access_token,
    get_user_by_id, create_user, mark_first_login_complete,
)
from backend.models.user import UserRole

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """FastAPI dependency to extract and validate the current user from JWT."""
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_access_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    user = get_user_by_id(db, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_admin(user=Depends(get_current_user)):
    """FastAPI dependency that requires Admin role."""
    if user.role != UserRole.ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user and return JWT token."""
    user = authenticate_user(db, request.username, request.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            role=user.role.value,
            is_first_login=user.is_first_login,
        ),
    )


@router.get("/me", response_model=UserResponse)
def get_me(user=Depends(get_current_user)):
    """Get the current authenticated user's profile."""
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        role=user.role.value,
        is_first_login=user.is_first_login,
    )


@router.post("/first-login-complete")
def first_login_complete(user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark the first-login wizard as completed for the current user."""
    mark_first_login_complete(db, user)
    return {"message": "First login setup completed."}


@router.post("/register", response_model=UserResponse)
def register_user(request: UserCreate, admin=Depends(require_admin), db: Session = Depends(get_db)):
    """Create a new user (Admin only)."""
    from backend.models.user import User
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    try:
        role = UserRole(request.role)
    except ValueError:
        role = UserRole.VIEWER
    user = create_user(db, request.username, request.password, request.email, request.full_name, role)
    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name, role=user.role.value, is_first_login=user.is_first_login,
    )
