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


def require_pm(user=Depends(get_current_user)):
    """FastAPI dependency that requires ProjectManager role."""
    if user.role != UserRole.PROJECT_MANAGER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project Manager access required")
    return user


def require_pm_or_viewer(user=Depends(get_current_user)):
    """FastAPI dependency that requires ProjectManager or Viewer role."""
    if user.role not in [UserRole.PROJECT_MANAGER, UserRole.VIEWER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Project Manager or Viewer access required")
    return user


def require_admin_or_pm(user=Depends(get_current_user)):
    """FastAPI dependency that requires Admin or ProjectManager role."""
    if user.role not in [UserRole.ADMIN, UserRole.PROJECT_MANAGER]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or Project Manager access required")
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
    
    # Strictly prevent creating another Admin
    if request.role == UserRole.ADMIN.value or request.role == "Admin":
        raise HTTPException(status_code=400, detail="Registration of additional Admin accounts is forbidden.")
        
    existing = db.query(User).filter(User.username == request.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    try:
        role = UserRole(request.role)
    except ValueError:
        role = UserRole.VIEWER
        
    user = create_user(db, request.username, request.password, request.email, request.full_name, role)

    # Sync user with collaboration MongoDB server
    import urllib.request
    import json
    try:
        # Both ProjectManager and Viewer get User globalRole in collab server
        global_role = "User"
        url = "http://127.0.0.1:5000/api/auth/register"
        payload = {
            "name": request.full_name or request.username.capitalize(),
            "email": request.email or f"{request.username}@navalpmis.gov",
            "password": "password123",
            "globalRole": global_role,
            "role": role.value
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=3) as res:
            logger.info(f"Registered user '{request.username}' in collaboration server.")
    except Exception as e:
        logger.error(f"Failed to register user '{request.username}' in collab server: {e}")

    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name, role=user.role.value, is_first_login=user.is_first_login,
    )


@router.get("/users", response_model=list[UserResponse])
def get_users(admin=Depends(require_admin), db: Session = Depends(get_db)):
    """List all users (Admin only)."""
    from backend.models.user import User
    users = db.query(User).all()
    return [
        UserResponse(
            id=u.id, username=u.username, email=u.email,
            full_name=u.full_name, role=u.role.value, is_first_login=u.is_first_login,
        ) for u in users
    ]
